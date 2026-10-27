"""Sentry error tracking, gated on SENTRY_DSN (#87)."""
from __future__ import annotations

import logging

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
    sentry_sdk.init(dsn="")  # disabled, whatever SENTRY_DSN the shell has

    assert init_sentry() is False
    assert not sentry_sdk.get_client().dsn


@pytest.mark.parametrize("dsn", ["   ", "\n", "placeholder", "public@sentry.example.com/1"])
def test_skips_a_blank_or_malformed_dsn_instead_of_crashing(monkeypatch, caplog, dsn):
    # A bad secret value must not stop the service from booting.
    monkeypatch.setattr(AppVars, "SENTRY_DSN", dsn)
    sentry_sdk.init(dsn="")

    assert init_sentry() is False
    assert not sentry_sdk.get_client().dsn
    if dsn.strip():
        assert "SENTRY_DSN" in caplog.text


def test_trims_whitespace_around_a_valid_dsn(monkeypatch):
    monkeypatch.setattr(AppVars, "SENTRY_DSN", f"  {FAKE_DSN}\n")
    sentry_sdk.init(dsn="")

    assert init_sentry(transport=_CaptureTransport()) is True
    assert sentry_sdk.get_client().dsn == FAKE_DSN
    sentry_sdk.get_client().close()
    sentry_sdk.init()


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
    assert sentry_events[0]["tags"]["conversation_id"] == "conv-1"


def test_keeps_logged_chat_text_out_of_events(sentry_events):
    # The request logger writes a preview of the chat body at INFO.
    request_logger = logging.getLogger("eccho_ai.middlewares.app_middleware")
    request_logger.setLevel(logging.INFO)
    request_logger.info("request body: my card is 4111 1111 1111 1111")
    sentry_sdk.capture_message("boom")

    assert "4111" not in str(sentry_events[0])


@pytest.mark.asyncio
async def test_reports_a_failed_chat_stream(sentry_events):
    async def failing_events():
        raise RuntimeError("model provider down")
        yield  # pragma: no cover

    [f async for f in events_to_ui_parts(failing_events(), request_id="m1")]

    exc = sentry_events[0]["exception"]["values"][-1]
    assert exc["type"] == "RuntimeError"
    assert exc["value"] == "model provider down"
