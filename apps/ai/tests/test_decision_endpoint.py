from __future__ import annotations

from typing import Any

import pytest

from eccho_ai.core.variables import AppVars
from eccho_ai.modules.decision import routers as decision_router_module


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


async def test_answers_in_system_one_shape_with_the_configured_model(async_client, monkeypatch):
    monkeypatch.setattr(AppVars, "DECISION_MODEL", "~typesafe/jev-latest")
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

    monkeypatch.setattr(decision_router_module, "request_decisions", _request)

    resp = await async_client.post("/api/decision/system-one", json=BODY)

    assert resp.status_code == 200
    assert resp.json()["data"]["answers"] == {
        "business_type": {"type": "choice", "choice": "beauty", "confidence": 0.93},
        "goal__book_appointments": {"type": "noul", "noul": 0.88},
    }
    assert seen["payload"]["questions"] == BODY["questions"]


async def test_model_failure_returns_no_answers(async_client, monkeypatch):
    async def _request(_payload: dict[str, Any]) -> dict[str, Any]:
        raise RuntimeError("provider down")

    monkeypatch.setattr(decision_router_module, "request_decisions", _request)

    resp = await async_client.post("/api/decision/system-one", json=BODY)
    assert resp.status_code == 200
    assert resp.json()["data"]["answers"] == {}


async def test_no_questions_skips_the_model(async_client, monkeypatch):
    calls: list[Any] = []

    async def _request(payload: dict[str, Any]) -> dict[str, Any]:
        calls.append(payload)
        return {"answers": {}}

    monkeypatch.setattr(decision_router_module, "request_decisions", _request)

    resp = await async_client.post("/api/decision/system-one", json={"state": "x", "questions": {}})
    assert resp.status_code == 200
    assert resp.json()["data"]["answers"] == {}
    assert calls == []


async def test_rejects_a_choice_question_without_options(async_client):
    body = {"state": "x", "questions": {"q": {"type": "choice", "instructions": "?", "criteria": {"only": "one"}}}}
    resp = await async_client.post("/api/decision/system-one", json=body)
    assert resp.status_code == 422


async def test_rejects_text_questions(async_client):
    # Text extraction has its own endpoint; decisions models cannot write text.
    body = {"state": "x", "questions": {"q": {"type": "text", "instructions": "?"}}}
    resp = await async_client.post("/api/decision/system-one", json=body)
    assert resp.status_code == 422


async def test_question_id_that_is_a_pydantic_reserved_name_is_answered(async_client, monkeypatch):
    # The native API keys answers by our own ids, so a caller-supplied id that
    # collides with a pydantic reserved name is safe.
    async def _request(_payload: dict[str, Any]) -> dict[str, Any]:
        return {
            "answers": {
                "model_config": {"type": "choice", "choice": "beauty", "confidence": 0.9},
                "other": {"type": "noul", "noul": 0.4},
            }
        }

    monkeypatch.setattr(decision_router_module, "request_decisions", _request)

    body = {
        "state": "x",
        "questions": {
            "model_config": {
                "type": "choice",
                "instructions": "Which kind of business is it?",
                "criteria": {"beauty": "A beauty salon or spa", "restaurant": "A restaurant or café"},
            },
            "other": {"type": "noul", "instructions": "Should it do X?"},
        },
    }
    resp = await async_client.post("/api/decision/system-one", json=body)
    assert resp.status_code == 200
    assert resp.json()["data"]["answers"] == {
        "model_config": {"type": "choice", "choice": "beauty", "confidence": 0.9},
        "other": {"type": "noul", "noul": 0.4},
    }


async def test_missing_answer_omits_just_that_question(async_client, monkeypatch):
    # The provider left q1 out (e.g. it skipped the question). The rest of the
    # response is unaffected and still returns 200.
    async def _request(_payload: dict[str, Any]) -> dict[str, Any]:
        return {"answers": {"business_type": {"type": "choice", "choice": "beauty", "confidence": 0.93}}}

    monkeypatch.setattr(decision_router_module, "request_decisions", _request)

    resp = await async_client.post("/api/decision/system-one", json=BODY)
    assert resp.status_code == 200
    assert resp.json()["data"]["answers"] == {
        "business_type": {"type": "choice", "choice": "beauty", "confidence": 0.93},
    }


async def test_malformed_native_answer_omits_the_question_without_500(async_client, monkeypatch):
    async def _request(_payload: dict[str, Any]) -> dict[str, Any]:
        return {"answers": {"business_type": 42, "goal__book_appointments": {"type": "noul", "noul": 0.5}}}

    monkeypatch.setattr(decision_router_module, "request_decisions", _request)

    resp = await async_client.post("/api/decision/system-one", json=BODY)
    assert resp.status_code == 200
    assert resp.json()["data"]["answers"] == {
        "goal__book_appointments": {"type": "noul", "noul": 0.5},
    }


# #506: /decision/write drafts a short shop message from instructions and a
# state (a marketing offer), with WRITE_MODEL at a higher temperature
# so "Viết kiểu khác" gives a different text.
class _FakeWriter:
    def __init__(self, *, content: Any = None, raises: Exception | None = None):
        self._content = content
        self._raises = raises
        self.calls: list[Any] = []

    async def ainvoke(self, messages: Any) -> Any:
        self.calls.append(messages)
        if self._raises is not None:
            raise self._raises
        return type("Reply", (), {"content": self._content})()


@pytest.fixture
def patch_writer(monkeypatch):
    seen: dict[str, Any] = {}

    def _apply(writer: _FakeWriter) -> dict[str, Any]:
        def _build(*_a, **kw):
            seen["kwargs"] = kw
            return writer

        monkeypatch.setattr(decision_router_module, "build_chat_model", _build)
        seen["writer"] = writer
        return seen

    return _apply


WRITE_BODY = {
    "instructions": "Viết một tin nhắn ưu đãi ngắn cho khách hỏi giá chưa mua.",
    "state": "Shop: Lumi Skincare. Ưu đãi: giảm 10% đến 20/11.",
}


async def test_write_returns_the_drafted_text_and_what_it_spent(async_client, patch_writer):
    seen = patch_writer(_FakeWriter(content='  "Chào {name}, Lumi giảm 10% cho bạn đến 20/11 nha."  '))
    resp = await async_client.post("/api/decision/write", json=WRITE_BODY)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["text"] == "Chào {name}, Lumi giảm 10% cho bạn đến 20/11 nha."
    assert data["model"] == AppVars.WRITE_MODEL
    assert seen["kwargs"]["model_text_name"] == AppVars.WRITE_MODEL
    assert seen["kwargs"]["temperature"] > 0.5
    [messages] = seen["writer"].calls
    assert WRITE_BODY["instructions"] in messages[-1]["content"]
    assert WRITE_BODY["state"] in messages[-1]["content"]


async def test_write_caps_the_text(async_client, patch_writer):
    patch_writer(_FakeWriter(content="a" * 3000))
    resp = await async_client.post("/api/decision/write", json=WRITE_BODY)
    assert len(resp.json()["data"]["text"]) == 1000


async def test_write_failure_returns_an_empty_text(async_client, patch_writer):
    patch_writer(_FakeWriter(raises=RuntimeError("provider down")))
    resp = await async_client.post("/api/decision/write", json=WRITE_BODY)
    assert resp.status_code == 200
    assert resp.json()["data"]["text"] == ""


async def test_write_needs_instructions(async_client):
    resp = await async_client.post("/api/decision/write", json={"state": "x", "instructions": ""})
    assert resp.status_code == 422
