"""The prompt regression suite (eval/regression) without a live model: the
scenario files load, the rule checks and the report say what they should,
and a sample runs through the production agent with a scripted model."""
from __future__ import annotations

from typing import Any
from unittest.mock import patch

import pytest
from langchain_core.language_models.fake_chat_models import GenericFakeChatModel
from langchain_core.messages import AIMessage
from pydantic import SecretStr

from eccho_ai.core.variables import AppVars
from eccho_ai.llm.agents.agent import get_shared_agent

from eval.regression.cases import STAFF_HANDLED_NOTE, load_cases, select
from eval.regression.checks import Turn, run_rule, validate
from eval.regression.report import Sample, build_rows, render


@pytest.fixture(scope="module")
def cases():
    return load_cases()


def _case(cases, key: str):
    return next(c for c in cases if c.key == key)


def test_every_scenario_loads_with_known_checks(cases):
    assert {c.area for c in cases} >= {"handover", "repeat-handoff", "booking", "tricky"}
    for case in cases:
        validate(case)
        assert case.message and case.expect and case.tags


def test_a_case_runs_once_per_language(cases):
    keys = {c.key for c in cases}
    assert {"handover/angry_late_order/vi", "handover/angry_late_order/en"} <= keys


def test_history_is_shaped_like_apps_api_sends_it(cases):
    case = _case(cases, "repeat-handoff/ok/vi")
    roles = [r for r, _ in case.history]
    assert roles[:4] == ["user", "assistant", "user", "assistant"]
    assert case.history[4][1].startswith("[Staff] ")
    assert case.history[5] == ("user", STAFF_HANDLED_NOTE)
    changed = _case(cases, "repeat-handoff/changed_order/en")
    assert len(changed.history) == 8  # the shared history plus the change


def test_a_case_can_use_another_agent(cases):
    assert _case(cases, "handover/upset_after_filling/en").agent_type == "healthcare"
    assert _case(cases, "handover/angry_late_order/en").agent_type == "restaurant"


def test_select_by_area_case_and_language(cases):
    picked = select(cases, "booking/spa_nails,handover", ["en"])
    assert {c.area for c in picked} == {"booking", "handover"}
    assert all(c.lang == "en" for c in picked)
    assert [c.id for c in picked if c.area == "booking"] == ["spa_nails"]


def test_handoff_check_counts_only_handoff_tags(cases):
    case = _case(cases, "handover/angry_late_order/en")
    handed = Turn(reply="Sorry!", tool_calls=[("apply_customer_tag", {"name": "Angry"})])
    lead_only = Turn(reply="Sorry!", tool_calls=[("apply_customer_tag", {"name": "Hot lead"})])
    assert run_rule("handoff", True, case, handed)[0]
    assert not run_rule("handoff", True, case, lead_only)[0]
    assert run_rule("handoff", False, case, lead_only)[0]


def test_text_and_tag_rules(cases):
    case = _case(cases, "handover/upset_after_filling/en")
    turn = Turn(reply="Could you send a photo?", tool_calls=[("apply_customer_tag", {"name": "Complaint"})])
    assert not run_rule("reply_not_matches", "photo|picture", case, turn)[0]
    assert run_rule("reply_matches", "PHOTO", case, turn)[0]
    assert not run_rule("no_tag", ["Complaint", "Angry"], case, turn)[0]
    assert run_rule("tag", "Complaint", case, turn)[0]
    assert run_rule("max_words", 5, case, turn)[0]
    assert not run_rule("no_tool", "apply_customer_tag", case, turn)[0]


def _samples(arm: str, case: str, passes: list[bool]) -> list[Sample]:
    return [Sample(case, "m/x", arm, p, False, {"summary": "r"}, [{"ok": p, "detail": "d"}]) for p in passes]


def test_report_flags_a_case_that_got_worse_by_more_than_one_run():
    samples = _samples("new", "a/b/vi", [True, False, False, False]) + _samples("main", "a/b/vi", [True] * 4)
    rows = build_rows(samples, ["new", "main"], {"a/b/vi": 0.0})
    assert rows[0].status == "REGRESSED"
    assert rows[0].counts == {"new": (1, 4), "main": (4, 4)}


def test_report_ignores_one_run_of_noise_but_fails_below_min_pass():
    samples = _samples("new", "a/b/vi", [True, True, False]) + _samples("main", "a/b/vi", [True] * 3)
    assert build_rows(samples, ["new", "main"], {"a/b/vi": 0.5})[0].status == "ok"
    assert build_rows(samples, ["new", "main"], {"a/b/vi": 0.9})[0].status == "FAIL"


