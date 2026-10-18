from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
import asyncio
import hashlib
import math
import re
from functools import lru_cache

from async_lru import alru_cache
from tenacity import retry

from eccho_ai.core.app_logger import get_logger
from eccho_ai.core.variables import AppVars
from eccho_ai.llm.retrievers.embeddings import get_embeddings_client
from eccho_ai.llm.retrievers.retry import _RETRY
from eccho_ai.llm.retrievers.text_processing import normalize_text
from eccho_ai.llm.retrievers.vector_store import PgVectorStore
from eccho_ai.utils.rag_utils import public_source_url, source_title


logger = get_logger(__name__)


@alru_cache(
    maxsize=AppVars.EMBEDDING_CACHE_MAXSIZE,
    ttl=AppVars.EMBEDDING_CACHE_TTL_SECONDS,
)
@retry(**_RETRY)
async def _embed_query_cached(embedder, query: str) -> list[float]:
    """Embed one already-normalized query, memoized across requests.

    `retry` sits INSIDE the cache so failures are never cached. Concurrent
    callers with the same query share one in-flight task. The returned vector is
    shared — callers must treat it as read-only.
    """
    return await embedder.aembed_query(query)


@lru_cache(maxsize=2)
def _load_cross_encoder(model_name: str):
    from sentence_transformers import CrossEncoder

    return CrossEncoder(model_name)


def _score_with_cross_encoder(
    *,
    model_name: str,
    query: str,
    chunks: list["RetrievedChunk"],
    batch_size: int,
) -> list[float]:
    model = _load_cross_encoder(model_name)
    pairs = [(query, _rerank_text(chunk)) for chunk in chunks]
    scores = model.predict(pairs, batch_size=batch_size, show_progress_bar=False)

    normalized_scores: list[float] = []
    for score in scores:
        if hasattr(score, "item"):
            score = score.item()
        elif isinstance(score, (list, tuple)):
            score = score[0]
        normalized_scores.append(float(score))
    return normalized_scores


def _rerank_text(chunk: "RetrievedChunk") -> str:
    """Include the source label so title-only matches survive reranking."""
    source = (chunk.metadata.get("chunk", {}).get("source") or "").strip()
    return f"{source}\n{chunk.content}" if source else chunk.content


def _sigmoid(value: float) -> float:
    if value >= 0:
        z = math.exp(-value)
        return 1 / (1 + z)
    z = math.exp(value)
    return z / (1 + z)


@dataclass
class RetrievedChunk:
    chunk_id: str
    document_id: str
    filename: str
    chunk_index: int
    content: str
    similarity_score: float = 0.0
    fts_score: float = 0.0
    rerank_score: float = 0.0
    sources: set[str] = field(default_factory=set)
    metadata: dict[str, Any] = field(default_factory=dict)


# Why a turn got the knowledge it got (#205), for operators and evals:
# "ok" (chunks passed the threshold), "no_documents" (none attached),
# "below_threshold" (candidates, none good enough), "error" (retrieval
# raised), "disabled" (RAG off), "no_query" (nothing to search for, e.g. an
# image-only message).
RETRIEVAL_OK = "ok"
RETRIEVAL_NO_DOCUMENTS = "no_documents"
RETRIEVAL_BELOW_THRESHOLD = "below_threshold"
RETRIEVAL_ERROR = "error"
RETRIEVAL_DISABLED = "disabled"
RETRIEVAL_NO_QUERY = "no_query"


class RetrievalStageError(Exception):
    """A retrieval failure tagged with the stage that failed. Its `code` goes
    on `message-metadata`; the driver or HTTP text stays in the logs, since
    workspace owners can read the metadata in the preview."""

    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


def stable_chunk_id(chunk: RetrievedChunk) -> str:
    """Same chunk, same id across re-ingests (#205): the row id changes every
    time `replace_chunks` reinserts. Knowledge item + chunk index + content
    hash; the row id for a document ingested without a knowledge item."""
    item_id = (chunk.metadata.get("document") or {}).get("knowledge_item_id")
    if not item_id:
        return chunk.chunk_id
    digest = hashlib.sha256(chunk.content.encode("utf-8")).hexdigest()[:12]
    return f"{item_id}:{chunk.chunk_index}:{digest}"


def score_kind() -> str:
    """What `rerank_score` holds: the cross-encoder sigmoid ("rerank") or
    max(similarity, fts) ("hybrid"). The two scales are not comparable."""
    return "rerank" if AppVars.RAG_RERANK_ENABLED else "hybrid"


@dataclass
class RetrievedMedia:
    """A Media item the agent may send with `send_media`."""

    id: str
    title: str
    description: str
    mime_type: str


