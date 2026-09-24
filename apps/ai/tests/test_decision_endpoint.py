from __future__ import annotations

from typing import Any

import pytest
from fastapi import HTTPException

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


# Output-model fields are positional (q0, q1, ...) in question order, not the
# question ids themselves, so a question id that collides with a pydantic
# reserved name (e.g. "model_config") can never break the dynamic schema.
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
        "q0": {"choice": "beauty", "confidence": 0.93},
        "q1": 0.88,
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
    ok = schema.model_validate({"q0": {"choice": "beauty", "confidence": 0.5}, "q1": 0.2})
    assert ok is not None
    with pytest.raises(Exception):
        schema.model_validate({"q0": {"choice": "casino", "confidence": 0.5}, "q1": 0.2})
    with pytest.raises(Exception):
        schema.model_validate({"q0": {"choice": "beauty", "confidence": 1.5}, "q1": 0.2})


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


async def test_build_chat_model_failure_returns_no_answers(async_client, monkeypatch):
    # build_chat_model itself can raise (e.g. HTTPException(400) when
    # OPENROUTER_API_KEY is missing) before with_structured_output is even
    # called. That must still degrade to HTTP 200 with empty answers, not
    # bubble up as a 400 through main.py's global exception handlers.
    def _raise(*_a, **_kw):
        raise HTTPException(status_code=400, detail="OPENROUTER_API_KEY is not configured.")

    monkeypatch.setattr(decision_router_module, "build_chat_model", _raise)

    resp = await async_client.post("/api/decision/system-one", json=BODY)
    assert resp.status_code == 200
    assert resp.json()["data"]["answers"] == {}


async def test_question_id_that_is_a_pydantic_reserved_name_is_answered_by_position(async_client, patch_llm):
    # "model_config" would collide with pydantic's own reserved attribute if
    # used directly as a field name on the dynamically created answer model.
    # Field names are positional (q0, q1, ...) precisely to avoid this.
    seen = patch_llm(_FakeStructured(returns={
        "q0": {"choice": "beauty", "confidence": 0.9},
        "q1": 0.4,
    }))
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
    schema = seen["llm"].schema
    assert set(schema.model_fields.keys()) == {"q0", "q1"}


async def test_missing_field_in_result_omits_just_that_question(async_client, patch_llm):
    # The result is missing q1 entirely (e.g. the model skipped it). That one
    # question is omitted from the answers; the rest of the response is
    # unaffected and still returns 200.
    patch_llm(_FakeStructured(returns={"q0": {"choice": "beauty", "confidence": 0.93}}))
    resp = await async_client.post("/api/decision/system-one", json=BODY)
    assert resp.status_code == 200
    assert resp.json()["data"]["answers"] == {
        "business_type": {"type": "choice", "choice": "beauty", "confidence": 0.93},
    }


async def test_malformed_choice_value_falls_back_to_empty_answers_without_500(async_client, patch_llm):
    # A malformed choice value (not dict-like) breaks the answer-assembly
    # loop itself, not just structured.ainvoke(). Because assembly now runs
    # inside the same try/except as the model call, the whole response
    # degrades to empty answers with HTTP 200 rather than a 500.
    patch_llm(_FakeStructured(returns={"q0": 42, "q1": 0.5}))
    resp = await async_client.post("/api/decision/system-one", json=BODY)
    assert resp.status_code == 200
    assert resp.json()["data"]["answers"] == {}
