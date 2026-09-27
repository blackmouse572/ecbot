"""Functional tests for the agent's customer-aware system tools (#174).

We patch:
  - `_get_customer_id` to inject the runtime customer id (the production helper
    reads from `langgraph.runtime.get_runtime`, which has no context outside an
    actual agent run);
  - `ApiClient.get_instance` so write tools call a stub instead of HTTP.
"""
from __future__ import annotations

from unittest.mock import AsyncMock

import pytest

from eccho_ai.llm.tools import system_tools as system_tools_module
from eccho_ai.llm.tools.system_tools import (
    SYSTEM_TOOLS,
    apply_customer_tag,
    cancel_followup,
    get_customer_field,
    list_customer_fields,
    list_pending_followups,
    remove_customer_tag,
    schedule_followup,
    set_customer_field,
    update_customer_profile,
)


def test_six_customer_tools_are_registered_subset_of_system_tools():
    names = {t.name for t in SYSTEM_TOOLS}
    assert {
        "get_customer_field",
        "list_customer_fields",
        "set_customer_field",
        "update_customer_profile",
        "apply_customer_tag",
        "remove_customer_tag",
    } <= names


# ─── No-context behaviour ────────────────────────────────────────────────────


async def test_get_customer_field_returns_none_when_no_context(monkeypatch):
    monkeypatch.setattr(system_tools_module, "_get_customer_id", lambda: None)
    result = await get_customer_field.ainvoke({"key": "anything"})
    assert result is None


async def test_list_customer_fields_returns_empty_list_when_no_context(monkeypatch):
    monkeypatch.setattr(system_tools_module, "_get_customer_id", lambda: None)
    result = await list_customer_fields.ainvoke({})
    assert result == []


async def test_set_customer_field_errors_when_no_context(monkeypatch):
    monkeypatch.setattr(system_tools_module, "_get_customer_id", lambda: None)
    result = await set_customer_field.ainvoke({"key": "phone", "value": "0901"})
    assert result == {"error": "no customer context"}


async def test_update_customer_profile_errors_when_no_context(monkeypatch):
    monkeypatch.setattr(system_tools_module, "_get_customer_id", lambda: None)
    result = await update_customer_profile.ainvoke({"phone": "0901"})
    assert result == {"error": "no customer context"}


async def test_apply_customer_tag_errors_when_no_context(monkeypatch):
    monkeypatch.setattr(system_tools_module, "_get_customer_id", lambda: None)
    result = await apply_customer_tag.ainvoke({"name": "VIP"})
    assert result == {"error": "no customer context"}


async def test_remove_customer_tag_errors_when_no_context(monkeypatch):
    monkeypatch.setattr(system_tools_module, "_get_customer_id", lambda: None)
    result = await remove_customer_tag.ainvoke({"name": "VIP"})
    assert result == {"error": "no customer context"}


# ─── Write-tool routing through ApiClient ────────────────────────────────────


def _patch_runtime(monkeypatch, *, customer_id: str | None, session_id: str | None = None):
    monkeypatch.setattr(
        system_tools_module, "_get_customer_id", lambda: customer_id
    )
    monkeypatch.setattr(
        system_tools_module, "_get_session_id", lambda: session_id
    )


def _stub_api_client(monkeypatch, *, response):
    """Replace ApiClient.get_instance with a stub whose .post records the call."""
    calls: list[tuple[str, dict]] = []

    class _Stub:
        async def post(self, path: str, json: dict):
            calls.append((path, json))
            return response

    monkeypatch.setattr(
        system_tools_module.ApiClient, "get_instance", staticmethod(lambda: _Stub())
    )
    return calls


async def test_set_customer_field_posts_to_apps_api_with_key_and_value(monkeypatch):
    _patch_runtime(monkeypatch, customer_id="cust-1")
    calls = _stub_api_client(monkeypatch, response={"ok": True})

    result = await set_customer_field.ainvoke(
        {"key": "favourite_drink", "value": "cà phê sữa đá"}
    )

    assert result == {"ok": True}
    assert calls == [
        (
            "/system/customers/cust-1/fields",
            {"key": "favourite_drink", "value": "cà phê sữa đá"},
        )
    ]


async def test_apply_customer_tag_posts_with_tag_name_and_conversation_id(monkeypatch):
    _patch_runtime(monkeypatch, customer_id="cust-1", session_id="conv-1")
    calls = _stub_api_client(
        monkeypatch, response={"ok": True, "triggeredHandoff": True}
    )

    result = await apply_customer_tag.ainvoke({"name": "Needs human"})

    assert result == {"ok": True, "triggeredHandoff": True}
    assert calls == [
        (
            "/system/customers/cust-1/tags/apply",
            {"tagName": "Needs human", "conversationId": "conv-1"},
        )
    ]


async def test_apply_customer_tag_omits_conversation_id_when_session_missing(monkeypatch):
    # When LangGraph doesn't expose a thread_id, the tool still applies the tag
    # but the API will skip handoff (and log a warning).
    _patch_runtime(monkeypatch, customer_id="cust-1", session_id=None)
    calls = _stub_api_client(
        monkeypatch, response={"ok": True, "triggeredHandoff": False}
    )

    await apply_customer_tag.ainvoke({"name": "VIP"})

    path, body = calls[0]
    assert path == "/system/customers/cust-1/tags/apply"
    assert body == {"tagName": "VIP"}


