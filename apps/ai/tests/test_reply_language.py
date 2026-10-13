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
        "Bonjour, avez-vous une table pour 4 personnes ce soir à 19h ?",
        "Combien coûte le pho ?",
        "Très bien, et toi ?",
        "Hang on, let me check the menu",
        "Do you have bao buns?",
        "Do you teach tai chi?",
        "Ban 2 pizzas please",
        "你好，有位置吗",
        "安いですか",
        "Hi, is this shirt in stock?\n[Image description: A white shirt on a hanger]",
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
        "Có giao hàng tới quận 3 không",
        "ok",
        "hello there",
        "👍",
        "",
        "[Image description: A white shirt on a hanger]",
        "[The user sent an image that could not be viewed.]",
        "Áo này còn size M không?\n[Image description: A white shirt on a hanger]",
    ],
)
def test_leaves_vietnamese_short_or_unclear_messages_alone(message):
    assert reply_language_note(message) == ""


async def _last_message(monkeypatch, message, retrieval=None):
    monkeypatch.setattr(
        "eccho_ai.modules.chat.services.build_customer_context_block",
        AsyncMock(return_value=None),
    )
    request = SimpleNamespace(
        action=None, customer_id=None, history=None, message=message
    )
    return (await get_agent_input(request, retrieval))["messages"][-1].content


async def test_agent_input_puts_the_note_before_the_customer_message(monkeypatch):
    content = await _last_message(monkeypatch, "How much is the pho?")
    assert content == f"{REPLY_LANGUAGE_NOTE}\n\nHow much is the pho?"


async def test_note_stays_next_to_the_question_when_knowledge_is_retrieved(monkeypatch):
    retrieval = SimpleNamespace(
        status="ok", has_context=True, context="Pho: 65,000 VND"
    )
    content = await _last_message(monkeypatch, "How much is the pho?", retrieval)
    assert (
        f"<user_question>\n{REPLY_LANGUAGE_NOTE}\n\nHow much is the pho?\n</user_question>"
        in content
    )
