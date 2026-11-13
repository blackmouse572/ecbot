"""Per-request agent configuration via LangChain middleware.

One shared agent is compiled once; this middleware customizes it per request
from the chatbot config carried on the runtime context — swapping the model,
injecting the chatbot's operator tools, rendering its system prompt, and
prefixing the turn's current time (#285) and open/closed status (#289) onto the
newest human message.

Async hooks (`awrap_*`) are required: the app invokes the agent asynchronously
(`ainvoke` / `astream_events`), and the sync hooks raise under async invocation.
Both hooks are needed — `awrap_model_call` injects the dynamic operator tools and
`awrap_tool_call` teaches the agent how to execute them (tools not present in the
initial `create_agent` config are otherwise unexecutable).
"""
from __future__ import annotations

from typing import Any

from langchain.agents.middleware import AgentMiddleware, AgentState

from eccho_ai.llm.prompts.current_time import (
    render_current_time,
    with_current_time,
    zone,
)
from eccho_ai.llm.prompts.loader import render_system_prompt
from eccho_ai.llm.prompts.opening_hours import render_opening_hours
from eccho_ai.llm.providers.chat_model import build_chat_model
from eccho_ai.modules.chat.models.agent_models import AgentRequestContext


def _context_from(request) -> object | None:
    runtime = getattr(request, "runtime", None)
    return getattr(runtime, "context", None)


def _with_sticky_session(model, conversation_id: str | None):
    """Pin a conversation to one OpenRouter provider endpoint so its prompt cache
    can actually be hit — without a session id, turns may land on a different
    endpoint with a cold cache.

    Merges into `extra_body` rather than replacing it: the payload merge is
    shallow, so overwriting would drop the `cache_control` that `build_chat_model`
    sets for Anthropic. Copies rather than mutates — the model is an lru_cache'd
    client shared by every request. `.bind()` is avoided on purpose: it returns a
    RunnableBinding, which is not a chat model the agent can call `bind_tools` on.
    """
    if not conversation_id:
        return model
    return model.model_copy(
        update={"extra_body": {**(model.extra_body or {}), "session_id": conversation_id}}
    )


# A ranked reply only goes to providers that support every parameter we send
# (tools, reasoning), run the model at 6 bits or more (fp4/int4 copies lose
# quality; "unknown" keeps Google, Together and Fireworks), and do not keep
# prompts, which hold customer messages.
_PROVIDER_FILTERS = {
    "require_parameters": True,
    "quantizations": ["fp6", "fp8", "fp16", "bf16", "fp32", "unknown"],
    "data_collection": "deny",
}


def _with_provider_sort(model, sort: str | None):
    """Rank OpenRouter's providers for this model by `sort` ("throughput" is
    the fastest; perf review 2026-11-13), among the ones _PROVIDER_FILTERS
    allows. Merged into `extra_body` and copied, like the sticky session."""
    if not sort:
        return model
    provider = {"sort": sort, **_PROVIDER_FILTERS}
    return model.model_copy(
        update={"extra_body": {**(model.extra_body or {}), "provider": provider}}
    )


def _turn_context(context: AgentRequestContext) -> str:
    """The clock, then the open/closed status when the agent has weekly hours
    (#289). Hours are the business's, so they use the agent zone; only the
    clock adds the customer's zone (#292)."""
    agent_tz = zone(context.agent_timezone)
    customer_tz = zone(context.customer_timezone or context.agent_timezone)
    blocks = [
        render_current_time(context.now, agent_tz, customer_tz),
        render_opening_hours(context.chatbot, context.now, agent_tz),
    ]
    return "\n".join(b for b in blocks if b)


class ChatbotConfigMiddleware(AgentMiddleware[AgentState[Any], AgentRequestContext]):
    async def awrap_model_call(self, request, handler):
        context = _context_from(request)
        chatbot = getattr(context, "chatbot", None)
        if chatbot is not None:
            injected = getattr(context, "tools", None) or []
            model = build_chat_model(
                model_text_name=chatbot.model_text_name,
                temperature=chatbot.model_temperature,
                max_tokens=chatbot.max_tokens,
            )
            request = request.override(
                model=_with_provider_sort(
                    _with_sticky_session(model, getattr(context, "conversation_id", None)),
                    getattr(context, "provider_sort", None),
                ),
                tools=[*request.tools, *injected],
                system_prompt=render_system_prompt(chatbot),
                messages=with_current_time(request.messages, _turn_context(context)),
            )
        return await handler(request)

    async def awrap_tool_call(self, request, handler):
        context = _context_from(request)
        injected = getattr(context, "tools", None) or []
        by_name = {t.name: t for t in injected}
        tool = by_name.get(request.tool_call["name"])
        if tool is not None:
            return await handler(request.override(tool=tool))
        return await handler(request)
