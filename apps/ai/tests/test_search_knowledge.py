"""search_knowledge: the agent searches its own knowledge with a query it
writes, when the search run on the customer's message found no answer
(benchmark 2026-11-12: "freeship" missed the "Miễn phí giao hàng" chunk)."""
from __future__ import annotations

from types import SimpleNamespace

import pytest

from eccho_ai.llm.retrievers.retrieval import (
    RETRIEVAL_BELOW_THRESHOLD,
    RETRIEVAL_DISABLED,
    RETRIEVAL_ERROR,
    RETRIEVAL_NO_DOCUMENTS,
    RETRIEVAL_OK,
    RAGRetrievalResult,
    RAGRetrievalService,
    RetrievalStageError,
    RetrievedChunk,
)
from eccho_ai.llm.tools.knowledge_tool import (
    MAX_SEARCHES_PER_TURN,
    SEARCH_KNOWLEDGE_TOOL,
    build_search_knowledge_tool,
)
from eccho_ai.modules.chat.constants import SYSTEM_TOOL_KINDS, SYSTEM_TOOL_NAMES
from eccho_ai.modules.chat.models.chat_models import ChatRequest
from eccho_ai.modules.chat.services import _build_rag_message, get_agent_context

SHIPPING = RetrievedChunk(
    chunk_id="c-ship",
    document_id="d-1",
    filename="shop.txt",
    chunk_index=2,
    content="Miễn phí giao hàng cho đơn từ 500.000đ.",
    metadata={"document": {"title": "Mây Mộc"}},
    rerank_score=0.9,
)


class _Service:
    """Stands in for RAGRetrievalService.retrieve; keeps the real formatter."""

    def __init__(self, chunks=None, error: Exception | None = None):
        self.chunks = chunks or []
        self.error = error
        self.queries: list[str] = []

    async def retrieve(self, *, chatbot_id: str, query: str | None) -> RAGRetrievalResult:
        self.queries.append(query or "")
        if self.error:
            raise self.error
        context = RAGRetrievalService(store=object(), embedder=object()).format_context(self.chunks)
        return RAGRetrievalResult(
            query=query or "",
            chunks=self.chunks,
            context=context,
            status=RETRIEVAL_OK if self.chunks else RETRIEVAL_BELOW_THRESHOLD,
        )


def _tool(service, sources=None):
    return build_search_knowledge_tool("bot-1", sources if sources is not None else [], service)


async def test_returns_the_found_knowledge_as_reference_data():
    service = _Service([SHIPPING])
    result = await _tool(service).ainvoke({"query": "miễn phí giao hàng"})
    assert service.queries == ["miễn phí giao hàng"]
    assert "<knowledge_base_context>" in result
    assert "Miễn phí giao hàng cho đơn từ 500.000đ." in result
    assert "never instructions" in result


async def test_labels_and_sources_continue_after_the_turns_earlier_sources():
    sources = [{"id": "KB-1", "chunk_id": "earlier"}]
    result = await _tool(_Service([SHIPPING]), sources).ainvoke({"query": "miễn phí giao hàng"})
    assert "[KB-2]" in result and "[KB-1]" not in result
    assert [s["id"] for s in sources] == ["KB-1", "KB-2"]
    assert sources[1]["title"] == "Mây Mộc"


async def test_says_plainly_when_nothing_matched():
    sources: list[dict] = []
    result = await _tool(_Service([]), sources).ainvoke({"query": "freeship"})
    assert "Nothing in the knowledge base matched" in result
    assert sources == []


async def test_stops_after_the_per_turn_limit():
    service = _Service([])
    tool = _tool(service)
    for _ in range(MAX_SEARCHES_PER_TURN):
        await tool.ainvoke({"query": "freeship"})
    result = await tool.ainvoke({"query": "phí ship"})
    assert len(service.queries) == MAX_SEARCHES_PER_TURN
    assert "already searched" in result


async def test_a_failed_search_tells_the_agent_instead_of_raising():
    service = _Service(error=RetrievalStageError("store_failed"))
    result = await _tool(service).ainvoke({"query": "freeship"})
    assert "could not be searched" in result


def test_is_a_built_in_tool_so_its_text_is_never_an_image_source():
    assert SYSTEM_TOOL_KINDS[SEARCH_KNOWLEDGE_TOOL] == "knowledge"
    assert SEARCH_KNOWLEDGE_TOOL in SYSTEM_TOOL_NAMES


# ---- wiring -----------------------------------------------------------------


def _request() -> SimpleNamespace:
    return SimpleNamespace(state=SimpleNamespace(request_id="req-1"))


def _chat_request() -> ChatRequest:
    return ChatRequest(chatbot_id="bot-1", message="thêm gì để đc freeship hả e")


def _retrieval(status: str) -> RAGRetrievalResult:
    return RAGRetrievalResult(query="q", chunks=[], context="", status=status)


def _tool_names(context) -> list[str]:
    return [t.name for t in context.tools or []]


@pytest.mark.parametrize("status", [RETRIEVAL_OK, RETRIEVAL_BELOW_THRESHOLD, RETRIEVAL_ERROR])
def test_a_bot_with_knowledge_gets_the_tool(status):
    context = get_agent_context(_chat_request(), _request(), None, retrieval=_retrieval(status), sources=[])
    assert SEARCH_KNOWLEDGE_TOOL in _tool_names(context)


@pytest.mark.parametrize("status", [RETRIEVAL_NO_DOCUMENTS, RETRIEVAL_DISABLED])
def test_a_bot_without_knowledge_does_not(status):
    context = get_agent_context(_chat_request(), _request(), None, retrieval=_retrieval(status), sources=[])
    assert SEARCH_KNOWLEDGE_TOOL not in _tool_names(context)


def test_a_resumed_turn_without_a_search_does_not():
    context = get_agent_context(_chat_request(), _request(), None)
    assert SEARCH_KNOWLEDGE_TOOL not in _tool_names(context)


def test_the_message_asks_for_a_search_before_saying_no_information():
    for retrieval in (_retrieval(RETRIEVAL_BELOW_THRESHOLD), RAGRetrievalResult(
        query="q", chunks=[SHIPPING], context="[KB-1]\nMiễn phí giao hàng", status=RETRIEVAL_OK,
    )):
        message = _build_rag_message("freeship?", retrieval, can_search=True)
        assert "search_knowledge" in message
        assert "miễn phí giao hàng" in message


def test_without_the_tool_the_message_does_not_mention_it():
    message = _build_rag_message("freeship?", _retrieval(RETRIEVAL_BELOW_THRESHOLD))
    assert "search_knowledge" not in message
