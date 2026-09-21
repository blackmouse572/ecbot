"""RAG embeddings provider.

One home for the embedding-model choice, shared by RAG retrieval, RAG ingest and
the chunking job. Cached — one client per config per process.

Embeddings go through OpenRouter's OpenAI-compatible `/embeddings` endpoint, the
same gateway and the same `OPENROUTER_API_KEY` as every chat model here — so
model ids are full OpenRouter ids (e.g. "google/gemini-embedding-001").
"""
from __future__ import annotations

from functools import lru_cache
from typing import TYPE_CHECKING

from eccho_ai.core.variables import AppVars

if TYPE_CHECKING:
    from langchain_openai import OpenAIEmbeddings


@lru_cache(maxsize=1)
def _client_class() -> type:
    """`OpenAIEmbeddings`, made hashable by identity.

    The RAG query cache (`retrieval._embed_query_cached`) keys on the embedder
    instance, and a plain pydantic model is unhashable. Identity is the right key
    here: each config has exactly one client, built once by the factories below.
    """
    from langchain_openai import OpenAIEmbeddings

    class _IdentityHashedEmbeddings(OpenAIEmbeddings):
        def __hash__(self) -> int:
            return id(self)

        def __eq__(self, other: object) -> bool:
            return self is other

    return _IdentityHashedEmbeddings


def _build_client(*, model: str, dimensions: int) -> "OpenAIEmbeddings":
    return _client_class()(
        model=model,
        base_url=AppVars.OPENROUTER_BASE_URL,
        api_key=AppVars.OPENROUTER_API_KEY.get_secret_value(),
        dimensions=dimensions,
        chunk_size=AppVars.EMBEDDING_BATCH_SIZE,  # texts per request in embed_documents
        timeout=AppVars.EMBEDDING_TIMEOUT_SECONDS,
        # OpenRouter is not OpenAI: the default path tiktoken-encodes the input and
        # posts token ids, which the upstream model rejects. Send raw text, and ask
        # for plain floats rather than the SDK's default base64 round-trip.
        check_embedding_ctx_length=False,
        model_kwargs={"encoding_format": "float"},
    )


@lru_cache(maxsize=1)
def get_embeddings_client() -> "OpenAIEmbeddings":
    """Client for RAG ingest + retrieval (the `rag_*` pgvector tables)."""
    return _build_client(
        model=AppVars.RAG_EMBEDDING_MODEL,
        dimensions=AppVars.RAG_EMBEDDING_DIMENSION,
    )


@lru_cache(maxsize=1)
def get_chunking_embeddings_client() -> "OpenAIEmbeddings":
    """Client for the chunking job (`knowledge_item_chunks.embedding`)."""
    return _build_client(
        model=AppVars.EMBEDDING_MODEL,
        dimensions=AppVars.EMBEDDING_DIMENSIONS,
    )


async def embed_chunks(texts: list[str]) -> list[list[float]]:
    """Embed knowledge-item chunks for the chunking job.

    Batching and the per-request timeout live on the client. `dimensions` is sent
    with the request, so the length check guards against a provider ignoring it —
    a wrong-width vector would otherwise fail much later, at pgvector insert.
    """
    if not texts:
        return []

    vectors = await get_chunking_embeddings_client().aembed_documents(texts)
    expected = AppVars.EMBEDDING_DIMENSIONS
    for vector in vectors:
        if len(vector) != expected:
            raise ValueError(
                f"Embedding dimension mismatch: expected {expected}, got {len(vector)}"
            )
    return vectors
