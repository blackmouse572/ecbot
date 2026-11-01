"""Which image URLs the agent may send: only ones in its own knowledge.

A URL counts as known when it appears in the operator instructions, in a
knowledge-base chunk linked to the chatbot, or in a successful result one of
the operator's own tools (HTTP, MCP, skill) returned this turn. Operator tool
output is trusted as the operator's data; built-in tools and failed results are
not. Any other link, such as one the model invents, is never sent.
"""
from __future__ import annotations

import json
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


def successful_result(message: Any) -> str | None:
    """A tool result's text, or None when the tool failed: its error text can
    echo the model's arguments or the customer's words."""
    if getattr(message, "status", None) == "error":
        return None
    text = str(getattr(message, "content", message))
    try:
        data = json.loads(text)
    except ValueError:
        return text
    if isinstance(data, dict) and data.get("status") in ("error", "timeout"):
        return None
    return text
