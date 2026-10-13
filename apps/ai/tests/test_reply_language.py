"""Reply language: a Vietnamese agent's prompt pulls replies into Vietnamese, so
a customer clearly writing in another language gets a per-turn note."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from eccho_ai.llm.prompts.reply_language import REPLY_LANGUAGE_NOTE, reply_language_note
from eccho_ai.modules.chat.services import get_agent_input


@pytest.mark.parametrize(
    "message",
    [
        "Hi, do you have a table for 4 tonight at 7pm?",
        "How much is the pho?",
        "Sorry I don't speak Vietnamese. Can I order delivery to District 3?",
    ],
)
def test_notes_a_message_clearly_not_in_vietnamese(message):
    assert reply_language_note(message) == REPLY_LANGUAGE_NOTE


@pytest.mark.parametrize(
    "message",
    [
        "Shop ơi tối nay còn bàn 4 người lúc 7h không?",
        "Còn hàng không shop",
        "Cho mình xin menu với price list nha",
        "shop oi con hang ko",
        "gia bao nhieu vay",
        "ok",
        "hello there",
        "👍",
        "",
    ],
)
def test_leaves_vietnamese_short_or_unclear_messages_alone(message):
    assert reply_language_note(message) == ""


async def test_agent_input_puts_the_note_before_the_customer_message(monkeypatch):
    monkeypatch.setattr(
        "eccho_ai.modules.chat.services.build_customer_context_block",
        AsyncMock(return_value=None),
    )
    request = SimpleNamespace(
        action=None, customer_id=None, history=None, message="How much is the pho?"
    )
    content = (await get_agent_input(request))["messages"][-1].content
    assert content == f"{REPLY_LANGUAGE_NOTE}\n\nHow much is the pho?"
