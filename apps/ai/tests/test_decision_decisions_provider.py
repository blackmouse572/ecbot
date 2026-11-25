"""#623: `system-one` always calls OpenRouter's native Decisions endpoint.

Any decisions model configured in `DECISION_MODEL` uses the same route, so
swapping Jev for another decisions model stays an environment change.
"""
from __future__ import annotations

from typing import Any

from eccho_ai.core.variables import AppVars
from eccho_ai.modules.decision import routers as decision_router_module
from eccho_ai.modules.decision.decisions import (
    answers_from_decisions,
    build_request,
    decisions_url,
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
    questions = {"business_type": _choice(), "goal": _noul(), "unasked": _noul()}

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


async def test_system_one_asks_the_native_endpoint_never_chat_completions(async_client, monkeypatch):
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
        raise AssertionError("decisions models must not use chat/completions")

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
    assert seen["payload"]["questions"] == BODY["questions"]


async def test_any_configured_decisions_model_takes_the_same_route(async_client, monkeypatch):
    # Not only `typesafe/*`: every OpenRouter decisions model uses /alpha/decisions.
    model = "google/gemini-decision-1"
    monkeypatch.setattr(AppVars, "DECISION_MODEL", model)
    seen: dict[str, Any] = {}

    async def _request(payload: dict[str, Any]) -> dict[str, Any]:
        seen["payload"] = payload
        return {"answers": {"business_type": {"type": "choice", "choice": "beauty", "confidence": 0.9}}}

    monkeypatch.setattr(decision_router_module, "request_decisions", _request)

    resp = await async_client.post("/api/decision/system-one", json=BODY)

    assert resp.status_code == 200
    assert seen["payload"]["model"] == model
    assert resp.json()["data"]["model"] == model


async def test_native_failure_still_answers_200_with_no_answers(async_client, monkeypatch):
    monkeypatch.setattr(AppVars, "DECISION_MODEL", JEV)

    async def _request(_payload: dict[str, Any]) -> dict[str, Any]:
        raise RuntimeError("provider down")

    monkeypatch.setattr(decision_router_module, "request_decisions", _request)

    resp = await async_client.post("/api/decision/system-one", json=BODY)

    assert resp.status_code == 200
    assert resp.json()["data"]["answers"] == {}


async def test_system_one_rejects_text_questions(async_client):
    resp = await async_client.post(
        "/api/decision/system-one",
        json={"state": "x", "questions": {"name": {"type": "text", "instructions": "?"}}},
    )
    assert resp.status_code == 422
