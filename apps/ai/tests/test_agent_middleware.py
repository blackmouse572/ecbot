"""Offline validation of ChatbotConfigMiddleware — the #301 "middleware bet".

Proves that per-request config injected via runtime context (1) overrides the
model, and (2) lets dynamically-injected operator tools EXECUTE — which requires
both awrap_model_call and awrap_tool_call. Uses a fake chat model; no network.
"""
from __future__ import annotations

from datetime import UTC
from unittest.mock import MagicMock

import pytest

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
    monkeypatch.setattr(mw, "render_system_prompt", lambda chatbot, **kw: "sys")

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


_FILTERS = {
    "require_parameters": True,
    "quantizations": ["fp6", "fp8", "fp16", "bf16", "fp32", "unknown"],
    "data_collection": "deny",
}


class _CapturingRequest:
    """Minimal ModelRequest stand-in that records what the middleware overrides."""

    tools: list = []
    messages: list = []  # noqa: RUF012

    def __init__(self, context):
        self.runtime = type("_R", (), {"context": context})()
        self.overrides: dict = {}

    def override(self, **kw):
        self.overrides = kw
        return self


async def _run_middleware(monkeypatch, model, *, conversation_id, provider_sort=None):
    monkeypatch.setattr(mw, "build_chat_model", lambda **kw: model)
    monkeypatch.setattr(mw, "render_system_prompt", lambda chatbot, **kw: "sys")
    ctx = AgentRequestContext(
        chatbot=MagicMock(), chatbot_id="x", conversation_id=conversation_id, provider_sort=provider_sort
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
        "provider": _FILTERS,
    }
    # The lru_cache'd shared client must not be mutated.
    assert base.extra_body == {"cache_control": {"type": "ephemeral"}}


async def test_no_session_id_without_conversation(monkeypatch):
    from langchain_openai import ChatOpenAI

    base = ChatOpenAI(model="google/gemini-2.5-flash", api_key="sk-test")
    model = await _run_middleware(monkeypatch, base, conversation_id=None)
    assert "session_id" not in model.extra_body
    assert base.extra_body is None


async def test_provider_sort_reaches_openrouter_beside_the_session(monkeypatch):
    """OpenRouter hosts one model at many providers; `provider.sort` ranks
    them (perf review 2026-11-13: `throughput` cut the median reply from 5.9 s
    to 4.1 s). Merged like session_id, never replacing extra_body."""
    from langchain_openai import ChatOpenAI

    base = ChatOpenAI(model="deepseek/deepseek-v4.1-flash", api_key="sk-test")
    model = await _run_middleware(monkeypatch, base, conversation_id="conv-1", provider_sort="throughput")

    assert isinstance(model, ChatOpenAI)
    assert model.extra_body == {
        "session_id": "conv-1",
        "provider": {"sort": "throughput", **_FILTERS},
    }
    assert base.extra_body is None


async def test_every_reply_skips_weak_or_data_keeping_providers(monkeypatch):
    """No sort keeps OpenRouter's own ranking, among the same providers."""
    from langchain_openai import ChatOpenAI

    base = ChatOpenAI(model="deepseek/deepseek-v4.1-flash", api_key="sk-test")
    model = await _run_middleware(monkeypatch, base, conversation_id=None)
    assert model.extra_body == {"provider": _FILTERS}


async def test_a_model_no_provider_passes_still_replies_unfiltered(monkeypatch):
    """OpenRouter answers 404 when no provider passes the filters (a model
    served only by fp4 or data-keeping hosts): reply anyway, without them."""
    import httpx
    import openai
    from langchain_openai import ChatOpenAI

    base = ChatOpenAI(model="some/niche-model", api_key="sk-test")
    monkeypatch.setattr(mw, "build_chat_model", lambda **kw: base)
    monkeypatch.setattr(mw, "render_system_prompt", lambda chatbot, **kw: "sys")
    request = _CapturingRequest(
        AgentRequestContext(chatbot=MagicMock(), chatbot_id="x", conversation_id="conv-1")
    )
    seen = []

    async def _handler(req):
        body = req.overrides["model"].extra_body
        seen.append(body)
        if "provider" in body:
            raise openai.NotFoundError(
                "No endpoints found matching your data policy",
                response=httpx.Response(404, request=httpx.Request("POST", "https://x")),
                body=None,
            )
        return "reply"

    assert await ChatbotConfigMiddleware().awrap_model_call(request, _handler) == "reply"
    assert seen == [{"session_id": "conv-1", "provider": _FILTERS}, {"session_id": "conv-1"}]


# ── Per-turn clock (#285) ────────────────────────────────────────────────────


