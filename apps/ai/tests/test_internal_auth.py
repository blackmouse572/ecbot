"""Tests for `require_internal_token`, the shared-secret guard on every
apps/api -> apps/ai route (chat/customer/rag). `/health` stays open.

Builds its own client per test (rather than the shared `async_client` fixture)
so each test controls the request headers precisely, independent of any
default header the shared fixture may set for the rest of the suite.
"""
from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient
from pydantic import SecretStr

from eccho_ai.core.variables import AppVars
from eccho_ai.main import app

pytestmark = pytest.mark.asyncio

# Cheap, DB-free endpoint under the guarded chat router.
GUARDED_PATH = "/api/chat/chatbot-cache/test-chatbot"


async def test_unset_configured_token_fails_closed_with_503(monkeypatch):
    monkeypatch.setattr(AppVars, "API_INTERNAL_TOKEN", SecretStr(""))

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.delete(
            GUARDED_PATH, headers={"X-Internal-Token": "anything"}
        )

    assert resp.status_code == 503


async def test_missing_header_is_rejected_with_401(monkeypatch):
    monkeypatch.setattr(AppVars, "API_INTERNAL_TOKEN", SecretStr("correct-token"))

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.delete(GUARDED_PATH)

    assert resp.status_code == 401


async def test_wrong_token_is_rejected_with_401(monkeypatch):
    monkeypatch.setattr(AppVars, "API_INTERNAL_TOKEN", SecretStr("correct-token"))

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.delete(
            GUARDED_PATH, headers={"X-Internal-Token": "wrong-token"}
        )

    assert resp.status_code == 401


async def test_correct_token_passes_auth(monkeypatch):
    monkeypatch.setattr(AppVars, "API_INTERNAL_TOKEN", SecretStr("correct-token"))

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.delete(
            GUARDED_PATH, headers={"X-Internal-Token": "correct-token"}
        )

    assert resp.status_code == 200
    assert resp.json()["data"] == {"invalidated": False}


async def test_health_stays_open_without_a_token(monkeypatch):
    monkeypatch.setattr(AppVars, "API_INTERNAL_TOKEN", SecretStr("correct-token"))

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/health")

    assert resp.status_code != 401


def test_boot_check_logs_an_error_when_token_is_unset(monkeypatch):
    from eccho_ai.core import security

    errors: list[str] = []
    monkeypatch.setattr(AppVars, "API_INTERNAL_TOKEN", SecretStr(""))
    monkeypatch.setattr(
        security.logger, "error", lambda event, **_: errors.append(event)
    )

    security.log_if_internal_token_missing()

    assert errors == ["internal_token_not_configured"]


def test_boot_check_is_silent_when_token_is_set(monkeypatch):
    from eccho_ai.core import security

    errors: list[str] = []
    monkeypatch.setattr(AppVars, "API_INTERNAL_TOKEN", SecretStr("set"))
    monkeypatch.setattr(
        security.logger, "error", lambda event, **_: errors.append(event)
    )

    security.log_if_internal_token_missing()

    assert errors == []
