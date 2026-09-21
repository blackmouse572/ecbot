"""Per-request agent configuration via LangChain middleware.

One shared agent is compiled once; this middleware customizes it per request
from the chatbot config carried on the runtime context — swapping the model,
injecting the chatbot's operator tools, and rendering its system prompt.

Async hooks (`awrap_*`) are required: the app invokes the agent asynchronously
(`ainvoke` / `astream_events`), and the sync hooks raise under async invocation.
Both hooks are needed — `awrap_model_call` injects the dynamic operator tools and
`awrap_tool_call` teaches the agent how to execute them (tools not present in the
initial `create_agent` config are otherwise unexecutable).
"""
from __future__ import annotations

from typing import Any

from langchain.agents.middleware import AgentMiddleware, AgentState

from eccho_ai.llm.prompts.loader import render_system_prompt
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
                model=_with_sticky_session(
                    model, getattr(context, "conversation_id", None)
                ),
                tools=[*request.tools, *injected],
                system_prompt=render_system_prompt(chatbot),
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
