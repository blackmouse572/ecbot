"""Which image URLs the agent may send: only ones in its own knowledge.

A URL counts as known when it appears in the operator instructions or in a
knowledge-base chunk linked to the chatbot. Anything else — a hallucinated or
injected link — is never sent to the customer.
"""
from __future__ import annotations

from typing import Any

from eccho_ai.core.app_logger import get_logger
from eccho_ai.llm.retrievers.vector_store import get_pool

logger = get_logger(__name__)


async def _chunk_contains(chatbot_id: str, text: str) -> bool:
    pool = await get_pool()
    async with pool.acquire() as conn:
        return bool(await conn.fetchval(
            """
            SELECT EXISTS (
                SELECT 1
                FROM rag_document_chunks c
                JOIN rag_documents d ON d.id = c.document_id
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
