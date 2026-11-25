"""#623: text fields moved out of `system-one` into `/decision/extract`.

The Decisions API has no text primitive, so extraction runs on a chat model
(`EXTRACT_MODEL`) and keeps the same fallback: a failure answers 200 with no
answers.
"""
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
def patch_extract(monkeypatch):
    seen: dict[str, Any] = {}

    def _apply(structured: _FakeStructured) -> dict[str, Any]:
        fake = _FakeLLM(structured)

        def _build(*_a, **kw):
            seen["kwargs"] = kw
            return fake

        monkeypatch.setattr(decision_router_module, "build_chat_model", _build)
        seen["llm"] = fake
        seen["structured"] = structured
        return seen

    return _apply


BODY = {
    "state": "Quán cà phê Mây ở Đà Nẵng, mở cửa 7h đến 22h. Ship toàn quốc.",
    "fields": {
        "business_name": "What is the business called?",
        "opening_hours": "Which opening hours does the owner give?",
        "delivery": "What does the owner say about delivery?",
    },
}


async def test_extract_answers_each_field_with_the_extract_model(async_client, patch_extract):
    seen = patch_extract(_FakeStructured(returns={"q0": "Mây", "q1": "7h đến 22h", "q2": "toàn quốc"}))
    resp = await async_client.post("/api/decision/extract", json=BODY)

    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["answers"] == {
        "business_name": "Mây",
        "opening_hours": "7h đến 22h",
        "delivery": "toàn quốc",
    }
    assert data["model"] == AppVars.EXTRACT_MODEL
    assert data["failed"] is False
    assert seen["kwargs"]["model_text_name"] == AppVars.EXTRACT_MODEL
    assert seen["kwargs"]["temperature"] == 0.0
    [messages] = seen["structured"].calls
    assert BODY["state"] in messages[-1]["content"]
    assert "business_name" in messages[-1]["content"]


async def test_extract_output_schema_is_optional_and_capped(async_client, patch_extract):
    seen = patch_extract(_FakeStructured(returns={}))
    await async_client.post("/api/decision/extract", json=BODY)

    schema = seen["llm"].schema
    assert schema.model_validate({}).model_dump() == {"q0": "", "q1": "", "q2": ""}
    with pytest.raises(Exception):
        schema.model_validate({"q0": "x" * 1001, "q1": "", "q2": ""})


async def test_extract_missing_field_does_not_void_the_others(async_client, patch_extract):
    patch_extract(_FakeStructured(returns={"q0": "Mây", "q2": ""}))
    resp = await async_client.post("/api/decision/extract", json=BODY)

    assert resp.json()["data"]["answers"] == {"business_name": "Mây", "delivery": ""}


async def test_extract_failure_returns_no_answers(async_client, patch_extract):
    patch_extract(_FakeStructured(raises=RuntimeError("provider down")))
    resp = await async_client.post("/api/decision/extract", json=BODY)

    assert resp.status_code == 200
    assert resp.json()["data"]["answers"] == {}
    assert resp.json()["data"]["failed"] is True


async def test_extract_needs_a_field(async_client):
    resp = await async_client.post("/api/decision/extract", json={"state": "x", "fields": {}})
    assert resp.status_code == 422
