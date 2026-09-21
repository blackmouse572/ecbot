"""Single shared agent + per-request chatbot resolution.

Replaces the per-chatbot AgentCache: one agent graph is compiled once and
customized per request by ChatbotConfigMiddleware from the chatbot carried on
the runtime context. `get_agent` fetches the chatbot (same per-request DB cost
the old version-checked cache already paid) and returns it alongside the shared
agent so callers can still read config (guardrails, metadata).
"""
from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from typing import Any
from uuid import UUID

from async_lru import alru_cache

from fastapi import HTTPException
from sqlalchemy.orm import joinedload
from sqlmodel import select

from eccho_ai.core.app_logger import get_logger
from eccho_ai.core.postgres import PostgresRepo
from eccho_ai.core.variables import AppVars
from eccho_ai.llm.agents.middleware import ChatbotConfigMiddleware
from eccho_ai.llm.tools.system_tools import SYSTEM_TOOLS
from eccho_ai.models.chat import Chatbots, ChatbotSkills, ChatbotTools
from eccho_ai.modules.chat.models.agent_models import AgentRequestContext

logger = get_logger(__name__)


@dataclass
class AgentContext:
    """The shared agent paired with the request's source chatbot config."""
    agent: Any
    chatbot: "Chatbots"


async def _query_chatbot(chatbot_id: str) -> Chatbots | None:
    """Load a chatbot with its tools + skills eager-loaded (needed to build operator/skill tools)."""
    db = PostgresRepo[Chatbots].get_instance()
    stmt = (
        select(Chatbots)
        # asyncpg needs a UUID, not a str, for the native uuid PK column
        # (same coercion as system_tools._read_customer_metadata).
        .where(Chatbots.id == UUID(chatbot_id))
        .options(
            joinedload(Chatbots.chatbot_tools).joinedload(ChatbotTools.tool),  # type: ignore[sqlalchemy]
            joinedload(Chatbots.chatbot_skills).joinedload(ChatbotSkills.skill),  # type: ignore[sqlalchemy]
        )
    )
    async with db.session_factory() as session:
        execution = await session.exec(stmt)
        return execution.unique().first()


@alru_cache(maxsize=256, ttl=AppVars.CHATBOT_CACHE_TTL_SECONDS)
async def _fetch_chatbot_cached(chatbot_id: str) -> Chatbots | None:
    return await _query_chatbot(chatbot_id)


async def _fetch_chatbot(chatbot_id: str) -> Chatbots | None:
    """Read the chatbot config, cached across requests.

    The row is fully eager-loaded, so the detached instance is safe to reuse —
    but it is SHARED, so nothing on the request path may mutate it. apps/api
    invalidates explicitly when config, tools or skills change; the TTL is only
    a backstop for a missed invalidation. Set CHATBOT_CACHE_TTL_SECONDS=0 to
    bypass entirely.
    """
    if AppVars.CHATBOT_CACHE_TTL_SECONDS <= 0:
        return await _query_chatbot(chatbot_id)
    chatbot = await _fetch_chatbot_cached(chatbot_id)
    if chatbot is None:
        # Never cache a miss: a chatbot created seconds ago must not 404 for a
        # whole TTL window.
        _fetch_chatbot_cached.cache_invalidate(chatbot_id)
    return chatbot


def invalidate_chatbot(chatbot_id: str) -> bool:
    """Drop one cached chatbot. Returns False when nothing was cached."""
    return _fetch_chatbot_cached.cache_invalidate(chatbot_id)


@lru_cache(maxsize=1)
def get_shared_agent() -> Any:
    """Compile the one agent graph. Its model/tools/prompt are always overridden
    per request by ChatbotConfigMiddleware, so the placeholder model is never
    actually invoked."""
    from langchain.agents import create_agent
    from langchain_openai import ChatOpenAI

    from eccho_ai.core.variables import AppVars

    placeholder = ChatOpenAI(
        model="placeholder",
        api_key=AppVars.OPENROUTER_API_KEY,
        base_url=AppVars.OPENROUTER_BASE_URL,
    )
    return create_agent(
        model=placeholder,
        tools=SYSTEM_TOOLS,
        middleware=[ChatbotConfigMiddleware()],
        context_schema=AgentRequestContext,
    )


async def get_agent(chatbot_id: str) -> AgentContext:
    """Return AgentContext(shared agent, chatbot). Raises 404 if not found."""
    chatbot = await _fetch_chatbot(chatbot_id)
    if chatbot is None:
        raise HTTPException(status_code=404, detail=f"Chatbot with id {chatbot_id} not found")
    logger.info("agent_resolved", chatbot_id=chatbot_id)
    return AgentContext(agent=get_shared_agent(), chatbot=chatbot)
