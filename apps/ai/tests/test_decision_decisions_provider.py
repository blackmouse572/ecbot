"""#623: Jev is a decisions model, so it must not be sent to chat/completions.

The native Decisions endpoint answers `choice`/`noul` with the same shapes the
router already returns; `text` is answered by a chat model because decisions
models cannot write prose.
"""
from __future__ import annotations

from typing import Any

import pytest

from eccho_ai.core.variables import AppVars
from eccho_ai.modules.decision import routers as decision_router_module
from eccho_ai.modules.decision.decisions import (
    answers_from_decisions,
    build_request,
    decisions_url,
    is_decisions_model,
    usage_from_decisions,
)
from eccho_ai.modules.decision.models import DecisionQuestion

JEV = "~typesafe/jev-latest"


def _choice() -> DecisionQuestion:
    return DecisionQuestion(
        type="choice",
        instructions="Which kind of business is it?",
        criteria={"beauty": "A beauty salon or spa", "restaurant": "A restaurant or café"},
    )


def _noul() -> DecisionQuestion:
    return DecisionQuestion(type="noul", instructions="Should it book appointments?")


def _text() -> DecisionQuestion:
    return DecisionQuestion(type="text", instructions="What are the opening hours?")


def test_typesafe_models_take_the_native_path():
    assert is_decisions_model(JEV)
    assert is_decisions_model("typesafe/jev-1.14")
    assert not is_decisions_model("google/gemini-2.5-flash")


def test_decisions_url_moves_off_the_chat_gateway():
    # The chat gateway base is .../api/v1; the Decisions route is .../api/alpha.
    assert (
        decisions_url("https://openrouter.ai/api/v1")
        == "https://openrouter.ai/api/alpha/decisions"
    )


def test_builds_a_native_request_for_choice_and_noul():
    payload = build_request(JEV, "state", {"business_type": _choice(), "goal": _noul()})

    assert payload == {
        "model": JEV,
        "state": "state",
        "questions": {
            "business_type": {
                "type": "choice",
                "instructions": "Which kind of business is it?",
                "criteria": {"beauty": "A beauty salon or spa", "restaurant": "A restaurant or café"},
            },
            "goal": {"type": "noul", "instructions": "Should it book appointments?"},
        },
    }


def test_build_request_leaves_out_text_questions():
    # There is no text primitive on the Decisions API.
    payload = build_request(JEV, "state", {"opening_hours": _text(), "goal": _noul()})

    assert set(payload["questions"]) == {"goal"}


def test_parses_answers_into_the_system_one_shape():
    response = {
        "answers": {
            "business_type": {
                "type": "choice",
                "choice": "beauty",
                "confidence": 0.93,
                "probabilities": {"beauty": 0.93, "restaurant": 0.07},
            },
            "goal": {"type": "noul", "noul": 0.88},
        },
        "usage": {"input_tokens": 476, "output_tokens": 70, "cost": 0.00002},
    }
    questions = {"business_type": _choice(), "goal": _noul()}

    assert answers_from_decisions(response, questions) == {
        "business_type": {"type": "choice", "choice": "beauty", "confidence": 0.93},
        "goal": {"type": "noul", "noul": 0.88},
    }


def test_answers_from_decisions_skips_refusals_and_missing_answers():
    response = {
        "answers": {
            "business_type": {"type": "refusal", "reason": "not answerable"},
            "goal": {"type": "noul", "noul": 0.4},
        }
    }
    questions = {"business_type": _choice(), "goal": _noul(), "opening_hours": _text()}

    assert answers_from_decisions(response, questions) == {
        "goal": {"type": "noul", "noul": 0.4}
    }


def test_usage_from_decisions_is_reported_like_a_chat_call():
    usage = usage_from_decisions({"usage": {"input_tokens": 476, "output_tokens": 70}})
    assert usage is not None
    assert usage.model_dump() == {
        "input_tokens": 476,
        "output_tokens": 70,
        "total_tokens": 546,
        "cache_read_tokens": 0,
        "cache_write_tokens": 0,
    }


class _FakeStructured:
    def __init__(self, returns: Any) -> None:
        self._returns = returns
        self.calls: list[Any] = []

    async def ainvoke(self, messages: Any) -> Any:
        self.calls.append(messages)
        return self._returns


class _FakeLLM:
    def __init__(self, structured: _FakeStructured) -> None:
        self._structured = structured
        self.schema: type | None = None

    def with_structured_output(self, schema: type) -> _FakeStructured:
        self.schema = schema
        return self._structured


