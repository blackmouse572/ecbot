"""Which OpenRouter provider serves a reply. Off by default: OpenRouter's own
routing. A whole install opts in with OPENROUTER_PROVIDER_SORT; apps/api can
ask per request (Ecbot Cloud does for paid plans)."""
from __future__ import annotations

from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from eccho_ai.core.variables import AppVars
from eccho_ai.modules.chat.models.chat_models import ChatRequest
from eccho_ai.modules.chat.services import get_agent_context


def _context(**request_fields):
    return get_agent_context(
        ChatRequest(chatbot_id="bot-1", message="hi", **request_fields),
        SimpleNamespace(state=SimpleNamespace(request_id="r")),
        None,
    )


def test_off_by_default(monkeypatch):
    monkeypatch.setattr(AppVars, "OPENROUTER_PROVIDER_SORT", "")
    assert _context().provider_sort is None


def test_an_install_can_turn_it_on(monkeypatch):
    monkeypatch.setattr(AppVars, "OPENROUTER_PROVIDER_SORT", "throughput")
    assert _context().provider_sort == "throughput"


def test_the_request_wins_over_the_install(monkeypatch):
    monkeypatch.setattr(AppVars, "OPENROUTER_PROVIDER_SORT", "price")
    assert _context(provider_sort="throughput").provider_sort == "throughput"


def test_only_openrouters_sort_values_are_accepted():
    with pytest.raises(ValidationError):
        ChatRequest(chatbot_id="bot-1", message="hi", provider_sort="fastest")
