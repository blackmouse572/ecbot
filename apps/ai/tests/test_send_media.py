"""send_media: the agent sends a media library item by its id, never a raw URL."""
from __future__ import annotations

from unittest.mock import AsyncMock

from eccho_ai.llm.tools import system_tools as st

ITEM = {
    "id": "11111111-1111-1111-1111-111111111111",
    "title": "Lunch banner",
    "description": "A red banner",
    "url": "https://cdn/x.webp",
    "mime_type": "image/webp",
    "size": 2048000,
    "compact": {"url": "https://cdn/x-compact.jpg", "mime": "image/jpeg", "size": 900000},
}


def _store(monkeypatch, result):
    get_media = AsyncMock(return_value=result) if not isinstance(result, Exception) else AsyncMock(side_effect=result)
    monkeypatch.setattr(st.media_store, "get_media", get_media)
    monkeypatch.setattr(st, "_get_chatbot_id", lambda: "bot-1")
    return get_media


async def test_send_media_returns_the_item_for_the_stream(monkeypatch):
    get_media = _store(monkeypatch, ITEM)

    out = await st.send_media.ainvoke({"id": ITEM["id"]})

    get_media.assert_awaited_once_with(chatbot_id="bot-1", knowledge_item_id=ITEM["id"])
    assert out == {
        "ok": True,
        "url": "https://cdn/x.webp",
        "media_type": "image/webp",
        "filename": "Lunch banner",
        "size": 2048000,
        "compact": {"url": "https://cdn/x-compact.jpg", "mediaType": "image/jpeg", "size": 900000},
    }


async def test_send_media_without_compact(monkeypatch):
    _store(monkeypatch, {**ITEM, "mime_type": "application/pdf", "compact": None})

    out = await st.send_media.ainvoke({"id": ITEM["id"]})

    assert out["ok"] is True and out["compact"] is None
    assert out["media_type"] == "application/pdf"


async def test_unknown_foreign_or_unfinished_id_is_rejected(monkeypatch):
    _store(monkeypatch, None)

    out = await st.send_media.ainvoke({"id": "nope"})

    assert out["ok"] is False
    assert "—" not in out["error"]


async def test_lookup_failure_is_rejected_not_raised(monkeypatch):
    _store(monkeypatch, ConnectionError("db down"))

    out = await st.send_media.ainvoke({"id": ITEM["id"]})

    assert out["ok"] is False
    assert "db down" not in out["error"]


async def test_no_chatbot_context_is_rejected(monkeypatch):
    get_media = _store(monkeypatch, ITEM)
    monkeypatch.setattr(st, "_get_chatbot_id", lambda: None)

    out = await st.send_media.ainvoke({"id": ITEM["id"]})

    assert out["ok"] is False
    get_media.assert_not_awaited()
