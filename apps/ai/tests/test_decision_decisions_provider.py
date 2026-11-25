"""#623: `system-one` always calls OpenRouter's native Decisions endpoint.

Any decisions model configured in `DECISION_MODEL` uses the same route, so
swapping Jev for another decisions model stays an environment change.
"""
from __future__ import annotations

import logging
from typing import Any

import httpx
import pytest
from pydantic import SecretStr

from eccho_ai.core.variables import AppVars
from eccho_ai.modules.decision import decisions as decisions_module
from eccho_ai.modules.decision import routers as decision_router_module
from eccho_ai.modules.decision.decisions import (
    answers_from_decisions,
    build_request,
    request_decisions,
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


class _Response:
    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict[str, Any]:
        return {"answers": {}, "usage": {"input_tokens": 1, "output_tokens": 0}}


class _Client:
    def __init__(self) -> None:
        self.calls: list[tuple[str, dict[str, Any], dict[str, str]]] = []

    async def post(self, url: str, *, json: dict[str, Any], headers: dict[str, str]) -> _Response:
        self.calls.append((url, json, headers))
        return _Response()


async def test_request_decisions_uses_the_configured_url(monkeypatch):
    # The Decisions API is not under the chat gateway's /v1 path, so a proxy
    # base must map to an explicit Decisions URL, not be guessed from it.
    client = _Client()
    monkeypatch.setattr(decisions_module, "_get_client", lambda: client)
    monkeypatch.setattr(AppVars, "OPENROUTER_API_KEY", SecretStr("sk-test"))
    monkeypatch.setattr(
        AppVars,
        "OPENROUTER_DECISIONS_URL",
        "https://gateway.example/openrouter/alpha/decisions",
    )

    await request_decisions({"model": JEV, "state": "x", "questions": {}})

    [url, body, headers] = client.calls[0]
    assert url == "https://gateway.example/openrouter/alpha/decisions"
    assert body == {"model": JEV, "state": "x", "questions": {}}
    assert headers == {"Authorization": "Bearer sk-test"}


class _PoolClient:
    is_closed = False

    def __init__(self) -> None:
        self.posts: list[tuple[str, dict[str, Any], dict[str, str]]] = []

    async def post(self, url: str, *, json: dict[str, Any], headers: dict[str, str]) -> _Response:
        self.posts.append((url, json, headers))
        return _Response()


async def test_request_decisions_reuses_one_client(monkeypatch):
    # The handoff check runs on the inbound path; a per-call client would pay a
    # new TCP/TLS handshake against a 5s budget.
    created: list[_PoolClient] = []

    def _factory(*_a: Any, **_k: Any) -> _PoolClient:
        client = _PoolClient()
        created.append(client)
        return client

    monkeypatch.setattr(decisions_module, "_client", None)
    monkeypatch.setattr(decisions_module.httpx, "AsyncClient", _factory)
    monkeypatch.setattr(AppVars, "OPENROUTER_API_KEY", SecretStr("sk-test"))

    await request_decisions({"model": JEV, "state": "x", "questions": {}})
    await request_decisions({"model": JEV, "state": "x", "questions": {}})

    assert len(created) == 1
    assert len(created[0].posts) == 2


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


def test_build_request_never_sends_text_questions():
    text = DecisionQuestion(type="text", instructions="What are the opening hours?")
    payload = build_request(JEV, "state", {"opening_hours": text, "goal": _noul()})

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
    questions = {"business_type": _choice(), "goal": _noul(), "unasked": _noul()}

    assert answers_from_decisions(response, questions) == {
        "goal": {"type": "noul", "noul": 0.4}
    }


def test_answers_from_decisions_drops_a_choice_not_in_criteria():
    # A provider answer outside the options would let apps/api branch on a
    # value the caller never offered.
    response = {"answers": {"business_type": {"type": "choice", "choice": "casino", "confidence": 0.9}}}
    assert answers_from_decisions(response, {"business_type": _choice()}) == {}


@pytest.mark.parametrize("confidence", [93, -0.1, 1.1, True, "0.9"])
def test_answers_from_decisions_drops_an_out_of_range_confidence(confidence):
    # 93 is a percentage, not a confidence in [0, 1]; HandoffIntentService
    # compares against a threshold without clamping.
    response = {"answers": {"business_type": {"type": "choice", "choice": "beauty", "confidence": confidence}}}
    assert answers_from_decisions(response, {"business_type": _choice()}) == {}


@pytest.mark.parametrize("noul", [1.2, -0.1, True, "0.9"])
def test_answers_from_decisions_drops_an_out_of_range_noul(noul):
    response = {"answers": {"goal": {"type": "noul", "noul": noul}}}
    assert answers_from_decisions(response, {"goal": _noul()}) == {}


def test_answers_from_decisions_accepts_the_probability_bounds():
    response = {
        "answers": {
            "business_type": {"type": "choice", "choice": "beauty", "confidence": 1},
            "goal": {"type": "noul", "noul": 0},
        }
    }
    questions = {"business_type": _choice(), "goal": _noul()}

    assert answers_from_decisions(response, questions) == {
        "business_type": {"type": "choice", "choice": "beauty", "confidence": 1.0},
        "goal": {"type": "noul", "noul": 0.0},
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


async def test_native_rejection_logs_the_provider_body(async_client, monkeypatch, caplog):
    # The 400/422 body says which question shape or model was rejected; only
    # the status line would leave the cause undiagnosable.
    monkeypatch.setattr(AppVars, "DECISION_MODEL", JEV)
    request = httpx.Request("POST", "https://openrouter.ai/api/alpha/decisions")
    response = httpx.Response(
        400,
        json={"error": {"message": "model not found", "code": 400}},
        request=request,
    )

    async def _request(_payload: dict[str, Any]) -> dict[str, Any]:
        raise httpx.HTTPStatusError("400 Bad Request", request=request, response=response)

    monkeypatch.setattr(decision_router_module, "request_decisions", _request)

    with caplog.at_level(logging.WARNING, logger="uvicorn.info"):
        resp = await async_client.post("/api/decision/system-one", json=BODY)

    assert resp.status_code == 200
    assert resp.json()["data"]["answers"] == {}
    assert "decision.system_one failed" in caplog.text
    assert "status=400" in caplog.text
    assert "model not found" in caplog.text


async def test_system_one_accepts_old_text_questions_and_drops_them(async_client, monkeypatch):
    # A deploy can land apps/ai before apps/api stops sending `text__*`.
    monkeypatch.setattr(AppVars, "DECISION_MODEL", JEV)
    seen: dict[str, Any] = {}

    async def _request(payload: dict[str, Any]) -> dict[str, Any]:
        seen["payload"] = payload
        return {"answers": {"business_type": {"type": "choice", "choice": "beauty", "confidence": 0.9}}}

    monkeypatch.setattr(decision_router_module, "request_decisions", _request)

    resp = await async_client.post(
        "/api/decision/system-one",
        json={
            "state": "x",
            "questions": {
                "business_type": {
                    "type": "choice",
                    "instructions": "Which kind of business is it?",
                    "criteria": {"beauty": "A beauty salon or spa", "restaurant": "A restaurant or café"},
                },
                "text__opening_hours": {"type": "text", "instructions": "What opening hours?"},
            },
        },
    )

    assert resp.status_code == 200
    assert resp.json()["data"]["answers"] == {
        "business_type": {"type": "choice", "choice": "beauty", "confidence": 0.9},
    }
    assert set(seen["payload"]["questions"]) == {"business_type"}


async def test_system_one_text_only_questions_skip_the_provider(async_client, monkeypatch):
    calls: list[Any] = []

    async def _request(payload: dict[str, Any]) -> dict[str, Any]:
        calls.append(payload)
        return {"answers": {}}

    monkeypatch.setattr(decision_router_module, "request_decisions", _request)

    resp = await async_client.post(
        "/api/decision/system-one",
        json={"state": "x", "questions": {"opening_hours": {"type": "text", "instructions": "?"}}},
    )

    assert resp.status_code == 200
    assert resp.json()["data"]["answers"] == {}
    assert calls == []
