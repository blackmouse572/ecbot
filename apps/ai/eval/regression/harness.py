"""Runs one sample of a case through the production agent.

Everything a live turn uses is the real code: the shared agent graph and its
middleware (model, system prompt, clock, tool filtering), `get_agent_input`
(history, reply-language note, customer context block) and the system tools
with their real descriptions and argument schemas. Only the edges are
stubbed: apps/api (the tools' HTTP calls answer like the API would) and the
database reads (customer row, saved fields).
"""
from __future__ import annotations

import asyncio
import contextvars
from datetime import datetime
from types import SimpleNamespace
from typing import Any
from unittest.mock import patch
from uuid import uuid4

from langchain_core.messages import AIMessage

from eccho_ai.core.api_client import ApiClient, ApiClientError
from eccho_ai.llm.agents.agent import get_shared_agent
from eccho_ai.llm.prompts import loader
from eccho_ai.llm.tools import system_tools
from eccho_ai.models.chat import Chatbots
from eccho_ai.modules.chat import services
from eccho_ai.modules.chat.customer_context import render_customer_context
from eccho_ai.modules.chat.models.agent_models import AgentRequestContext
from eccho_ai.modules.chat.models.chat_models import ChatHistoryMessage, ChatRequest
from eccho_ai.modules.chat.constants import DEFAULT_MAX_TOOL_ITERATIONS

from eval.regression.blueprint import Compiled
from eval.regression.cases import Case
from eval.regression.checks import Turn

TIMEZONE = "Asia/Ho_Chi_Minh"
# Tuesday afternoon, inside every seeded agent's opening hours.
NOW = datetime.fromisoformat("2026-11-17T14:30:00+07:00")
MAX_TOKENS = 2000

_case: contextvars.ContextVar[Case] = contextvars.ContextVar("eval_case")
_template: contextvars.ContextVar[str] = contextvars.ContextVar("eval_template")


class FakeApi:
    """apps/api's /system routes as the tools see them."""

    async def post(self, path: str, json: dict[str, Any]) -> dict[str, Any]:
        case = _case.get()
        if path.endswith("/tags/apply"):
            if json["tagName"] not in {t.name for t in case.tags}:
                raise ApiClientError(f"POST {path} failed: 404 customerTag.error.notFound", status_code=404)
            return {"ok": True, "triggeredHandoff": json["tagName"] in case.handoff_tags}
        for suffix, result in case.tool_results.items():
            if path.endswith(suffix):
                return result
        return {"ok": True}

    async def get(self, path: str, params: dict[str, Any] | None = None) -> Any:
        return []

    async def delete(self, path: str) -> Any:
        return {"ok": True}


def _customer_block(case: Case) -> str:
    c = case.customer
    customer = SimpleNamespace(
        name=c.get("name"),
        language=c.get("language"),
        profile_summary=c.get("summary"),
        notes=c.get("notes"),
        metadata_=c.get("fields") or {},
    )
    rows = [(t.name, t.emoji, t.description, t.handoff, t.notify, None) for t in case.tags]
    return render_customer_context(customer, list(c.get("applied_tags") or []), rows, None)  # type: ignore[arg-type]


async def _fake_context_block(customer_id: str | None) -> str:
    return _customer_block(_case.get())


async def _fake_metadata(customer_id: str) -> dict[str, Any]:
    return dict(_case.get().customer.get("fields") or {})


def _arm_template() -> str:
    return _template.get()


_PATCHES = [
    patch.object(ApiClient, "get_instance", staticmethod(lambda: FakeApi())),
    patch.object(system_tools, "_read_customer_metadata", _fake_metadata),
    patch.object(services, "build_customer_context_block", _fake_context_block),
    patch.object(loader, "system_prompt_template", _arm_template),
]


def install_stubs() -> None:
    """Swap the edges for the whole process (the runner calls this once)."""
    for p in _PATCHES:
        p.start()


def chatbot_for(case: Case, compiled: Compiled, model: str) -> Chatbots:
    return Chatbots(
        name=case.profile.get("agentName") or "Agent",
        workspace_id=uuid4(),
        type=case.agent_type,
        general_knowledge=compiled.general_knowledge,
        followup_rules=compiled.followup_rules,
        welcome_message=case.profile.get("greeting") or "",
        primary_language=case.lang,
        defered_language=case.lang,
        model_provider=model.split("/")[0],
        model_text_name=model,
        model_temperature=1.0,
        max_tokens=MAX_TOKENS,
    )


def _turn_from(messages: list[Any]) -> Turn:
    calls: list[tuple[str, dict[str, Any]]] = []
    cost = 0.0
    for m in messages:
        if isinstance(m, AIMessage):
            calls.extend((tc["name"], tc.get("args") or {}) for tc in m.tool_calls)
            usage = (m.response_metadata or {}).get("token_usage") or {}
            cost += float(usage.get("cost") or 0.0)
    last = messages[-1] if messages else None
    reply = ""
    # Ending on a ToolMessage is end_without_reply (return_direct): no reply.
    if isinstance(last, AIMessage):
        content = last.content
        reply = content if isinstance(content, str) else "".join(
            p.get("text", "") for p in content if isinstance(p, dict)
        )
    return Turn(reply=reply.strip(), tool_calls=calls, cost=cost)


async def run_sample(case: Case, compiled: Compiled, model: str, template: str) -> Turn:
    """One live turn. Never raises: an error comes back on the Turn."""
    _case.set(case)
    _template.set(template)
    chatbot = chatbot_for(case, compiled, model)
    conversation_id = str(uuid4())
    request = ChatRequest(
        chatbot_id=str(chatbot.id),
        message=case.message,
        history=[ChatHistoryMessage(role=r, content=c) for r, c in case.history],  # type: ignore[arg-type]
        conversation_id=conversation_id,
        customer_id=str(uuid4()),
        agent_timezone=TIMEZONE,
        orders_enabled=case.orders,
    )
    context = AgentRequestContext(
        chatbot=chatbot,
        tools=None,
        chatbot_id=request.chatbot_id,
        conversation_id=conversation_id,
        customer_id=request.customer_id,
        agent_timezone=TIMEZONE,
        orders_enabled=case.orders,
        now=NOW,
    )
    config = {
        "recursion_limit": DEFAULT_MAX_TOOL_ITERATIONS * 2 + 1,
        "configurable": {"thread_id": conversation_id},
    }
    try:
        result = await get_shared_agent().ainvoke(
            input=await services.get_agent_input(request),
            context=context,
            config=config,
        )
    except Exception as exc:  # noqa: BLE001 — a failed sample is reported, not fatal
        return Turn(reply="", error=f"{type(exc).__name__}: {exc}"[:300])
    return _turn_from(result.get("messages", []))


async def gather_limited(jobs: list[Any], limit: int) -> list[Any]:
    sem = asyncio.Semaphore(limit)

    async def one(job: Any) -> Any:
        async with sem:
            return await job()

    return await asyncio.gather(*(one(j) for j in jobs))