# ─── Followup tools (#140) ───────────────────────────────────────────────────


def _patch_followup_ctx(monkeypatch, ctx):
    monkeypatch.setattr(system_tools_module, "_get_followup_context", lambda: ctx)


def _stub_api_client_all(monkeypatch, *, post=None, get=None, delete=None):
    calls: dict[str, list] = {"post": [], "get": [], "delete": []}

    class _Stub:
        async def post(self, path, json):
            calls["post"].append((path, json))
            return post
        async def get(self, path, params=None):
            calls["get"].append((path, params))
            return get
        async def delete(self, path, params=None):
            calls["delete"].append((path, params))
            return delete

    monkeypatch.setattr(
        system_tools_module.ApiClient, "get_instance", staticmethod(lambda: _Stub())
    )
    return calls


def test_ten_system_tools_registered():
    assert len(SYSTEM_TOOLS) == 10
    names = {t.name for t in SYSTEM_TOOLS}
    assert {"schedule_followup", "list_pending_followups", "cancel_followup", "send_image"} <= names


async def test_schedule_followup_no_context_returns_error(monkeypatch):
    _patch_followup_ctx(monkeypatch, None)
    result = await schedule_followup.ainvoke(
        {"delay_minutes": 30, "prompt": "check payment", "reason": "payment_check"}
    )
    assert result == {"error": "no conversation context"}


async def test_schedule_followup_posts_full_payload(monkeypatch):
    _patch_followup_ctx(monkeypatch, {
        "conversation_id": "conv-1", "chatbot_id": "cb-1", "user_id": "psid-1",
        "provider_id": "acc-1", "customer_id": "cust-1", "contact_point_id": "cp-1",
    })
    calls = _stub_api_client_all(monkeypatch, post={"followupId": "f-1"})
    result = await schedule_followup.ainvoke(
        {"delay_minutes": 30, "prompt": "check payment", "reason": "payment_check"}
    )
    assert result == {"followupId": "f-1"}
    path, body = calls["post"][0]
    assert path == "/system/followups"
    assert body == {
        "conversationId": "conv-1", "chatbotId": "cb-1", "userId": "psid-1",
        "providerId": "acc-1", "customerId": "cust-1", "contactPointId": "cp-1",
        "delayMinutes": 30, "prompt": "check payment", "reason": "payment_check",
        "triggerMessageId": None,
    }


async def test_schedule_followup_includes_trigger_message_id(monkeypatch):
    _patch_followup_ctx(monkeypatch, {
        "conversation_id": "conv-1", "chatbot_id": "cb-1", "user_id": "psid-1",
        "provider_id": "acc-1", "customer_id": "cust-1", "contact_point_id": "cp-1",
        "trigger_message_id": "msg-9",
    })
    calls = _stub_api_client_all(monkeypatch, post={"followupId": "f-1"})
    await schedule_followup.ainvoke(
        {"delay_minutes": 30, "prompt": "check payment", "reason": "payment_check"}
    )
    _, body = calls["post"][0]
    assert body["triggerMessageId"] == "msg-9"


async def test_schedule_followup_trigger_message_id_null_when_absent(monkeypatch):
    _patch_followup_ctx(monkeypatch, {
        "conversation_id": "conv-1", "chatbot_id": "cb-1", "user_id": "psid-1",
        "provider_id": "acc-1", "customer_id": None, "contact_point_id": None,
        "trigger_message_id": None,
    })
    calls = _stub_api_client_all(monkeypatch, post={"followupId": "f-1"})
    await schedule_followup.ainvoke(
        {"delay_minutes": 5, "prompt": "x", "reason": "r"}
    )
    _, body = calls["post"][0]
    assert body["triggerMessageId"] is None


async def test_list_pending_followups_maps_fields(monkeypatch):
    _patch_followup_ctx(monkeypatch, {"conversation_id": "conv-1"})
    _stub_api_client_all(monkeypatch, get=[
        {"followupId": "f-1", "reason": "payment_check", "firesInMinutes": 20}
    ])
    result = await list_pending_followups.ainvoke({})
    assert result == [
        {"followup_id": "f-1", "reason": "payment_check", "fires_in_minutes": 20}
    ]


async def test_cancel_followup_deletes(monkeypatch):
    _patch_followup_ctx(monkeypatch, {"conversation_id": "conv-1"})
    calls = _stub_api_client_all(monkeypatch, delete={"cancelled": True})
    result = await cancel_followup.ainvoke({"followup_id": "f-1"})
    assert result == {"cancelled": True}
    assert calls["delete"] == [
        ("/system/followups/f-1", {"conversationId": "conv-1"})
    ]


async def test_cancel_followup_no_context_returns_error(monkeypatch):
    _patch_followup_ctx(monkeypatch, None)
    result = await cancel_followup.ainvoke({"followup_id": "f-1"})
    assert result == {"error": "no conversation context"}


async def test_cancel_followup_no_conversation_id_returns_error(monkeypatch):
    _patch_followup_ctx(monkeypatch, {"conversation_id": None})
    result = await cancel_followup.ainvoke({"followup_id": "f-1"})
    assert result == {"error": "no conversation context"}
