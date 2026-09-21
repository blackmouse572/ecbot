"""The store/embedder seam: retrieval runs against an injected fake — no pgvector."""
from __future__ import annotations


async def test_retrieval_uses_injected_store_without_db():
    from eccho_ai.llm.retrievers.retrieval import RAGRetrievalService

    class _FakeStore:
        async def count_completed_documents(self, *, chatbot_id):
            return 0  # no documents -> retrieve short-circuits before embedding/DB

    svc = RAGRetrievalService(store=_FakeStore())
    result = await svc.retrieve(chatbot_id="cb-1", query="hello there")

    assert result.chunks == []
    assert result.context == ""


async def test_retrieval_embeds_via_injected_embedder():
    from eccho_ai.llm.retrievers.retrieval import RAGRetrievalService

    seen = {"embedded": None}

    class _FakeStore:
        async def count_completed_documents(self, *, chatbot_id):
            return 3

        async def similarity_search_chunks(self, **kw):
            seen["embedded"] = kw.get("embedding")
            return []

        async def full_text_search_chunks(self, **kw):
            return []

    class _FakeEmbedder:
        async def aembed_query(self, query):
            return [0.1, 0.2, 0.3]

    svc = RAGRetrievalService(store=_FakeStore(), embedder=_FakeEmbedder())
    result = await svc.retrieve(chatbot_id="cb-1", query="find me")

    assert seen["embedded"] == [0.1, 0.2, 0.3]  # injected embedder was used, no Google call
    assert result.chunks == []


async def test_repeated_query_is_embedded_once():
    """#318: the same normalized query must not be re-embedded."""
    from eccho_ai.llm.retrievers.retrieval import RAGRetrievalService, _embed_query_cached

    calls = {"n": 0}

    class _FakeStore:
        async def count_completed_documents(self, *, chatbot_id):
            return 3

        async def similarity_search_chunks(self, **kw):
            return []

        async def full_text_search_chunks(self, **kw):
            return []

    class _FakeEmbedder:
        async def aembed_query(self, query):
            calls["n"] += 1
            return [0.1, 0.2, 0.3]

    _embed_query_cached.cache_clear()
    svc = RAGRetrievalService(store=_FakeStore(), embedder=_FakeEmbedder())
    await svc.retrieve(chatbot_id="cb-1", query="same question")
    await svc.retrieve(chatbot_id="cb-2", query="same question")  # different chatbot, same text

    assert calls["n"] == 1


async def test_embed_cache_does_not_cache_failures():
    """A failed embed must not be cached — the next call has to try again."""
    import pytest

    from eccho_ai.llm.retrievers.retrieval import _embed_query_cached

    calls = {"n": 0}

    class _FlakyEmbedder:
        async def aembed_query(self, query):
            calls["n"] += 1
            if calls["n"] == 1:
                raise RuntimeError("embed down")
            return [1.0]

    _embed_query_cached.cache_clear()
    embedder = _FlakyEmbedder()
    with pytest.raises(RuntimeError):
        await _embed_query_cached(embedder, "q")
    assert await _embed_query_cached(embedder, "q") == [1.0]
    assert calls["n"] == 2
