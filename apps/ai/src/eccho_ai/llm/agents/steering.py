"""Steer a running turn with the customer's newer messages.

A customer often sends a second message while the agent is still working on
the first ("có màu đen không" while it checks stock). Before each model call,
this middleware reads the conversation's inbound messages that arrived after
the turn's last one and appends them as a human message, so the next model
call answers both. The ids it took go out as a `steered` custom event, which
the stream pipeline turns into a `data-steered` part: apps/api then knows
those messages are answered and does not start a follow-up turn for them.

Only text is steered. The first message with an attachment stops it (apps/api
describes images with its own vision call), and so does one the input
guardrail blocks: those, and every message after them, wait for the
follow-up turn, which runs the normal path. A steered message gets its own
knowledge retrieval, like the turn's first message.

Off unless apps/api sends `steer_after_message_id`. Any failure leaves the
turn as it was, so the message is answered by the follow-up turn instead.
"""
from __future__ import annotations

from typing import Any
from uuid import UUID

from langchain.agents.middleware import AgentMiddleware, AgentState
from langchain_core.callbacks import adispatch_custom_event
from langchain_core.messages import HumanMessage
from sqlmodel import select

from eccho_ai.core.app_logger import get_logger
from eccho_ai.core.postgres import PostgresRepo
from eccho_ai.llm.tools.knowledge_tool import SEARCH_KNOWLEDGE_TOOL
from eccho_ai.models.messages import Messages
from eccho_ai.modules.chat.models.agent_models import AgentRequestContext

logger = get_logger(__name__)

STEERED_EVENT = "steered"
STEERED_IDS_KEY = "steered_message_ids"


async def fetch_newer_inbound(conversation_id: str, after_message_id: str) -> list[Messages]:
    """The conversation's inbound messages saved after `after_message_id`, oldest first.

    Ordered by when apps/api saved them, not by the platform's `date_sent`: a
    platform can deliver out of order, and a redelivered message the turn
    already answered must not come back in.
    """
    db = PostgresRepo[Messages].get_instance()
    after = select(Messages.created_at).where(Messages.id == UUID(after_message_id)).scalar_subquery()
    stmt = (
        select(Messages)
        .where(
            Messages.conversation_id == UUID(conversation_id),
            Messages.direction == "INBOUND",
            Messages.deleted == False,
            Messages.deleted_at.is_(None),  # type: ignore[union-attr]
            Messages.created_at > after,
        )
        .order_by(Messages.created_at, Messages.id)  # type: ignore[arg-type]
    )
    async with db.session_factory() as session:
        return list((await session.exec(stmt)).all())


async def screen_input(text: str, chatbot: Any) -> str | None:
    """The input guardrail's block reason for `text`, or None when allowed."""
    from eccho_ai.llm.guardrails.content import run_input_guardrail

    return await run_input_guardrail(text, chatbot) if chatbot is not None else None


async def with_knowledge(text: str, chatbot_id: str, can_search: bool = False) -> str:
    """`text` wrapped with its knowledge retrieval, as the turn's first message is."""
    # Imported here: chat.services imports this package (agent.py).
    from eccho_ai.modules.chat.services import _build_rag_message, rag_retrieval_service

    try:
        retrieval = await rag_retrieval_service.retrieve(chatbot_id=chatbot_id, query=text)
    except Exception as exc:  # noqa: BLE001 (never fail the turn)
        logger.warning("steer_retrieval_failed", error=str(exc), chatbot_id=chatbot_id)
        return text
    return _build_rag_message(text, retrieval, can_search=can_search)


def _can_search(context: Any) -> bool:
    """Whether the turn's agent has search_knowledge (a chatbot with knowledge)."""
    return any(t.name == SEARCH_KNOWLEDGE_TOOL for t in (getattr(context, "tools", None) or []))


def _already_steered(messages: list[Any]) -> set[str]:
    seen: set[str] = set()
    for message in messages:
        seen.update(getattr(message, "additional_kwargs", {}).get(STEERED_IDS_KEY, []))
    return seen


class SteeringMiddleware(AgentMiddleware[AgentState[Any], AgentRequestContext]):
    async def abefore_model(self, state, runtime) -> dict[str, Any] | None:
        context = getattr(runtime, "context", None)
        after = getattr(context, "steer_after_message_id", None)
        conversation_id = getattr(context, "conversation_id", None)
        if not after or not conversation_id:
            return None
        try:
            return await self._steer(state, context, conversation_id, after)
        except Exception as exc:  # noqa: BLE001 (never fail the turn)
            logger.warning("steer_failed", error=str(exc), conversation_id=conversation_id)
            return None

    async def _steer(self, state, context, conversation_id: str, after: str) -> dict[str, Any] | None:
        seen = _already_steered(state["messages"])
        rows = [r for r in await fetch_newer_inbound(conversation_id, after) if str(r.id) not in seen]

        taken: list[Messages] = []
        for row in rows:
            # Stopped here on an earlier model call: do not screen it again.
            if str(row.id) == context.steer_stopped_at:
                break
            text = (row.text or "").strip()
            if row.attachments or not text or await screen_input(text, context.chatbot):
                context.steer_stopped_at = str(row.id)
                break
            taken.append(row)
        if not taken:
            return None

        ids = [str(r.id) for r in taken]
        text = "\n".join((r.text or "").strip() for r in taken)
        content = await with_knowledge(text, context.chatbot_id, can_search=_can_search(context))
        await adispatch_custom_event(STEERED_EVENT, {"message_ids": ids})
        logger.info("turn_steered", conversation_id=conversation_id, count=len(ids))
        return {"messages": [HumanMessage(content=content, additional_kwargs={STEERED_IDS_KEY: ids})]}