def test_report_calls_a_failure_on_the_baseline_too_a_known_gap():
    samples = _samples("new", "a/b/vi", [False, False]) + _samples("main", "a/b/vi", [False, True])
    assert build_rows(samples, ["new", "main"], {"a/b/vi": 0.67})[0].status == "known gap"


def test_report_names_skipped_samples_and_spend():
    text = render([], ["new"], 0.1234, skipped=3)
    assert "$0.123" in text and "3 samples skipped" in text


class _ScriptedModel(GenericFakeChatModel):
    """Answers from a script and records what the agent sent it."""

    seen: list[Any] = []
    extra_body: dict | None = None  # the middleware pins the OpenRouter session here

    def bind_tools(self, tools, **kwargs):
        type(self).seen.append([getattr(t, "name", None) or t.get("name") for t in tools])
        return self

    def _generate(self, messages, stop=None, run_manager=None, **kwargs):
        type(self).seen.append(messages)
        return super()._generate(messages, stop=stop, run_manager=run_manager, **kwargs)


async def test_a_sample_runs_through_the_production_agent(cases):
    from eval.regression import harness
    from eval.regression.blueprint import Compiled

    case = _case(cases, "handover/angry_late_order/en")
    script = iter([
        AIMessage(content="", tool_calls=[{"name": "apply_customer_tag", "args": {"name": "Angry"}, "id": "c1"}]),
        AIMessage(content="So sorry, I've passed this to our team."),
    ])
    _ScriptedModel.seen = []
    model = _ScriptedModel(messages=script)
    harness.install_stubs()
    # The shared graph's placeholder client needs a key to build (CI has none);
    # it is never called, the middleware swaps in the scripted model.
    get_shared_agent.cache_clear()
    try:
        with (
            patch.object(AppVars, "OPENROUTER_API_KEY", SecretStr("test-key")),
            patch("eccho_ai.llm.agents.middleware.build_chat_model", return_value=model),
        ):
            turn = await harness.run_sample(case, Compiled("KNOWLEDGE-MARKER", ""), "deepseek/x", "<agent>{general_knowledge}</agent>")
    finally:
        patch.stopall()
        get_shared_agent.cache_clear()
    assert turn.error is None
    assert turn.tool_calls == [("apply_customer_tag", {"name": "Angry"})]
    assert turn.reply == "So sorry, I've passed this to our team."
    assert run_rule("handoff", True, case, turn)[0]
    first_call = next(m for m in _ScriptedModel.seen if isinstance(m, list) and m and hasattr(m[0], "content"))
    system, *rest = first_call
    assert "KNOWLEDGE-MARKER" in system.content  # the arm's template, rendered by the app
    newest = rest[-1].content
    assert "<current_time>" in newest and "# Tag catalog" in newest and '"Angry"' in newest
    assert newest.endswith(case.message)
    # The fake API answered the tag like apps/api: a handoff tag hands over.
    tool_messages = [m for m in _ScriptedModel.seen[-1] if getattr(m, "type", "") == "tool"]
    assert '"triggeredHandoff": true' in tool_messages[0].content


def test_a_selector_that_matches_nothing_fails_the_run():
    from eval.regression.__main__ import main

    with pytest.raises(SystemExit, match="no case matches"):
        main(["--only", "booking/spa_slot", "--dry-run"])


async def test_fake_api_answers_every_client_call_the_tools_make():
    from eval.regression.harness import FakeApi

    assert await FakeApi().delete("/system/followups/1", params={"reason": "x"}) == {"ok": True}


def test_tag_name_drops_a_copied_emoji_like_apps_api():
    # #558: Gemini sent "Angry 🚨"; apps/api retries a miss without the emoji.
    from eval.regression.checks import tag_name

    assert tag_name("Angry 🚨") == "Angry"
    assert tag_name("🗓️ Lịch hẹn mới") == "Lịch hẹn mới"
    assert tag_name("Khiếu nại") == "Khiếu nại"


def test_a_reply_cut_off_at_max_tokens_is_reported_not_scored_as_empty():
    from eval.regression.harness import _turn_from

    cut = AIMessage(content="", response_metadata={"finish_reason": "length"})
    turn = _turn_from([cut])
    assert turn.error and "max_tokens" in turn.error