@dataclass
class RAGRetrievalResult:
    query: str
    chunks: list[RetrievedChunk]
    context: str
    status: str = RETRIEVAL_OK
    reason: str | None = None
    # Best candidate score, also when nothing passed RAG_RETRIEVAL_MIN_SCORE:
    # what to compare against when tuning the threshold.
    top_score: float | None = None
    # Sendable media, nearest first. Searched apart from the chunks, so it
    # never takes one of their places.
    media: list[RetrievedMedia] = field(default_factory=list)

    @property
    def summary(self) -> dict[str, Any]:
        """The `retrieval` object on `message-metadata`."""
        summary: dict[str, Any] = {"status": self.status}
        if self.reason:
            summary["reason"] = self.reason
        if self.top_score is not None:
            summary["top_score"] = self.top_score
            summary["score_kind"] = score_kind()
        return summary

    @property
    def has_context(self) -> bool:
        return bool(self.context.strip())

    @property
    def source_attributions(self) -> list[dict[str, Any]]:
        sources: list[dict[str, Any]] = []
        for index, chunk in enumerate(self.chunks, start=1):
            source_url = public_source_url(chunk)
            sources.append(
                {
                    # Positional per reply: the label the model cites.
                    "id": f"KB-{index}",
                    # Stable across runs and re-ingests: compare sources by this one.
                    "chunk_id": stable_chunk_id(chunk),
                    "document_id": chunk.document_id,
                    "filename": chunk.filename,
                    "title": source_title(chunk),
                    "chunk_index": chunk.chunk_index,
                    "source_url": source_url,
                    "score": chunk.rerank_score,
                    "score_kind": score_kind(),
                }
            )
        return sources


