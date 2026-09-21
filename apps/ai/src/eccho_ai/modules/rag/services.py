from __future__ import annotations

from pathlib import Path
from uuid import UUID, uuid4
from urllib.parse import urlparse
from typing import Any
import asyncio
import hashlib
import json
import os
import re

from fastapi import UploadFile
from langchain_core.documents import Document
from tenacity import retry

from eccho_ai.core.variables import AppVars
from eccho_ai.llm.retrievers.embeddings import get_embeddings_client
from eccho_ai.llm.retrievers.retry import _RETRY, _retryable  # noqa: F401 (re-exported for tests)
from eccho_ai.modules.rag.models import RAGDocumentResponse, RAGIngestResponse
from eccho_ai.llm.retrievers.text_processing import load_document, normalize_text
from eccho_ai.llm.retrievers.vector_store import PgVectorStore


class RAGIngestService:
    def __init__(self, store=None, embedder=None):
        self.embedding_dimension = AppVars.RAG_EMBEDDING_DIMENSION
        self.embedding_model = AppVars.RAG_EMBEDDING_MODEL
        self.store = store or PgVectorStore(embedding_dimension=self.embedding_dimension)
        self._embedder = embedder  # lazy: falls back to the shared client on first use

    async def ingest_upload(
        self,
        *,
        file: UploadFile,
        knowledge_item_id: str,
        chatbot_ids: list[str] | None = None,
        chunk_size: int | None = None,
        chunk_overlap: int | None = None,
        metadata: dict | None = None,
    ) -> RAGIngestResponse:
        chunk_size = chunk_size or AppVars.RAG_CHUNK_SIZE
        chunk_overlap = chunk_overlap if chunk_overlap is not None else AppVars.RAG_CHUNK_OVERLAP
        self._validate_chunking(chunk_size, chunk_overlap)

        document_id = uuid4()
        upload_path = await self._save_upload(file, document_id=document_id)

        document = await asyncio.to_thread(
            load_document,
            upload_path,
            source_filename=file.filename or upload_path.name,
            mime_type=file.content_type,
        )
        if not document.page_content:
            raise ValueError("No extractable text found in uploaded document")

        await self.store.delete_by_knowledge_item(knowledge_item_id)  # idempotent upsert

        merged_metadata = {
            **(metadata or {}),
            "knowledge_item_id": knowledge_item_id,
            "chatbot_ids": chatbot_ids or [],
        }
        chunk_count = await self._ingest_document(
            document_id=document_id,
            document=document,
            source_filename=file.filename or upload_path.name,
            stored_path=str(upload_path),
            mime_type=file.content_type,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            metadata=merged_metadata,
        )

        return RAGIngestResponse(
            document_id=document_id,
            filename=file.filename or upload_path.name,
            stored_path=str(upload_path),
            mime_type=file.content_type,
            content_chars=len(document.page_content),
            chunk_count=chunk_count,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            embedding_model=self.embedding_model,
            embedding_dimension=self.embedding_dimension,
        )

    async def ingest_url(
        self,
        *,
        url: str,
        knowledge_item_id: str,
        chatbot_ids: list[str] | None = None,
        chunk_size: int | None = None,
        chunk_overlap: int | None = None,
        metadata: dict | None = None,
        only_main_content: bool = True,
        max_age: int | None = 172800000,
        parsers: list[str] | None = None,
    ) -> RAGIngestResponse:
        api_key = AppVars.FIRECRAWL_API_KEY.get_secret_value()
        if not api_key:
            raise ValueError("FIRECRAWL_API_KEY is not configured")

        chunk_size = chunk_size or AppVars.RAG_CHUNK_SIZE
        chunk_overlap = chunk_overlap if chunk_overlap is not None else AppVars.RAG_CHUNK_OVERLAP
        self._validate_chunking(chunk_size, chunk_overlap)

        normalized_url = self._normalize_url(url)
        firecrawl_document = await asyncio.to_thread(
            self._scrape_url,
            api_key=api_key,
            url=normalized_url,
            only_main_content=only_main_content,
            max_age=max_age,
            parsers=parsers or ["pdf"],
        )
        text = normalize_text(self._extract_firecrawl_text(firecrawl_document))
        if not text:
            raise ValueError("No extractable text found in scraped URL")

        document_id = uuid4()
        source_filename = self._url_source_filename(normalized_url)
        stored_path = self._save_text_document(
            text,
            document_id=document_id,
            filename=source_filename,
        )
        scrape_metadata = self._firecrawl_metadata(firecrawl_document)
        merged_metadata = {
            **(metadata or {}),
            "knowledge_item_id": knowledge_item_id,
            "chatbot_ids": chatbot_ids or [],
            "source_type": "url",
            "source_url": normalized_url,
            "firecrawl": scrape_metadata,
        }
        document = Document(
            page_content=text,
            metadata={
                "source": normalized_url,
                "local_path": str(stored_path),
                "mime_type": "text/markdown",
                "extension": ".md",
                "source_type": "url",
                "title": scrape_metadata.get("title"),
            },
        )

        await self.store.delete_by_knowledge_item(knowledge_item_id)  # idempotent upsert
        chunk_count = await self._ingest_document(
            document_id=document_id,
            document=document,
            source_filename=source_filename,
            stored_path=str(stored_path),
            mime_type="text/markdown",
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            metadata=merged_metadata,
        )

        return RAGIngestResponse(
            document_id=document_id,
            filename=source_filename,
            stored_path=str(stored_path),
            mime_type="text/markdown",
            content_chars=len(text),
            chunk_count=chunk_count,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            embedding_model=self.embedding_model,
            embedding_dimension=self.embedding_dimension,
        )

    async def ingest_text(
        self,
        *,
        knowledge_item_id: str,
        text: str,
        title: str,
        chatbot_ids: list[str] | None = None,
        knowledge_base_id: str | None = None,
        chunk_size: int | None = None,
        chunk_overlap: int | None = None,
    ) -> RAGIngestResponse:
        chunk_size = chunk_size or AppVars.RAG_CHUNK_SIZE
        chunk_overlap = chunk_overlap if chunk_overlap is not None else AppVars.RAG_CHUNK_OVERLAP
        self._validate_chunking(chunk_size, chunk_overlap)

        clean = normalize_text(text)
        if not clean:
            raise ValueError("No extractable text found in text item")

        document_id = uuid4()
        source_filename = f"{self._safe_filename(title)}.txt"
        stored_path = self._save_text_document(clean, document_id=document_id, filename=source_filename)

        await self.store.delete_by_knowledge_item(knowledge_item_id)
        document = Document(
            page_content=clean,
            metadata={"source": title, "local_path": str(stored_path),
                      "mime_type": "text/plain", "extension": ".txt", "source_type": "text"},
        )
        merged_metadata = {
            "knowledge_item_id": knowledge_item_id,
            "chatbot_ids": chatbot_ids or [],
            "knowledge_base_id": knowledge_base_id,
            "source_type": "text",
        }
        chunk_count = await self._ingest_document(
            document_id=document_id, document=document, source_filename=source_filename,
            stored_path=str(stored_path), mime_type="text/plain",
            chunk_size=chunk_size, chunk_overlap=chunk_overlap, metadata=merged_metadata,
        )
        return RAGIngestResponse(
            document_id=document_id, filename=source_filename, stored_path=str(stored_path),
            mime_type="text/plain", content_chars=len(clean), chunk_count=chunk_count,
            chunk_size=chunk_size, chunk_overlap=chunk_overlap,
            embedding_model=self.embedding_model, embedding_dimension=self.embedding_dimension,
        )

    async def list_documents(self, *, limit: int = 20) -> list[RAGDocumentResponse]:
        rows = await self.store.list_documents(limit=limit)
        return [RAGDocumentResponse.model_validate(row) for row in rows]

    @retry(**_RETRY)
    async def _embed_documents(self, texts: list[str]) -> list[list[float]]:
        return await (self._embedder or get_embeddings_client()).aembed_documents(texts)

    async def _ingest_document(
        self,
        *,
        document_id: UUID,
        document: Document,
        source_filename: str,
        stored_path: str,
        mime_type: str | None,
        chunk_size: int,
        chunk_overlap: int,
        metadata: dict[str, Any],
    ) -> int:
        content_hash = hashlib.sha256(document.page_content.encode("utf-8")).hexdigest()
        await self.store.create_document(
            document_id=document_id,
            source_filename=source_filename,
            local_path=stored_path,
            mime_type=mime_type,
            content_hash=content_hash,
            content_chars=len(document.page_content),
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            embedding_model=self.embedding_model,
            metadata=metadata,
        )

        try:
            from langchain_text_splitters import RecursiveCharacterTextSplitter

            splitter = RecursiveCharacterTextSplitter(
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
                separators=["\n\n", "\n", ". ", " ", ""],
            )
            chunks = splitter.split_documents([document])
            chunk_texts = [chunk.page_content for chunk in chunks if chunk.page_content.strip()]
            chunk_metadatas = [
                {**chunk.metadata, "chunk_index": index}
                for index, chunk in enumerate(chunks)
                if chunk.page_content.strip()
            ]
            if not chunk_texts:
                raise ValueError("No chunks generated from document")

            embeddings = await self._embed_documents(chunk_texts)
            self._validate_embeddings(embeddings, expected_count=len(chunk_texts))
            await self.store.replace_chunks(
                document_id=document_id,
                chunks=chunk_texts,
                embeddings=embeddings,
                metadatas=chunk_metadatas,
            )
        except Exception as exc:
            await self.store.mark_failed(document_id=document_id, error_message=str(exc))
            raise

        return len(chunk_texts)

    async def _save_upload(self, file: UploadFile, *, document_id: UUID) -> Path:
        upload_dir = Path(AppVars.RAG_LOCAL_STORAGE_DIR)
        if not upload_dir.is_absolute():
            upload_dir = Path(os.getcwd()) / upload_dir
        upload_dir.mkdir(parents=True, exist_ok=True)

        filename = self._safe_filename(file.filename or "document")
        path = upload_dir / f"{document_id}-{filename}"
        data = await file.read()
        path.write_bytes(data)
        return path

    def _save_text_document(self, text: str, *, document_id: UUID, filename: str) -> Path:
        upload_dir = Path(AppVars.RAG_LOCAL_STORAGE_DIR)
        if not upload_dir.is_absolute():
            upload_dir = Path(os.getcwd()) / upload_dir
        upload_dir.mkdir(parents=True, exist_ok=True)

        path = upload_dir / f"{document_id}-{self._safe_filename(filename)}"
        path.write_text(text, encoding="utf-8")
        return path

    @staticmethod
    @retry(**_RETRY)
    def _scrape_url(
        *,
        api_key: str,
        url: str,
        only_main_content: bool,
        max_age: int | None,
        parsers: list[str],
    ):
        from firecrawl import Firecrawl

        app = Firecrawl(api_key=api_key)
        return app.scrape(
            url,
            only_main_content=only_main_content,
            max_age=max_age,
            parsers=parsers,
            formats=["markdown"],
        )

    @staticmethod
    def _extract_firecrawl_text(document: Any) -> str:
        if hasattr(document, "model_dump"):
            data = document.model_dump(mode="json", exclude_none=True)
        elif isinstance(document, dict):
            data = document
        else:
            data = {}

        for field in ("markdown", "summary", "html", "raw_html"):
            value = data.get(field) if data else getattr(document, field, None)
            if isinstance(value, str) and value.strip():
                return value

        json_value = data.get("json") if data else None
        if json_value:
            return json.dumps(json_value, ensure_ascii=False)
        return ""

    @staticmethod
    def _firecrawl_metadata(document: Any) -> dict[str, Any]:
        metadata = getattr(document, "metadata", None)
        if metadata is None:
            return {}
        if hasattr(metadata, "model_dump"):
            return metadata.model_dump(mode="json", exclude_none=True)
        if isinstance(metadata, dict):
            return metadata
        return dict(metadata)

    @staticmethod
    def _normalize_url(url: str) -> str:
        clean_url = (url or "").strip()
        if not clean_url:
            raise ValueError("url is required")
        if not re.match(r"^https?://", clean_url, flags=re.IGNORECASE):
            clean_url = f"https://{clean_url}"

        parsed = urlparse(clean_url)
        if not parsed.netloc:
            raise ValueError("url must include a valid host")
        return clean_url

    @classmethod
    def _url_source_filename(cls, url: str) -> str:
        parsed = urlparse(url)
        slug_source = f"{parsed.netloc}{parsed.path}".strip("/")
        slug = cls._safe_filename(slug_source.replace("/", "-"))
        return f"{slug or 'webpage'}.md"

    @staticmethod
    def _safe_filename(filename: str) -> str:
        name = Path(filename).name.strip() or "document"
        name = re.sub(r"[^A-Za-z0-9._-]+", "-", name)
        return name.strip(".-") or "document"

    @staticmethod
    def _validate_chunking(chunk_size: int, chunk_overlap: int) -> None:
        if chunk_size < 100:
            raise ValueError("chunk_size must be at least 100")
        if chunk_overlap < 0:
            raise ValueError("chunk_overlap must be greater than or equal to 0")
        if chunk_overlap >= chunk_size:
            raise ValueError("chunk_overlap must be smaller than chunk_size")

    def _validate_embeddings(self, embeddings: list[list[float]], *, expected_count: int) -> None:
        if len(embeddings) != expected_count:
            raise ValueError(f"Embedding count mismatch: expected {expected_count}, got {len(embeddings)}")

        for index, embedding in enumerate(embeddings):
            if len(embedding) != self.embedding_dimension:
                raise ValueError(
                    f"Embedding dimension mismatch at chunk {index}: "
                    f"expected {self.embedding_dimension}, got {len(embedding)}"
                )
