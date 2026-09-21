"""Chunking pipeline job.

Watches ``knowledge_base_items`` for rows in ``READY`` status and processes
them end-to-end:

1. Atomically marks all READY rows as PROCESSING.
2. Dispatches each row to a type-specific handler:
   - FILE  → download from S3, extract text (PDF / MD / TXT), chunk, embed.
   - TEXT  → use the existing ``content`` field directly, chunk, embed.
   - URL   → crawl with configurable depth, aggregate text, chunk, embed.
3. Persists :class:`KnowledgeItemChunks` rows (replacing any prior chunks for
   that item to avoid stale vectors).
4. Updates the parent item:
   - status → COMPLETED, processed_at → now
   - content (preview) → first ~500 chars  (FILE and URL only)
5. On error: status → FAILED, error_message set.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

from minio import Minio
from sqlmodel.ext.asyncio.session import AsyncSession

from eccho_ai.core.variables import AppVars
from eccho_ai.jobs.base import BaseJob
from eccho_ai.models.knowledge_items import KnowledgeItems, KnowledgeBaseItemStatus, KnowledgeBaseItemType
from eccho_ai.models.knowledge_item_chunks import KnowledgeItemChunks
from eccho_ai.llm.retrievers.pdf_reader import PdfReaderRepo, PdfReadResult
from eccho_ai.llm.retrievers.web_crawler import WebCrawlerRepo
from eccho_ai.core.postgres import PostgresRepo
from eccho_ai.llm.retrievers.embeddings import embed_chunks

logger = logging.getLogger(__name__)
MAX_ERROR_MESSAGE_LENGTH = 1024

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _chunk_text(text: str, size: int, overlap: int) -> list[str]:
    """Split *text* into overlapping character-level chunks."""
    if not text.strip():
        return []
    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = min(start + size, len(text))
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end >= len(text):
            break
        start += size - overlap
    return chunks


def _preview(text: str, max_chars: int = 500) -> str:
    """Return the first *max_chars* characters as a preview string."""
    if len(text) <= max_chars:
        return text
    return text[:max_chars].rstrip() + "…"


# ---------------------------------------------------------------------------
# S3 downloader (sync minio client wrapped in executor)
# ---------------------------------------------------------------------------

def _download_from_s3(bucket: str, key: str) -> bytes:
    """Download an object from MinIO / S3 synchronously (run in executor)."""
    client = Minio(
        endpoint=AppVars.MINIO_ENDPOINT,
        access_key=AppVars.MINIO_ACCESS_KEY,
        secret_key=AppVars.MINIO_SECRET_KEY,
        secure=AppVars.MINIO_SECURE,
    )
    response = client.get_object(bucket, key)
    try:
        return response.read()
    finally:
        response.close()
        response.release_conn()


async def _download_bytes(bucket: str, key: str) -> bytes:
    """Non-blocking wrapper around the sync MinIO download."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _download_from_s3, bucket, key)


# ---------------------------------------------------------------------------
# Chunking job
# ---------------------------------------------------------------------------

