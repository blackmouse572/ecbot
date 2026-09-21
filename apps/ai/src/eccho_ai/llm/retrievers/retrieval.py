from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
import asyncio
import math
import re
from functools import lru_cache

from async_lru import alru_cache
from tenacity import retry

from eccho_ai.core.variables import AppVars
from eccho_ai.llm.retrievers.embeddings import get_embeddings_client
from eccho_ai.llm.retrievers.retry import _RETRY
from eccho_ai.llm.retrievers.text_processing import normalize_text
from eccho_ai.llm.retrievers.vector_store import PgVectorStore


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
    pairs = [(query, chunk.content) for chunk in chunks]
    scores = model.predict(pairs, batch_size=batch_size, show_progress_bar=False)

    normalized_scores: list[float] = []
    for score in scores:
        if hasattr(score, "item"):
            score = score.item()
        elif isinstance(score, (list, tuple)):
            score = score[0]
        normalized_scores.append(float(score))
    return normalized_scores


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


@dataclass
class RAGRetrievalResult:
    query: str
    chunks: list[RetrievedChunk]
    context: str

    @property
    def has_context(self) -> bool:
        return bool(self.context.strip())

    @property
    def source_attributions(self) -> list[dict[str, Any]]:
        sources: list[dict[str, Any]] = []
        for index, chunk in enumerate(self.chunks, start=1):
            document_metadata = chunk.metadata.get("document", {})
            chunk_metadata = chunk.metadata.get("chunk", {})
            source_url = document_metadata.get("source_url") or chunk_metadata.get("source")
            sources.append(
                {
                    "id": f"KB-{index}",
                    "document_id": chunk.document_id,
                    "filename": chunk.filename,
                    "chunk_index": chunk.chunk_index,
                    "source_url": source_url,
                    "score": chunk.rerank_score,
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
        if not AppVars.RAG_RETRIEVAL_ENABLED or not clean_query:
            return RAGRetrievalResult(query=clean_query, chunks=[], context="")

        document_count = await self.store.count_completed_documents(chatbot_id=chatbot_id)
        if document_count == 0:
            return RAGRetrievalResult(
                query=clean_query,
                chunks=[],
                context="",
            )

        query_embedding = await self._embed_query(clean_query)
        similarity_rows = await self.store.similarity_search_chunks(
            embedding=query_embedding,
            chatbot_id=chatbot_id,
            limit=AppVars.RAG_RETRIEVAL_CANDIDATE_LIMIT,
        )

        fts_rows = await self.store.full_text_search_chunks(
            query=clean_query,
            chatbot_id=chatbot_id,
            limit=AppVars.RAG_RETRIEVAL_CANDIDATE_LIMIT,
        )

        candidates = self._merge_candidates(
            similarity_rows=similarity_rows,
            fts_rows=fts_rows,
        )
        deduped_candidates = self._deduplicate_content(list(candidates.values()))
        ranked = await self._rerank(clean_query, deduped_candidates)
        selected = [
            chunk for chunk in ranked
            if chunk.rerank_score >= AppVars.RAG_RETRIEVAL_MIN_SCORE
        ][:AppVars.RAG_RETRIEVAL_TOP_K]

        return RAGRetrievalResult(
            query=clean_query,
            chunks=selected,
            context=self.format_context(selected),
        )

    def format_context(self, chunks: list[RetrievedChunk]) -> str:
        if not chunks:
            return ""

        parts: list[str] = []
        used_chars = 0
        max_chars = AppVars.RAG_RETRIEVAL_CONTEXT_MAX_CHARS

        for index, chunk in enumerate(chunks, start=1):
            document_metadata = chunk.metadata.get("document", {})
            chunk_metadata = chunk.metadata.get("chunk", {})
            source_url = document_metadata.get("source_url") or chunk_metadata.get("source")
            header = (
                f"[KB-{index}] source={chunk.filename}; "
                f"document_id={chunk.document_id}; "
                f"chunk={chunk.chunk_index}; score={chunk.rerank_score:.3f}"
            )
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
            for chunk in chunks:
                chunk.rerank_score = max(chunk.similarity_score, chunk.fts_score)
            return sorted(chunks, key=lambda chunk: chunk.rerank_score, reverse=True)

        raw_scores = await asyncio.to_thread(
            _score_with_cross_encoder,
            model_name=AppVars.RAG_RERANK_CROSS_ENCODER_MODEL,
            query=query,
            chunks=chunks,
            batch_size=AppVars.RAG_RERANK_BATCH_SIZE,
        )

        for chunk, raw_score in zip(chunks, raw_scores):
            chunk.rerank_score = _sigmoid(raw_score)
            chunk.metadata["cross_encoder"] = {
                "model": AppVars.RAG_RERANK_CROSS_ENCODER_MODEL,
                "raw_score": raw_score,
            }
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
