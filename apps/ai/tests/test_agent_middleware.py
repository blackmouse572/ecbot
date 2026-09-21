"""Offline validation of ChatbotConfigMiddleware — the #301 "middleware bet".

Proves that per-request config injected via runtime context (1) overrides the
model, and (2) lets dynamically-injected operator tools EXECUTE — which requires
both awrap_model_call and awrap_tool_call. Uses a fake chat model; no network.
"""
from __future__ import annotations

from unittest.mock import MagicMock

from langchain.agents import create_agent
from langchain_core.language_models.fake_chat_models import GenericFakeChatModel
from langchain_core.messages import AIMessage
from langchain_core.tools import StructuredTool

import eccho_ai.llm.agents.middleware as mw
from eccho_ai.llm.agents.middleware import ChatbotConfigMiddleware
from eccho_ai.modules.chat.models.agent_models import AgentRequestContext


class _FakeToolModel(GenericFakeChatModel):
    """GenericFakeChatModel lacks bind_tools; ignore tools (output is scripted)."""

    def bind_tools(self, tools, **kw):
        return self


def _tool_then_final():
    return _FakeToolModel(
        messages=iter(
            [
                AIMessage(
                    content="",
                    tool_calls=[{"name": "lookup", "args": {"q": "x"}, "id": "c1", "type": "tool_call"}],
                ),
                AIMessage(content="final answer"),
            ]
        )
    )


def _agent():
    # Placeholder model is always overridden by the middleware when a chatbot is present.
    return create_agent(
        model=_FakeToolModel(messages=iter([AIMessage(content="placeholder")])),
        tools=[],
        middleware=[ChatbotConfigMiddleware()],
        context_schema=AgentRequestContext,
    )


async def test_middleware_injects_and_executes_operator_tool(monkeypatch):
    executed = {"n": 0}

    def _lookup(q: str) -> str:
        executed["n"] += 1
        return "tool-result"

    dyn = StructuredTool.from_function(func=_lookup, name="lookup", description="d")
    fake = _tool_then_final()  # one shared instance so the script advances across turns

    monkeypatch.setattr(mw, "build_chat_model", lambda **kw: fake)
    monkeypatch.setattr(mw, "render_system_prompt", lambda chatbot: "sys")

    # Toolset is resolved once and carried on the context — both hooks read it.
    ctx = AgentRequestContext(chatbot=MagicMock(), chatbot_id="x", tools=[dyn])
    result = await _agent().ainvoke({"messages": [("user", "hi")]}, context=ctx)

    assert executed["n"] == 1, "operator tool must execute via awrap_tool_call"
    assert result["messages"][-1].content == "final answer"


async def test_middleware_passthrough_without_chatbot():
    """No chatbot on the runtime context -> no override (defensive branch)."""

    class _Runtime:
        context = AgentRequestContext(chatbot=None, chatbot_id="x")

    class _Request:
        runtime = _Runtime()
        tools: list = []

        def override(self, **kw):
            raise AssertionError("must not override when no chatbot is present")

    async def _handler(req):
        return "passthrough"

    result = await ChatbotConfigMiddleware().awrap_model_call(_Request(), _handler)
    assert result == "passthrough"


# ── OpenRouter sticky routing (#318) ─────────────────────────────────────────


class _CapturingRequest:
    """Minimal ModelRequest stand-in that records what the middleware overrides."""

    tools: list = []

    def __init__(self, context):
        self.runtime = type("_R", (), {"context": context})()
        self.overrides: dict = {}

    def override(self, **kw):
        self.overrides = kw
        return self


async def _run_middleware(monkeypatch, model, *, conversation_id):
    monkeypatch.setattr(mw, "build_chat_model", lambda **kw: model)
    monkeypatch.setattr(mw, "render_system_prompt", lambda chatbot: "sys")
    ctx = AgentRequestContext(
        chatbot=MagicMock(), chatbot_id="x", conversation_id=conversation_id
    )
    request = _CapturingRequest(ctx)

    async def _handler(req):
        return req

    await ChatbotConfigMiddleware().awrap_model_call(request, _handler)
    return request.overrides["model"]


async def test_sticky_session_id_preserves_cache_control(monkeypatch):
    # The payload merge is shallow, so session_id must be merged INTO the
    # existing extra_body — replacing it would drop Anthropic's cache_control.
    from langchain_openai import ChatOpenAI

    base = ChatOpenAI(
        model="anthropic/claude-sonnet-4.5",
        api_key="sk-test",
        extra_body={"cache_control": {"type": "ephemeral"}},
    )
    model = await _run_middleware(monkeypatch, base, conversation_id="conv-1")

    assert isinstance(model, ChatOpenAI), "must stay a chat model, not a RunnableBinding"
    assert model.extra_body == {
        "cache_control": {"type": "ephemeral"},
        "session_id": "conv-1",
    }
    # The lru_cache'd shared client must not be mutated.
    assert base.extra_body == {"cache_control": {"type": "ephemeral"}}


async def test_no_session_id_without_conversation(monkeypatch):
    from langchain_openai import ChatOpenAI

    base = ChatOpenAI(model="google/gemini-2.5-flash", api_key="sk-test")
    model = await _run_middleware(monkeypatch, base, conversation_id=None)
    assert model is base
    assert model.extra_body is None
