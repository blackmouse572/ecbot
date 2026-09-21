"""Functional tests for POST /api/customer/classify (#176).

The endpoint:
- builds an LLM via build_chat_model and uses with_structured_output
- on any LLM error, returns AppResponse(data=ClassifyResponse()) — empty payload

We monkeypatch the build_chat_model binding inside `modules.customer.routers` so we
never reach a real provider.
"""
from __future__ import annotations

from typing import Any

import pytest

from eccho_ai.modules.customer import routers as customer_router_module
from eccho_ai.modules.customer.models import ClassifyResponse
from eccho_ai.core.variables import AppVars


# ---------- helpers ----------


class _FakeStructured:
    """Stand-in for `llm.with_structured_output(ClassifyResponse)`."""

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

    def with_structured_output(self, schema: type) -> _FakeStructured:
        # We accept the schema but ignore it — the fake returns whatever was set.
        assert schema is ClassifyResponse
        return self._structured


@pytest.fixture
def patch_llm(monkeypatch):
    """Patch build_chat_model in the router module."""

    def _apply(structured: _FakeStructured) -> _FakeStructured:
        fake_llm = _FakeLLM(structured)
        monkeypatch.setattr(
            customer_router_module, "build_chat_model", lambda *_a, **_kw: fake_llm
        )
        return structured

    return _apply


VALID_BODY = {
    "customer_id": "cust-1",
    "conversation_id": "conv-1",
    "recent_messages": [
        {"role": "user", "text": "hi", "ts": "2026-06-15T12:00:00Z"},
    ],
    "available_tags": [
        {"name": "VIP", "emoji": "⭐", "description": "Big spender"},
    ],
    "current_tags": [],
}


# ---------- happy path ----------


async def test_returns_mocked_llm_output(async_client, patch_llm):
    patch_llm(
        _FakeStructured(
            returns=ClassifyResponse(
                tags_to_add=["VIP"],
                tags_to_remove=[],
                profile_summary="A loyal returning buyer.",
            )
        )
    )

    resp = await async_client.post("/api/customer/classify", json=VALID_BODY)

    assert resp.status_code == 200
    body = resp.json()
    assert body["data"]["tags_to_add"] == ["VIP"]
    assert body["data"]["tags_to_remove"] == []
    assert body["data"]["profile_summary"] == "A loyal returning buyer."


async def test_endpoint_trims_added_tags_to_catalog(async_client, patch_llm):
    # The endpoint defends-in-depth: even if the LLM hallucinates a tag that
    # is not in `available_tags`, the response drops it.
    patch_llm(
        _FakeStructured(
            returns=ClassifyResponse(
                tags_to_add=["VIP", "HALLUCINATED"],
                tags_to_remove=[],
                profile_summary="x",
            )
        )
    )

    resp = await async_client.post("/api/customer/classify", json=VALID_BODY)

    assert resp.status_code == 200
    assert resp.json()["data"]["tags_to_add"] == ["VIP"]


async def test_endpoint_trims_removed_tags_to_current_set(async_client, patch_llm):
    body = {**VALID_BODY, "current_tags": ["VIP"]}
    patch_llm(
        _FakeStructured(
            returns=ClassifyResponse(
                tags_to_add=[],
                tags_to_remove=["VIP", "WAS_NEVER_APPLIED"],
                profile_summary="x",
            )
        )
    )

    resp = await async_client.post("/api/customer/classify", json=body)

    assert resp.status_code == 200
    assert resp.json()["data"]["tags_to_remove"] == ["VIP"]


# ---------- LLM failure path ----------


async def test_llm_raises_yields_empty_payload(async_client, patch_llm):
    patch_llm(_FakeStructured(raises=RuntimeError("provider on fire")))

    resp = await async_client.post("/api/customer/classify", json=VALID_BODY)

    # Endpoint must not crash the queue worker — gracefully degrade.
    assert resp.status_code == 200
    body = resp.json()
    assert body["data"]["tags_to_add"] == []
    assert body["data"]["tags_to_remove"] == []
    assert body["data"]["profile_summary"] == ""


async def test_llm_returns_unparseable_shape_yields_empty_payload(
    async_client, patch_llm
):
    # Provider returned something with_structured_output couldn't fully bind;
    # the router's `if not isinstance(...)` branch tries model_validate and on
    # failure returns the empty response.
    patch_llm(_FakeStructured(returns={"definitely": "not_a_classify_response"}))

    resp = await async_client.post("/api/customer/classify", json=VALID_BODY)

    assert resp.status_code == 200
    body = resp.json()
    assert body["data"]["tags_to_add"] == []
    assert body["data"]["tags_to_remove"] == []
    assert body["data"]["profile_summary"] == ""


# ---------- OpenRouter gateway routing ----------


async def test_classify_uses_classifier_model(async_client, monkeypatch):
    """The endpoint must route through build_chat_model using the
    shared OpenRouter classifier model/temperature — no `model_provider`."""
    captured: dict[str, Any] = {}

    class _Fake:
        def with_structured_output(self, _schema: type) -> "_Fake":
            return self

        async def ainvoke(self, *_a: Any, **_kw: Any) -> ClassifyResponse:
            return ClassifyResponse()

    def _fake_build(*, model_text_name: str, temperature: float, max_tokens=None) -> _Fake:
        captured["model_text_name"] = model_text_name
        captured["temperature"] = temperature
        return _Fake()

    monkeypatch.setattr(customer_router_module, "build_chat_model", _fake_build)

    resp = await async_client.post("/api/customer/classify", json=VALID_BODY)

    assert resp.status_code == 200
    assert captured["model_text_name"] == AppVars.CLASSIFIER_MODEL
    assert captured["temperature"] == AppVars.CUSTOMER_CLASSIFIER_TEMPERATURE


# ---------- request validation ----------


async def test_missing_required_field_returns_422(async_client, patch_llm):
    patch_llm(_FakeStructured(returns=ClassifyResponse()))

    resp = await async_client.post(
        "/api/customer/classify",
        json={"conversation_id": "conv-1"},  # missing customer_id
    )

    assert resp.status_code == 422