async def test_current_time_rides_the_newest_turn_not_the_system_prompt(monkeypatch):
    from datetime import datetime

    seen: dict = {}

    class _RecordingModel(_FakeToolModel):
        def _generate(self, messages, *a, **kw):
            seen["messages"] = messages
            return super()._generate(messages, *a, **kw)

    fake = _RecordingModel(messages=iter([AIMessage(content="ok")]))
    monkeypatch.setattr(mw, "build_chat_model", lambda **kw: fake)
    monkeypatch.setattr(mw, "render_system_prompt", lambda chatbot, **kw: "sys")

    ctx = AgentRequestContext(
        chatbot=MagicMock(),
        chatbot_id="x",
        agent_timezone="Asia/Ho_Chi_Minh",
        now=datetime(2026, 10, 13, 16, 50, tzinfo=UTC),
    )
    result = await _agent().ainvoke({"messages": [("user", "deliver now?")]}, context=ctx)

    system, newest = seen["messages"][0], seen["messages"][-1]
    assert system.content == "sys"
    assert newest.content.startswith(
        "<current_time>Tuesday, 2026-10-13 23:50 (Asia/Ho_Chi_Minh, UTC+07:00)</current_time>"
    )
    # Model input only: the conversation state keeps the customer's own words.
    assert result["messages"][0].content == "deliver now?"


async def test_a_conversation_timezone_adds_the_customer_clock(monkeypatch):
    from datetime import datetime

    seen: dict = {}

    class _RecordingModel(_FakeToolModel):
        def _generate(self, messages, *a, **kw):
            seen["messages"] = messages
            return super()._generate(messages, *a, **kw)

    fake = _RecordingModel(messages=iter([AIMessage(content="ok")]))
    monkeypatch.setattr(mw, "build_chat_model", lambda **kw: fake)
    monkeypatch.setattr(mw, "render_system_prompt", lambda chatbot, **kw: "sys")

    ctx = AgentRequestContext(
        chatbot=MagicMock(),
        chatbot_id="x",
        agent_timezone="Asia/Ho_Chi_Minh",
        customer_timezone="America/New_York",
        now=datetime(2026, 10, 13, 16, 50, tzinfo=UTC),
    )
    await _agent().ainvoke({"messages": [("user", "call me at 9?")]}, context=ctx)

    newest = seen["messages"][-1].content
    assert "Business: Tuesday, 2026-10-13 23:50 (Asia/Ho_Chi_Minh" in newest
    assert "Customer: Tuesday, 2026-10-13 12:50 (America/New_York" in newest


async def test_opening_status_follows_the_clock_on_the_newest_turn(monkeypatch):
    from datetime import datetime

    seen: dict = {}

    class _RecordingModel(_FakeToolModel):
        def _generate(self, messages, *a, **kw):
            seen["messages"] = messages
            return super()._generate(messages, *a, **kw)

    fake = _RecordingModel(messages=iter([AIMessage(content="ok")]))
    monkeypatch.setattr(mw, "build_chat_model", lambda **kw: fake)
    monkeypatch.setattr(mw, "render_system_prompt", lambda chatbot, **kw: "sys")

    chatbot = MagicMock(
        agent_profile={"openingHours": {"tue": [{"open": "08:00", "close": "22:00"}]}},
    )
    ctx = AgentRequestContext(
        chatbot=chatbot,
        chatbot_id="x",
        agent_timezone="Asia/Ho_Chi_Minh",
        now=datetime(2026, 10, 13, 16, 50, tzinfo=UTC),
    )
    await _agent().ainvoke({"messages": [("user", "open?")]}, context=ctx)

    assert seen["messages"][-1].content == (
        "<current_time>Tuesday, 2026-10-13 23:50 (Asia/Ho_Chi_Minh, UTC+07:00)</current_time>\n"
        "<opening_hours>Closed now. Opens next Tuesday at 08:00. "
        "Today (Tuesday): 08:00-22:00.</opening_hours>\n\nopen?"
    )


# ── Orders flag ──────────────────────────────────────────────────────────────


async def _model_overrides(monkeypatch, *, orders_enabled):
    monkeypatch.setattr(mw, "build_chat_model", lambda **kw: MagicMock())
    monkeypatch.setattr(mw, "_with_sticky_session", lambda model, _conversation_id: model)
    monkeypatch.setattr(mw, "_with_provider_routing", lambda model, _sort: model)
    monkeypatch.setattr(mw, "render_system_prompt", lambda chatbot, **kw: f"orders={kw.get('orders_enabled')}")
    ctx = AgentRequestContext(chatbot=MagicMock(), chatbot_id="x", orders_enabled=orders_enabled)
    request = _CapturingRequest(ctx)
    request.tools = [
        StructuredTool.from_function(func=lambda: "", name="record_order", description="d"),
        StructuredTool.from_function(func=lambda: "", name="apply_customer_tag", description="d"),
    ]

    async def _handler(req):
        return req

    await ChatbotConfigMiddleware().awrap_model_call(request, _handler)
    return request.overrides


async def test_orders_off_drops_record_order(monkeypatch):
    overrides = await _model_overrides(monkeypatch, orders_enabled=False)
    assert [t.name for t in overrides["tools"]] == ["apply_customer_tag"]
    assert overrides["system_prompt"] == "orders=False"