class RAGRetrievalService:
    def __init__(self, store=None, embedder=None):
        self.embedding_dimension = AppVars.RAG_EMBEDDING_DIMENSION
        self.embedding_model = AppVars.RAG_EMBEDDING_MODEL
        self.store = store or PgVectorStore(embedding_dimension=self.embedding_dimension)
        self._embedder = embedder  # lazy: falls back to the shared client on first use

    async def retrieve(self, *, chatbot_id: str, query: str | None) -> RAGRetrievalResult:
        clean_query = normalize_text(query or "")
        if not AppVars.RAG_RETRIEVAL_ENABLED:
            return RAGRetrievalResult(query=clean_query, chunks=[], context="", status=RETRIEVAL_DISABLED)
        if not clean_query:
            return RAGRetrievalResult(query=clean_query, chunks=[], context="", status=RETRIEVAL_NO_QUERY)

        try:
            document_count = await self.store.count_completed_documents(chatbot_id=chatbot_id)
            # Only a bot without text knowledge pays for this check: an
            # image-only library still needs the query embedded.
            has_media = document_count > 0 or await self.store.has_media(chatbot_id=chatbot_id)
        except Exception as exc:
            raise RetrievalStageError("store_failed") from exc
        if not has_media:
            return RAGRetrievalResult(
                query=clean_query,
                chunks=[],
                context="",
                status=RETRIEVAL_NO_DOCUMENTS,
            )

        try:
            query_embedding = await self._embed_query(clean_query)
        except Exception as exc:
            raise RetrievalStageError("embedding_failed") from exc
        media_search = asyncio.ensure_future(self._search_media(query_embedding, chatbot_id))
        if document_count == 0:
            return RAGRetrievalResult(
                query=clean_query,
                chunks=[],
                context="",
                status=RETRIEVAL_NO_DOCUMENTS,
                media=await media_search,
            )
        try:
            similarity_rows, fts_rows = await asyncio.gather(
                self.store.similarity_search_chunks(
                    embedding=query_embedding,
                    chatbot_id=chatbot_id,
                    limit=AppVars.RAG_RETRIEVAL_CANDIDATE_LIMIT,
                ),
                self.store.full_text_search_chunks(
                    query=clean_query,
                    chatbot_id=chatbot_id,
                    limit=AppVars.RAG_RETRIEVAL_CANDIDATE_LIMIT,
                ),
            )
        except Exception as exc:
            media_search.cancel()
            raise RetrievalStageError("store_failed") from exc

        candidates = self._merge_candidates(
            similarity_rows=similarity_rows,
            fts_rows=fts_rows,
        )
        deduped_candidates = self._deduplicate_content(list(candidates.values()))
        try:
            ranked = await self._rerank(clean_query, deduped_candidates)
        except Exception as exc:
            raise RetrievalStageError("rerank_failed") from exc
        selected = [
            chunk for chunk in ranked
            if chunk.rerank_score >= AppVars.RAG_RETRIEVAL_MIN_SCORE
        ][:AppVars.RAG_RETRIEVAL_TOP_K]

        return RAGRetrievalResult(
            query=clean_query,
            chunks=selected,
            context=self.format_context(selected),
            status=RETRIEVAL_OK if selected else RETRIEVAL_BELOW_THRESHOLD,
            top_score=ranked[0].rerank_score if ranked else None,
            media=await media_search,
        )

    async def _search_media(self, embedding: list[float], chatbot_id: str) -> list[RetrievedMedia]:
        """No relevance cutoff: query and description similarity barely tells
        a menu from a dish photo, so the agent picks from the nearest few."""
        try:
            rows = await self.store.search_media(
                embedding=embedding, chatbot_id=chatbot_id, limit=AppVars.RAG_MEDIA_LIMIT
            )
        except Exception as exc:  # noqa: BLE001 (the turn goes on without media)
            logger.warning("media_search_failed", error=str(exc), chatbot_id=chatbot_id)
            return []
        return [
            RetrievedMedia(
                id=str(row["knowledge_item_id"]),
                title=row["title"],
                description=row.get("description") or "",
                mime_type=row["mime_type"],
            )
            for row in rows
        ]

    def format_context(self, chunks: list[RetrievedChunk]) -> str:
        if not chunks:
            return ""

        parts: list[str] = []
        used_chars = 0
        max_chars = AppVars.RAG_RETRIEVAL_CONTEXT_MAX_CHARS

        for index, chunk in enumerate(chunks, start=1):
            source_url = public_source_url(chunk)
            # Only the label (and a public page URL) — storage filenames and ids
            # are internal and must not end up quoted to the customer.
            header = f"[KB-{index}]"
            if source_url:
                header += f"; url={source_url}"
            block = f"{header}\n{chunk.content.strip()}"
            remaining = max_chars - used_chars
            if remaining <= 0:
                break
            if len(block) > remaining:
                block = block[:remaining].rstrip()
            parts.append(block)
            used_chars += len(block) + 2

        return "\n\n".join(parts)

    async def _embed_query(self, query: str) -> list[float]:
        return await _embed_query_cached(
            self._embedder or get_embeddings_client(), query
        )

    def _merge_candidates(
        self,
        *,
        similarity_rows: list[dict[str, Any]],
        fts_rows: list[dict[str, Any]],
    ) -> dict[str, RetrievedChunk]:
        candidates: dict[str, RetrievedChunk] = {}

        for row in similarity_rows:
            chunk = self._candidate_from_row(row)
            distance = float(row.get("distance") or 1.0)
            chunk.similarity_score = max(0.0, 1.0 - distance)
            chunk.sources.add("similarity")
            candidates[chunk.chunk_id] = chunk

        for row in fts_rows:
            chunk_id = str(row["chunk_id"])
            chunk = candidates.get(chunk_id) or self._candidate_from_row(row)
            chunk.fts_score = max(chunk.fts_score, float(row.get("fts_rank") or 0.0))
            chunk.sources.add("full_text")
            candidates[chunk_id] = chunk

        return candidates

    @staticmethod
    def _candidate_from_row(row: dict[str, Any]) -> RetrievedChunk:
        return RetrievedChunk(
            chunk_id=str(row["chunk_id"]),
            document_id=str(row["document_id"]),
            filename=row["filename"],
            chunk_index=row["chunk_index"],
            content=row["content"],
            metadata={
                "chunk": row.get("chunk_metadata") or {},
                "document": row.get("document_metadata") or {},
            },
        )

    async def _rerank(self, query: str, chunks: list[RetrievedChunk]) -> list[RetrievedChunk]:
        if not chunks:
            return []

        # Cross-encoder rerank is heavy (loads sentence-transformers/torch on first
        # use). When disabled, fall back to the hybrid similarity/FTS score so the
        # service stays light enough for small instances. See RAG_RERANK_ENABLED.
        if not AppVars.RAG_RERANK_ENABLED:
            return self._hybrid_rank(chunks)

        try:
            raw_scores = await asyncio.to_thread(
                _score_with_cross_encoder,
                model_name=AppVars.RAG_RERANK_CROSS_ENCODER_MODEL,
                query=query,
                chunks=chunks,
                batch_size=AppVars.RAG_RERANK_BATCH_SIZE,
            )
        except Exception as exc:  # noqa: BLE001 (un-reranked results beat none)
            # e.g. the model download returns 403: answer from the hybrid
            # ranking rather than dropping every result.
            logger.warning(
                "rerank_failed",
                error=str(exc),
                model=AppVars.RAG_RERANK_CROSS_ENCODER_MODEL,
            )
            return self._hybrid_rank(chunks)

        for chunk, raw_score in zip(chunks, raw_scores):
            chunk.rerank_score = _sigmoid(raw_score)
            chunk.metadata["cross_encoder"] = {
                "model": AppVars.RAG_RERANK_CROSS_ENCODER_MODEL,
                "raw_score": raw_score,
            }
        return sorted(chunks, key=lambda chunk: chunk.rerank_score, reverse=True)

    @staticmethod
    def _hybrid_rank(chunks: list[RetrievedChunk]) -> list[RetrievedChunk]:
        for chunk in chunks:
            chunk.rerank_score = max(chunk.similarity_score, chunk.fts_score)
        return sorted(chunks, key=lambda chunk: chunk.rerank_score, reverse=True)

    @staticmethod
    def _deduplicate_content(chunks: list[RetrievedChunk]) -> list[RetrievedChunk]:
        seen: set[str] = set()
        deduped: list[RetrievedChunk] = []
        for chunk in chunks:
            fingerprint = re.sub(r"\s+", " ", chunk.content).strip()[:500]
            if fingerprint in seen:
                continue
            seen.add(fingerprint)
            deduped.append(chunk)
        return deduped
