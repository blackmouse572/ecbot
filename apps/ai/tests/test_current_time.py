"""Per-turn clock (#285): the agent learns "now" from its newest human turn,
never from the system prompt, so the cached prompt prefix stays stable."""
from __future__ import annotations

from datetime import UTC, datetime
from types import SimpleNamespace

from langchain_core.messages import AIMessage, HumanMessage

from eccho_ai.llm.prompts.current_time import (
    render_current_time,
    resolve_timezone,
    with_current_time,
)

# 2026-10-13 16:50 UTC is 23:50 in Ho Chi Minh City (UTC+7).
NOW = datetime(2026, 10, 13, 16, 50, tzinfo=UTC)


def _bot(tz):
    return SimpleNamespace(timezone=tz)


def test_resolves_the_agent_timezone():
    assert resolve_timezone(_bot("Asia/Bangkok")).key == "Asia/Bangkok"


def test_falls_back_to_the_deployment_default_when_unset_or_invalid():
    assert resolve_timezone(_bot(None)).key == "Asia/Ho_Chi_Minh"
    assert resolve_timezone(_bot("")).key == "Asia/Ho_Chi_Minh"
    assert resolve_timezone(_bot("Mars/Olympus")).key == "Asia/Ho_Chi_Minh"
    assert resolve_timezone(None).key == "Asia/Ho_Chi_Minh"


def test_renders_date_time_weekday_and_zone_in_the_agent_timezone():
    block = render_current_time(NOW, resolve_timezone(_bot(None)))
    assert block == (
        "<current_time>Tuesday, 2026-10-13 23:50 "
        "(Asia/Ho_Chi_Minh, UTC+07:00)</current_time>"
    )


def test_changing_the_timezone_changes_the_rendered_clock():
    block = render_current_time(NOW, resolve_timezone(_bot("Europe/London")))
    assert "Tuesday, 2026-10-13 17:50 (Europe/London, UTC+01:00)" in block


def test_prefixes_only_the_newest_human_turn_and_leaves_inputs_untouched():
    history = [HumanMessage(content="hi"), AIMessage(content="hello")]
    newest = HumanMessage(content="deliver tonight?")
    messages = [*history, newest]

    out = with_current_time(messages, "<current_time>X</current_time>")

    assert out[:2] == history
    assert out[2].content == "<current_time>X</current_time>\n\ndeliver tonight?"
    assert newest.content == "deliver tonight?"  # stored history stays clean


def test_prefixes_multipart_content_with_a_text_part():
    newest = HumanMessage(content=[{"type": "image_url", "image_url": {"url": "u"}}])
    out = with_current_time([newest], "B")
    assert out[0].content[0] == {"type": "text", "text": "B"}
    assert len(out[0].content) == 2


def test_targets_the_human_turn_during_a_tool_loop():
    from langchain_core.messages import ToolMessage

    messages = [
        HumanMessage(content="q"),
        AIMessage(content="", tool_calls=[{"name": "t", "args": {}, "id": "1"}]),
        ToolMessage(content="r", tool_call_id="1"),
    ]
    out = with_current_time(messages, "B")
    assert out[0].content == "B\n\nq"
    assert out[1:] == messages[1:]