async def test_orders_on_keeps_record_order(monkeypatch):
    overrides = await _model_overrides(monkeypatch, orders_enabled=True)
    assert [t.name for t in overrides["tools"]] == ["record_order", "apply_customer_tag"]
    assert overrides["system_prompt"] == "orders=True"


# ── identical tool calls do not loop a turn away (#643) ──────────────────────

# The burst's questions: plain menu/facility asks that ended at
# GraphRecursionError because the model re-applied the same tag every round.
_LOOPING_QUESTIONS = [
    "Quán có wifi không?",
    "Có ghế cho em bé không?",
    "Bàn này ngồi được mấy người?",
    "Có menu cho trẻ em không?",
    "Tôm hùm giá bao nhiêu?",
]


def _tag_call(name: str, call_id: str) -> AIMessage:
    return AIMessage(
        content="",
        tool_calls=[{"name": "apply_customer_tag", "args": {"name": name}, "id": call_id, "type": "tool_call"}],
    )


def _looping_turn(monkeypatch, messages: list, executed: list[str]):
    """The production graph (shared agent + middleware) with a scripted model."""

    async def apply_customer_tag(name: str) -> dict:
        executed.append(name)
        return {"ok": True, "triggersHandoff": True, "triggeredHandoff": True}

    tool = StructuredTool.from_function(
        coroutine=apply_customer_tag, name="apply_customer_tag", description="apply a tag"
    )
    fake = _FakeToolModel(messages=iter(messages))
    monkeypatch.setattr(mw, "build_chat_model", lambda **kw: fake)
    monkeypatch.setattr(mw, "render_system_prompt", lambda chatbot, **kw: "sys")
    agent = _agent()
    ctx = AgentRequestContext(chatbot=MagicMock(), chatbot_id="bot", tools=[tool])
    return agent, ctx, tool


async def _run_turn(agent, ctx, message: str):
    # 11 is what apps/api's max_tool_iterations=5 produces (get_agent_config).
    return await agent.ainvoke(
        {"messages": [("user", message)]}, context=ctx, config={"recursion_limit": 11}
    )


@pytest.mark.parametrize("question", _LOOPING_QUESTIONS)
async def test_a_menu_question_turn_answers_after_a_repeated_handoff(monkeypatch, question):
    """One repeat is refused, then the model answers: the turn ends in a reply,
    not at the recursion limit."""
    executed: list[str] = []
    agent, ctx, _ = _looping_turn(
        monkeypatch,
        [
            _tag_call("Khách khó tính", "c1"),
            _tag_call("Khách khó tính", "c2"),
            AIMessage(content="Dạ em đã chuyển cho nhân viên ạ."),
        ],
        executed,
    )

    result = await _run_turn(agent, ctx, question)

    assert executed == ["Khách khó tính"], "the repeated handoff must not re-run"
    assert result["messages"][-1].content == "Dạ em đã chuyển cho nhân viên ạ."


async def test_a_repeated_call_is_written_once_however_often_it_repeats(monkeypatch):
    """Every repeat after the first is refused without touching the tool.

    A model that never stops still ends the turn at the limit — 11 supersteps
    afford two tool rounds — but the tag is written once instead of once per
    round, and a refused round costs no more than the round it replaced."""
    from langgraph.errors import GraphRecursionError

    executed: list[str] = []
    agent, ctx, _ = _looping_turn(
        monkeypatch,
        [_tag_call("Khách khó tính", f"c{i}") for i in range(8)],
        executed,
    )

    with pytest.raises(GraphRecursionError):
        await _run_turn(agent, ctx, "Quán có wifi không?")

    assert executed == ["Khách khó tính"]


async def test_different_arguments_are_not_a_repeat(monkeypatch):
    """Two tags in one turn are two calls: both are applied."""
    executed: list[str] = []
    agent, ctx, _ = _looping_turn(
        monkeypatch,
        [
            _tag_call("VIP", "c1"),
            _tag_call("Đơn hàng mới", "c2"),
            AIMessage(content="Dạ em ghi nhận ạ."),
        ],
        executed,
    )

    await _run_turn(agent, ctx, "Mình là khách quen, đặt thêm 1 phần nha.")

    assert executed == ["VIP", "Đơn hàng mới"]


async def test_each_turn_records_its_own_calls(monkeypatch):
    """The record lives on the turn's context: the next turn may call the same
    tool with the same arguments again."""
    executed: list[str] = []
    agent, ctx, tool = _looping_turn(
        monkeypatch,
        [
            _tag_call("VIP", "c1"),
            AIMessage(content="Dạ vâng ạ."),
            _tag_call("VIP", "c2"),
            AIMessage(content="Dạ vâng ạ."),
        ],
        executed,
    )

    await _run_turn(agent, ctx, "Gắn tag giúp em nha.")
    next_turn = AgentRequestContext(chatbot=MagicMock(), chatbot_id="bot", tools=[tool])
    await _run_turn(agent, next_turn, "Gắn tag lại giúp em nha.")

    assert executed == ["VIP", "VIP"]