class ChunkingJob(BaseJob[KnowledgeItems]):
    """Processes READY knowledge items through the full chunking pipeline."""

    table = KnowledgeItems

    # Only pick up READY (non-deleted) items
    where_clauses = (
        (KnowledgeItems.status == KnowledgeBaseItemStatus.READY)
        & (KnowledgeItems.deleted_at.is_(None))
    )

    # Atomically transition to PROCESSING when fetched
    updated_values = {"status": KnowledgeBaseItemStatus.PROCESSING}

    # ── Lifecycle hooks ────────────────────────────────────────────────────

    async def before_execute(
        self,
        session: AsyncSession,
        repo: PostgresRepo[KnowledgeItems],
        records: list[KnowledgeItems],
    ) -> None:
        # Bulk status transition is already handled by updated_values in _fetch_records.
        # Nothing extra needed here.
        pass

    async def execute(
        self,
        session: AsyncSession,
        repo: PostgresRepo[KnowledgeItems],
        record: KnowledgeItems,
    ) -> None:
        item_type = record.type
        logger.info(
            f"ChunkingJob: processing item {record.id} (type={item_type.value})"
        )

        # ── 1. Extract text ────────────────────────────────────────────────

        if item_type == KnowledgeBaseItemType.TEXT:
            text, preview, page_chunks = await self._handle_text(record)
        elif item_type == KnowledgeBaseItemType.FILE:
            text, preview, page_chunks = await self._handle_file(record)
        elif item_type == KnowledgeBaseItemType.URL:
            text, preview, page_chunks = await self._handle_url(record)
        else:
            raise ValueError(f"Unsupported knowledge item type: {item_type}")

        if not text.strip():
            raise ValueError("No text could be extracted from the knowledge item.")

        # ── 2. Split into chunks ───────────────────────────────────────────

        # page_chunks is a list of (page_index | None, url | None, text) tuples
        all_chunk_texts: list[str] = []
        chunk_meta: list[tuple[int | None, str | None]] = []  # (page_index, url)

        for page_idx, url, chunk_text in page_chunks:
            sub_chunks = _chunk_text(chunk_text, AppVars.CHUNK_SIZE, AppVars.CHUNK_OVERLAP)
            for sub in sub_chunks:
                all_chunk_texts.append(sub)
                chunk_meta.append((page_idx, url))

        if not all_chunk_texts:
            raise ValueError("Text produced zero chunks — content may be empty or whitespace-only.")

        # ── 3. Embed all chunks ────────────────────────────────────────────

        embeddings = await embed_chunks(all_chunk_texts)

        # ── 4. Purge stale chunks & persist new ones ───────────────────────

        await repo.with_session_delete_by_clauses(
            session,
            KnowledgeItemChunks,
            KnowledgeItemChunks.knowledge_base_item_id == record.id,
        )

        chunks: list[KnowledgeItemChunks] = []
        for idx, (chunk_text, embedding, (page_idx, url)) in enumerate(
            zip(all_chunk_texts, embeddings, chunk_meta)
        ):
            chunks.append(
                KnowledgeItemChunks(
                    knowledge_base_item_id=record.id,
                    content=chunk_text,
                    embedding=embedding,
                    chunk_index=idx,
                    page_index=page_idx,
                    url=url,
                )
            )

        await repo.with_session_add_all(session, chunks)

        # ── 5. Store preview and signal success (done in after_execute) ────

        # Attach derived fields to the record so after_execute can persist them
        record._preview_text = preview  # type: ignore[attr-defined]

    async def after_execute(
        self,
        session: AsyncSession,
        repo: PostgresRepo[KnowledgeItems],
        record: KnowledgeItems,
    ) -> None:
        item = await repo.with_session_get_by_id(session, KnowledgeItems, str(record.id))
        if item is None:
            return

        item.status = KnowledgeBaseItemStatus.COMPLETED
        item.processed_at = datetime.now(tz=timezone.utc)
        item.error_message = None

        # Update preview content for FILE and URL items
        if record.type in (KnowledgeBaseItemType.FILE, KnowledgeBaseItemType.URL):
            preview = getattr(record, "_preview_text", None)
            if preview:
                item.content = preview

        await session.flush()

    async def on_error(
        self,
        session: AsyncSession,
        repo: PostgresRepo[KnowledgeItems],
        record: KnowledgeItems,
        error: Exception,
    ) -> None:
        logger.error(
            f"ChunkingJob: item {record.id} failed — {error}",
            exc_info=True,
        )
        item = await repo.with_session_get_by_id(session, KnowledgeItems, str(record.id))
        if item is None:
            return

        item.status = KnowledgeBaseItemStatus.FAILED
        item.error_message = str(error)[:MAX_ERROR_MESSAGE_LENGTH]

        await session.flush()

    # ── Type-specific extractors ───────────────────────────────────────────

    async def _handle_text(
        self,
        record: KnowledgeItems,
    ) -> tuple[str, str, list[tuple[int | None, str | None, str]]]:
        """Handle TEXT items — use ``content`` field directly."""
        text = record.content or ""
        # No preview update for TEXT items (content IS the text)
        return text, text, [(None, None, text)]

    async def _handle_file(
        self,
        record: KnowledgeItems,
    ) -> tuple[str, str, list[tuple[int | None, str | None, str]]]:
        """Handle FILE items — download from S3 and extract text."""
        bucket = record.attachment_bucket
        key = record.attachment_key
        mime = (record.attachment_mime or "").lower()

        if not bucket or not key:
            raise ValueError("FILE item has no attachment data (bucket/key missing).")

        data = await _download_bytes(bucket, key)

        if "pdf" in mime or key.lower().endswith(".pdf"):
            result: PdfReadResult = PdfReaderRepo().read_bytes(data)
            page_chunks = [
                (p.page_index, None, p.text)
                for p in result.pages
                if p.text.strip()
            ]
            text = result.full_text
            preview = result.preview_text
        elif mime in ("text/markdown", "text/plain") or key.lower().endswith((".md", ".txt")):
            text = data.decode("utf-8", errors="replace")
            preview = _preview(text)
            page_chunks = [(None, None, text)]
        else:
            # Fallback: treat as plain text
            text = data.decode("utf-8", errors="replace")
            preview = _preview(text)
            page_chunks = [(None, None, text)]

        return text, preview, page_chunks

    async def _handle_url(
        self,
        record: KnowledgeItems,
    ) -> tuple[str, str, list[tuple[int | None, str | None, str]]]:
        """Handle URL items — crawl and aggregate text from all pages."""
        meta = record.metadata_ or {}
        seed_url: str = meta.get("url", "")
        processing_method = str(meta.get("processingMethod", "CRAWL")).strip().upper()
        if processing_method in {"SINGLE_PAGE", "SINGLE", "PAGE_ONLY"}:
            crawl_depth = 0
        else:
            crawl_depth = int(meta.get("crawlDepth", 1))
        crawl_depth = max(0, min(crawl_depth, AppVars.CRAWL_MAX_DEPTH))

        if not seed_url:
            raise ValueError("URL item has no 'url' in metadata.")

        crawler = WebCrawlerRepo(same_domain_only=AppVars.CRAWL_SAME_DOMAIN_ONLY)
        result = await crawler.crawl(seed_url, depth=crawl_depth)

        if not result.pages:
            raise ValueError(f"No pages could be crawled from '{seed_url}'.")

        page_chunks = [
            (None, page.url, page.text)
            for page in result.pages
            if page.text.strip()
        ]
        text = result.full_text
        preview = result.preview_text

        return text, preview, page_chunks
