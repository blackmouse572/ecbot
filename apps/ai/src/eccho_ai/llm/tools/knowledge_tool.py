"""`search_knowledge`: the agent searches its own knowledge with a query it
writes.

The turn's first search runs on the customer's newest message before the
model starts (modules/chat/services.get_rag_retrieval). Slang ("freeship") or
a short follow-up ("size L nhé") can miss there, so the agent may search
again in the shop's own words. Built per request: it knows the chatbot, counts
its searches, and adds what it finds to the turn's sources.
"""
from __future__ import annotations

from typing import Any, Protocol

from langchain_core.tools import StructuredTool

from eccho_ai.core.app_logger import get_logger
from eccho_ai.llm.retrievers.retrieval import RAGRetrievalResult, format_context
from eccho_ai.llm.tools.constants import (
    KNOWLEDGE_NOT_FOUND,
    KNOWLEDGE_SEARCH_FAILED,
    KNOWLEDGE_SEARCH_LIMIT,
    KNOWLEDGE_SEARCH_RESULT,
)

logger = get_logger(__name__)

SEARCH_KNOWLEDGE_TOOL = "search_knowledge"
# Enough for one rewrite and one retry; a confused model cannot loop.
MAX_SEARCHES_PER_TURN = 2

DESCRIPTION = (
    "Search the shop's knowledge base (products, prices, sizes, stock, shipping, "
    "promotions, policies). Use it when the knowledge-base context you were given "
    "does not answer the customer, before you say you do not have the information "
    "or hand the chat to staff. Write `query` the way the shop's own text would: "
    "the full product name, colour and size from earlier in the chat, and standard "
    "words instead of slang (\"miễn phí giao hàng\" for \"freeship\", \"bảng size\" "
    f"for \"sz\"). At most {MAX_SEARCHES_PER_TURN} searches per reply."
)


class _Retriever(Protocol):
    async def retrieve(self, *, chatbot_id: str, query: str | None) -> RAGRetrievalResult: ...


def build_search_knowledge_tool(
    chatbot_id: str,
    sources: list[dict[str, Any]],
    retriever: _Retriever,
) -> StructuredTool:
    """The tool for one turn. `sources` is the turn's source list (the first
    search's, mutated in place): found chunks are appended, numbered after it."""
    searches = 0

    async def search_knowledge(query: str) -> str:
        nonlocal searches
        if searches >= MAX_SEARCHES_PER_TURN:
            return KNOWLEDGE_SEARCH_LIMIT.format(limit=MAX_SEARCHES_PER_TURN)
        searches += 1
        try:
            result = await retriever.retrieve(chatbot_id=chatbot_id, query=query)
        except Exception as exc:  # noqa: BLE001 (the turn goes on without it)
            logger.warning("search_knowledge_failed", error=str(exc), chatbot_id=chatbot_id)
            return KNOWLEDGE_SEARCH_FAILED
        logger.info(
            "search_knowledge",
            chatbot_id=chatbot_id,
            status=result.status,
            found=len(result.chunks),
        )
        if not result.chunks:
            return KNOWLEDGE_NOT_FOUND.format(query=query)
        start = len(sources) + 1
        for offset, source in enumerate(result.source_attributions):
            sources.append({**source, "id": f"KB-{start + offset}"})
        return KNOWLEDGE_SEARCH_RESULT.format(
            query=query, context=format_context(result.chunks, start=start)
        )

    return StructuredTool.from_function(
        coroutine=search_knowledge,
        name=SEARCH_KNOWLEDGE_TOOL,
        description=DESCRIPTION,
    )
