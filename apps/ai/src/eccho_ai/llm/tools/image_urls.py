"""Which image URLs the agent may send: only ones in its own knowledge.

A URL counts as known when it appears in the operator instructions, in a
knowledge-base chunk linked to the chatbot, or in what one of the operator's
own tools (HTTP, MCP, skill) returned this turn. Anything else, a hallucinated
or injected link, is never sent to the customer.
"""
from __future__ import annotations

from typing import Any

from eccho_ai.core.app_logger import get_logger
from eccho_ai.llm.retrievers.vector_store import get_pool
from eccho_ai.modules.chat.constants import SYSTEM_TOOL_NAMES

logger = get_logger(__name__)


async def _chunk_contains(chatbot_id: str, text: str) -> bool:
    pool = await get_pool()
    async with pool.acquire() as conn:
        return bool(await conn.fetchval(
            """
            SELECT EXISTS (
                SELECT 1
                FROM rag.rag_document_chunks c
                JOIN rag.rag_documents d ON d.id = c.document_id
                WHERE d.status = 'COMPLETED'
                    AND (d.metadata->'chatbot_ids' ? $1 OR d.metadata->>'chatbot_id' = $1)
                    AND strpos(c.content, $2) > 0
            )
            """,
            chatbot_id,
            text,
        ))


async def is_known_image_url(chatbot: Any, url: str) -> bool:
    if chatbot is None or not url.startswith(("https://", "http://")):
        return False
    if url in (chatbot.general_knowledge or ""):
        return True
    try:
        return await _chunk_contains(str(chatbot.id), url)
    except Exception as exc:
        logger.warning("image_url_lookup_failed", error=str(exc))
        return False


def from_operator_tool(tool_name: str | None) -> bool:
    """Whether a tool result can vouch for an image URL: operator tools only.
    Built-in tools echo the customer (customer fields) or the model itself."""
    return bool(tool_name) and tool_name not in SYSTEM_TOOL_NAMES


def in_tool_results(url: str, results: list[str]) -> bool:
    return url.startswith(("https://", "http://")) and any(url in r for r in results)
