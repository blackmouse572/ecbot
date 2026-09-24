from __future__ import annotations

from typing import Any

import pytest

from eccho_ai.core.variables import AppVars
from eccho_ai.modules.decision import routers as decision_router_module


class _FakeStructured:
    def __init__(self, *, returns: Any = None, raises: Exception | None = None):
        self._returns = returns
        self._raises = raises
        self.calls: list[Any] = []

    async def ainvoke(self, messages: Any) -> Any:
        self.calls.append(messages)
        if self._raises is not None:
            raise self._raises
        return self._returns


class _FakeLLM:
    def __init__(self, structured: _FakeStructured) -> None:
        self._structured = structured
        self.schema: type | None = None

    def with_structured_output(self, schema: type) -> _FakeStructured:
        self.schema = schema
        return self._structured


@pytest.fixture
def patch_llm(monkeypatch):
    seen: dict[str, Any] = {}

    def _apply(structured: _FakeStructured) -> dict[str, Any]:
        fake = _FakeLLM(structured)

        def _build(*_a, **kw):
            seen["kwargs"] = kw
            return fake

        monkeypatch.setattr(decision_router_module, "build_chat_model", _build)
        seen["llm"] = fake
        return seen

    return _apply


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


async def test_answers_in_system_one_shape_with_the_configured_model(async_client, patch_llm):
    seen = patch_llm(_FakeStructured(returns={
        "business_type": {"choice": "beauty", "confidence": 0.93},
        "goal__book_appointments": 0.88,
    }))
    resp = await async_client.post("/api/decision/system-one", json=BODY)
    assert resp.status_code == 200
    assert resp.json()["data"]["answers"] == {
        "business_type": {"type": "choice", "choice": "beauty", "confidence": 0.93},
        "goal__book_appointments": {"type": "noul", "noul": 0.88},
    }
    assert seen["kwargs"]["model_text_name"] == AppVars.DECISION_MODEL


async def test_output_schema_limits_choices_and_ranges(async_client, patch_llm):
    seen = patch_llm(_FakeStructured(returns={}))
    await async_client.post("/api/decision/system-one", json=BODY)
    schema = seen["llm"].schema
    ok = schema.model_validate({"business_type": {"choice": "beauty", "confidence": 0.5}, "goal__book_appointments": 0.2})
    assert ok is not None
    with pytest.raises(Exception):
        schema.model_validate({"business_type": {"choice": "casino", "confidence": 0.5}, "goal__book_appointments": 0.2})
    with pytest.raises(Exception):
        schema.model_validate({"business_type": {"choice": "beauty", "confidence": 1.5}, "goal__book_appointments": 0.2})


async def test_model_failure_returns_no_answers(async_client, patch_llm):
    patch_llm(_FakeStructured(raises=RuntimeError("provider down")))
    resp = await async_client.post("/api/decision/system-one", json=BODY)
    assert resp.status_code == 200
    assert resp.json()["data"]["answers"] == {}


async def test_no_questions_skips_the_model(async_client, patch_llm):
    seen = patch_llm(_FakeStructured(returns={}))
    resp = await async_client.post("/api/decision/system-one", json={"state": "x", "questions": {}})
    assert resp.status_code == 200
    assert resp.json()["data"]["answers"] == {}
    assert "kwargs" not in seen


async def test_rejects_a_choice_question_without_options(async_client):
    body = {"state": "x", "questions": {"q": {"type": "choice", "instructions": "?", "criteria": {"only": "one"}}}}
    resp = await async_client.post("/api/decision/system-one", json=body)
    assert resp.status_code == 422
