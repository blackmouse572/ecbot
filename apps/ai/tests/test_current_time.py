"""Per-turn clock (#285): the agent learns "now" from its newest human turn,
never from the system prompt, so the cached prompt prefix stays stable."""
from __future__ import annotations

from datetime import UTC, datetime

from langchain_core.messages import AIMessage, HumanMessage

from eccho_ai.llm.prompts.current_time import (
    render_current_time,
    with_current_time,
    zone,
)

# 2026-10-13 16:50 UTC is 23:50 in Ho Chi Minh City (UTC+7).
NOW = datetime(2026, 10, 13, 16, 50, tzinfo=UTC)
HCM = zone("Asia/Ho_Chi_Minh")


def test_loads_the_zone_apps_api_resolved():
    assert zone("Asia/Bangkok").key == "Asia/Bangkok"


def test_falls_back_to_utc_when_missing_or_invalid():
    # apps/api always sends a resolved zone; UTC only covers a bad value or an
    # older apps/api during a deploy, and never breaks the turn.
    assert zone(None).key == "UTC"
    assert zone("").key == "UTC"
    assert zone("Mars/Olympus").key == "UTC"


def test_renders_date_time_weekday_and_zone_in_the_agent_timezone():
    block = render_current_time(NOW, HCM)
    assert block == (
        "<current_time>Tuesday, 2026-10-13 23:50 "
        "(Asia/Ho_Chi_Minh, UTC+07:00)</current_time>"
    )


def test_changing_the_timezone_changes_the_rendered_clock():
    block = render_current_time(NOW, zone("Europe/London"))
    assert "Tuesday, 2026-10-13 17:50 (Europe/London, UTC+01:00)" in block


# ── Conversation timezone (#292) ─────────────────────────────────────────────


def test_a_customer_in_the_business_zone_gets_the_single_clock():
    assert render_current_time(NOW, HCM, zone("Asia/Ho_Chi_Minh")) == (
        render_current_time(NOW, HCM)
    )


def test_a_customer_in_another_zone_gets_both_clocks_and_the_split_rule():
    block = render_current_time(NOW, HCM, zone("America/New_York"))
    assert block == (
        "<current_time>\n"
        "Business: Tuesday, 2026-10-13 23:50 (Asia/Ho_Chi_Minh, UTC+07:00)\n"
        "Customer: Tuesday, 2026-10-13 12:50 (America/New_York, UTC-04:00)\n"
        "Opening hours and business facts follow the business clock. Times the "
        "customer states (\"call me at 9\", \"tomorrow morning\") follow the "
        "customer clock.\n"
        "</current_time>"
    )
    assert "\u2014" not in block


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


def test_warns_once_per_bad_value_not_on_every_model_call(monkeypatch):
    import eccho_ai.llm.prompts.current_time as ct

    warnings = []
    monkeypatch.setattr(ct.logger, "warning", lambda *a, **kw: warnings.append(kw))
    for _ in range(5):
        zone("Not/AZone")
    assert len(warnings) == 1
