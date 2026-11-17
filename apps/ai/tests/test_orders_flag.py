"""The orders flag apps/api sends with each reply. Missing reads as off: an
older apps/api never makes a bot record orders a shop cannot see."""
from __future__ import annotations

from types import SimpleNamespace

from eccho_ai.modules.chat.models.chat_models import ChatRequest
from eccho_ai.modules.chat.services import get_agent_context


def _context(**request_fields):
    return get_agent_context(
        ChatRequest(chatbot_id="bot-1", message="hi", **request_fields),
        SimpleNamespace(state=SimpleNamespace(request_id="r")),
        None,
    )


def test_off_when_apps_api_does_not_say():
    assert _context().orders_enabled is False


def test_carried_from_the_request():
    assert _context(orders_enabled=True).orders_enabled is True
