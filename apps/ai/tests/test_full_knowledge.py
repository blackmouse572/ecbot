"""Small knowledge goes to the agent in full (benchmark 2026-11-12, step 2):
when everything a chatbot knows fits the budget, every turn gets all of it,
so slang, follow-ups and facts from earlier turns can no longer miss."""
from __future__ import annotations

import pytest

from eccho_ai.core.variables import AppVars
from eccho_ai.llm.retrievers.retrieval import (
    RETRIEVAL_FULL,
    RAGRetrievalResult,
    RAGRetrievalService,
    _embed_query_cached,
)
from eccho_ai.llm.tools.knowledge_tool import SEARCH_KNOWLEDGE_TOOL
from eccho_ai.modules.chat.models.chat_models import ChatRequest
from eccho_ai.modules.chat.services import (
    _build_rag_message,
    can_search_again,
    get_agent_context,
)


def _row(index: int, content: str) -> dict:
    return {
        "chunk_id": f"c-{index}",
        "document_id": "doc-1",
        "filename": "123-shop.txt",
        "chunk_index": index,
        "content": content,
        "document_metadata": {"title": "Mây Mộc", "knowledge_item_id": "item-1"},
    }


SHOP = [
    _row(0, "MM03 Quần ống rộng vải đũi, 329.000đ, màu be, đen."),
    _row(1, "Bảng size: S 43-48kg, M 48-54kg, L 54-60kg."),
    _row(2, "Miễn phí giao hàng cho đơn từ 500.000đ."),
]


class _Store:
    def __init__(self, small: list[dict] | None):
        self.small = small
        self.limits: list[int] = []
        self.searched = False

    async def count_completed_documents(self, *, chatbot_id):
        return 1

    async def has_media(self, *, chatbot_id):
        return False

    async def search_media(self, **_kw):
        return []

    async def small_knowledge_chunks(self, *, chatbot_id, max_chars):
        self.limits.append(max_chars)
        return self.small

    async def similarity_search_chunks(self, **_kw):
        self.searched = True
        return []

    async def full_text_search_chunks(self, **_kw):
        self.searched = True
        return []


class _Embedder:
    async def aembed_query(self, query):
        return [0.1, 0.2]


@pytest.fixture(autouse=True)
def _settings(monkeypatch):
    monkeypatch.setattr(AppVars, "RAG_RERANK_ENABLED", False)
    monkeypatch.setattr(AppVars, "RAG_RETRIEVAL_ENABLED", True)
    monkeypatch.setattr(AppVars, "RAG_FULL_KNOWLEDGE_MAX_CHARS", 6000)
    _embed_query_cached.cache_clear()


async def _retrieve(store: _Store, query: str = "thêm gì để đc freeship hả e") -> RAGRetrievalResult:
    return await RAGRetrievalService(store=store, embedder=_Embedder()).retrieve(
        chatbot_id="bot-1", query=query
    )


async def test_small_knowledge_is_sent_whole_whatever_the_customer_wrote():
    store = _Store(SHOP)
    result = await _retrieve(store)

    assert result.status == RETRIEVAL_FULL
    assert store.limits == [6000]
    assert not store.searched
    for row in SHOP:
        assert row["content"] in result.context
    assert [s["id"] for s in result.source_attributions] == ["KB-1", "KB-2", "KB-3"]
    assert result.summary == {"status": RETRIEVAL_FULL}


async def test_larger_knowledge_is_searched_as_before():
    store = _Store(None)
    result = await _retrieve(store)

    assert result.status != RETRIEVAL_FULL
    assert store.searched


async def test_a_zero_budget_turns_it_off(monkeypatch):
    monkeypatch.setattr(AppVars, "RAG_FULL_KNOWLEDGE_MAX_CHARS", 0)
    store = _Store(SHOP)
    result = await _retrieve(store)

    assert store.limits == []
    assert result.status != RETRIEVAL_FULL


async def test_full_knowledge_is_not_cut_at_the_search_context_budget(monkeypatch):
    monkeypatch.setattr(AppVars, "RAG_RETRIEVAL_CONTEXT_MAX_CHARS", 40)
    result = await _retrieve(_Store(SHOP))

    assert SHOP[2]["content"] in result.context


async def test_with_everything_in_hand_there_is_nothing_to_search_again():
    result = await _retrieve(_Store(SHOP))
    assert not can_search_again(result)

    message = _build_rag_message("freeship?", result, can_search=can_search_again(result))
    assert "search_knowledge" not in message
    assert "Miễn phí giao hàng" in message

    context = get_agent_context(
        ChatRequest(chatbot_id="bot-1", message="freeship?"),
        type("R", (), {"state": type("S", (), {"request_id": "r"})()})(),
        None,
        retrieval=result,
        sources=[],
    )
    assert SEARCH_KNOWLEDGE_TOOL not in [t.name for t in context.tools or []]
