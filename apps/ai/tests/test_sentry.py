"""Sentry error tracking, gated on SENTRY_DSN (#87)."""
from __future__ import annotations

import pytest
import sentry_sdk
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sentry_sdk.transport import Transport

from eccho_ai.core.sentry import init_sentry
from eccho_ai.core.variables import AppVars
from eccho_ai.middlewares.app_middleware import RequestLogicMiddleware
from eccho_ai.modules.chat.stream_pipeline import events_to_ui_parts

FAKE_DSN = "https://public@sentry.example.com/1"


class _CaptureTransport(Transport):
    def __init__(self, options=None):
        super().__init__(options)
        self.events: list[dict] = []

    def capture_envelope(self, envelope):
        for item in envelope.items:
            if item.type == "event":
                self.events.append(item.payload.json)


@pytest.fixture
def sentry_events(monkeypatch):
    monkeypatch.setattr(AppVars, "SENTRY_DSN", FAKE_DSN)
    transport = _CaptureTransport()
    assert init_sentry(transport=transport) is True
    yield transport.events
    sentry_sdk.get_client().close()
    sentry_sdk.init()  # back to a disabled client for the other tests


def test_does_nothing_without_a_dsn(monkeypatch):
    monkeypatch.setattr(AppVars, "SENTRY_DSN", "")

    assert init_sentry() is False
    assert not sentry_sdk.get_client().is_active()


def test_tags_events_with_the_service_and_environment(sentry_events):
    sentry_sdk.capture_message("boom")

    assert sentry_events[0]["tags"]["service"] == "ai"
    assert sentry_events[0]["environment"] == AppVars.ENV


def test_tags_events_with_the_request_id_from_apps_api(sentry_events):
    app = FastAPI()
    app.add_middleware(RequestLogicMiddleware)

    @app.get("/report")
    async def report():
        sentry_sdk.capture_message("inside a request")
        return {}

    TestClient(app).get("/report", headers={"X-Request-ID": "conv-1"})

    assert sentry_events[0]["tags"]["request_id"] == "conv-1"


@pytest.mark.asyncio
async def test_reports_a_failed_chat_stream(sentry_events):
    async def failing_events():
        raise RuntimeError("model provider down")
        yield  # pragma: no cover

    [f async for f in events_to_ui_parts(failing_events(), request_id="m1")]

    exc = sentry_events[0]["exception"]["values"][-1]
    assert exc["type"] == "RuntimeError"
    assert exc["value"] == "model provider down"