BODY = {
    "state": "Nail spa in Da Nang. Customers ask prices and want to book.",
    "questions": {
        "business_type": {
            "type": "choice",
            "instructions": "Which kind of business is it?",
            "criteria": {"beauty": "A beauty salon or spa", "restaurant": "A restaurant or café"},
        },
        "goal__book_appointments": {"type": "noul", "instructions": "Should it book appointments?"},
    },
}

TEXT_BODY = {
    "state": "Quán cà phê Mây ở Đà Nẵng, mở cửa 7h đến 22h.",
    "questions": {"opening_hours": {"type": "text", "instructions": "What opening hours does it give?"}},
}


async def test_jev_asks_the_native_endpoint_never_chat_completions(async_client, monkeypatch):
    monkeypatch.setattr(AppVars, "DECISION_MODEL", JEV)
    seen: dict[str, Any] = {}

    async def _request(payload: dict[str, Any]) -> dict[str, Any]:
        seen["payload"] = payload
        return {
            "answers": {
                "business_type": {"type": "choice", "choice": "beauty", "confidence": 0.93},
                "goal__book_appointments": {"type": "noul", "noul": 0.88},
            },
            "usage": {"input_tokens": 476, "output_tokens": 70},
        }

    def _chat_must_not_run(*_a, **_kw):
        raise AssertionError("a decisions model must not use chat/completions")

    monkeypatch.setattr(decision_router_module, "request_decisions", _request)
    monkeypatch.setattr(decision_router_module, "build_chat_model", _chat_must_not_run)

    resp = await async_client.post("/api/decision/system-one", json=BODY)

    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["answers"] == {
        "business_type": {"type": "choice", "choice": "beauty", "confidence": 0.93},
        "goal__book_appointments": {"type": "noul", "noul": 0.88},
    }
    assert data["model"] == JEV
    assert data["usage"]["total_tokens"] == 546
    assert seen["payload"]["model"] == JEV
    assert seen["payload"]["state"] == BODY["state"]
    assert seen["payload"]["questions"] == {
        "business_type": BODY["questions"]["business_type"],
        "goal__book_appointments": BODY["questions"]["goal__book_appointments"],
    }


async def test_text_questions_use_the_text_model_for_a_decisions_model(async_client, monkeypatch):
    monkeypatch.setattr(AppVars, "DECISION_MODEL", JEV)
    monkeypatch.setattr(AppVars, "DECISION_TEXT_MODEL", "google/gemini-2.5-flash")
    structured = _FakeStructured(returns={"q0": "7h đến 22h"})
    llm = _FakeLLM(structured)
    seen: dict[str, Any] = {}

    async def _request(payload: dict[str, Any]) -> dict[str, Any]:
        seen["payload"] = payload
        return {
            "answers": {"goal__book_appointments": {"type": "noul", "noul": 0.0}},
            "usage": {"input_tokens": 1, "output_tokens": 0},
        }

    def _build(*_a, **kw):
        seen["chat"] = kw
        return llm

    monkeypatch.setattr(decision_router_module, "request_decisions", _request)
    monkeypatch.setattr(decision_router_module, "build_chat_model", _build)

    resp = await async_client.post(
        "/api/decision/system-one",
        json={
            "state": TEXT_BODY["state"],
            "questions": {
                "opening_hours": {"type": "text", "instructions": "What opening hours does it give?"},
                "goal__book_appointments": {"type": "noul", "instructions": "Should it book appointments?"},
            },
        },
    )

    data = resp.json()["data"]
    assert data["answers"] == {
        "opening_hours": {"type": "text", "text": "7h đến 22h"},
        "goal__book_appointments": {"type": "noul", "noul": 0.0},
    }
    # Only the noul went to the native endpoint; the text stayed on chat.
    assert set(seen["payload"]["questions"]) == {"goal__book_appointments"}
    assert seen["chat"]["model_text_name"] == "google/gemini-2.5-flash"
    assert set(llm.schema.model_fields) == {"q0"}


async def test_native_failure_still_answers_200_with_no_answers(async_client, monkeypatch):
    monkeypatch.setattr(AppVars, "DECISION_MODEL", JEV)

    async def _request(_payload: dict[str, Any]) -> dict[str, Any]:
        raise RuntimeError("provider down")

    monkeypatch.setattr(decision_router_module, "request_decisions", _request)

    resp = await async_client.post("/api/decision/system-one", json=BODY)

    assert resp.status_code == 200
    assert resp.json()["data"]["answers"] == {}
