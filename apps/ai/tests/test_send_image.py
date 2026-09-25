"""send_image: the agent can only send images that exist in its own knowledge."""
from types import SimpleNamespace
from unittest.mock import AsyncMock

from eccho_ai.llm.tools import image_urls
from eccho_ai.llm.tools import system_tools as st

BOT = SimpleNamespace(id="bot-1", general_knowledge="Logo: ![logo](https://cdn/logo.png)")


async def test_url_in_operator_instructions_is_known(monkeypatch):
    monkeypatch.setattr(image_urls, "_chunk_contains", AsyncMock(return_value=False))
    assert await image_urls.is_known_image_url(BOT, "https://cdn/logo.png")


async def test_url_in_knowledge_base_is_known(monkeypatch):
    lookup = AsyncMock(return_value=True)
    monkeypatch.setattr(image_urls, "_chunk_contains", lookup)
    assert await image_urls.is_known_image_url(BOT, "https://cdn/shirt.jpg")
    lookup.assert_awaited_once_with("bot-1", "https://cdn/shirt.jpg")


async def test_unknown_or_non_http_url_is_rejected(monkeypatch):
    monkeypatch.setattr(image_urls, "_chunk_contains", AsyncMock(return_value=False))
    assert not await image_urls.is_known_image_url(BOT, "https://evil/x.jpg")
    assert not await image_urls.is_known_image_url(BOT, "javascript:alert(1)")
    assert not await image_urls.is_known_image_url(None, "https://cdn/logo.png")


async def test_send_image_accepts_a_known_url(monkeypatch):
    monkeypatch.setattr(st, "_get_chatbot", lambda: BOT)
    monkeypatch.setattr(st, "is_known_image_url", AsyncMock(return_value=True))
    out = await st.send_image.ainvoke({"url": "https://cdn/shirt.jpg"})
    assert out == {"ok": True, "url": "https://cdn/shirt.jpg"}


async def test_send_image_rejects_an_unknown_url(monkeypatch):
    monkeypatch.setattr(st, "_get_chatbot", lambda: BOT)
    monkeypatch.setattr(st, "is_known_image_url", AsyncMock(return_value=False))
    out = await st.send_image.ainvoke({"url": "https://evil/x.jpg"})
    assert out["ok"] is False
