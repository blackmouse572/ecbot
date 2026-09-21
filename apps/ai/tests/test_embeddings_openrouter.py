"""Embeddings route through OpenRouter, not Google."""
from __future__ import annotations

from pydantic import SecretStr

from eccho_ai.core.variables import AppVars


def _client(monkeypatch, factory):
    monkeypatch.setattr(
        "eccho_ai.core.variables.AppVars.OPENROUTER_API_KEY", SecretStr("sk-or-test")
    )
    factory.cache_clear()
    try:
        return factory()
    finally:
        factory.cache_clear()


def test_rag_client_targets_openrouter(monkeypatch):
    from eccho_ai.llm.retrievers.embeddings import get_embeddings_client

    client = _client(monkeypatch, get_embeddings_client)

    assert client.model == AppVars.RAG_EMBEDDING_MODEL == "google/gemini-embedding-001"
    assert AppVars.OPENROUTER_BASE_URL in str(client.client._client.base_url)
    assert client.dimensions == AppVars.RAG_EMBEDDING_DIMENSION
    # Without this, LangChain tiktoken-encodes the input and posts token ids,
    # which the model behind OpenRouter rejects.
    assert client.check_embedding_ctx_length is False
    assert client.model_kwargs["encoding_format"] == "float"


def test_client_is_hashable(monkeypatch):
    """retrieval._embed_query_cached keys its alru_cache on the embedder instance,
    and a plain pydantic model is unhashable -- which broke every RAG query."""
    from eccho_ai.llm.retrievers.embeddings import get_embeddings_client

    client = _client(monkeypatch, get_embeddings_client)

    assert {client: "vector"}[client] == "vector"
    assert client == client and client is not object()


def test_chunking_client_uses_job_embedding_config(monkeypatch):
    from eccho_ai.llm.retrievers.embeddings import get_chunking_embeddings_client

    client = _client(monkeypatch, get_chunking_embeddings_client)

    assert client.model == AppVars.EMBEDDING_MODEL
    assert client.dimensions == AppVars.EMBEDDING_DIMENSIONS
    assert client.chunk_size == AppVars.EMBEDDING_BATCH_SIZE


async def test_embed_chunks_rejects_wrong_width(monkeypatch):
    import pytest

    from eccho_ai.llm.retrievers import embeddings

    class _Stub:
        async def aembed_documents(self, texts):
            return [[0.0] * (AppVars.EMBEDDING_DIMENSIONS + 1) for _ in texts]

    monkeypatch.setattr(embeddings, "get_chunking_embeddings_client", lambda: _Stub())

    assert await embeddings.embed_chunks([]) == []
    with pytest.raises(ValueError, match="Embedding dimension mismatch"):
        await embeddings.embed_chunks(["a chunk"])
