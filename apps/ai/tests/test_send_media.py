"""send_media: the agent sends images and PDFs from its Media knowledge by id,
picked from a <media_library> listed with the user's message."""
from __future__ import annotations

import json
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from langchain_core.messages import ToolMessage

from eccho_ai.core.variables import AppVars
from eccho_ai.llm.retrievers.retrieval import (
    RAGRetrievalResult,
    RAGRetrievalService,
    RetrievedMedia,
    _embed_query_cached,
)
from eccho_ai.llm.tools import system_tools as st
from eccho_ai.modules.chat.services import _build_rag_message
from eccho_ai.modules.chat.stream_pipeline import events_to_ui_parts

BOT = SimpleNamespace(id="bot-1", general_knowledge="")
MENU_ROW = {
    "knowledge_item_id": "item-menu",
    "title": "Menu Mộc Đà Nẵng",
    "description": "MOC Seafood Restaurant\nKhoai tây chiên - 59.000",
    "url": "https://cdn/menu.pdf",
    "mime_type": "application/pdf",
    "size": 14010986.0,
}


class _Store:
    def __init__(self, documents=1, media=None, media_error=False, has_media=True):
        self.documents = documents
        self.media = media or []
        self.media_error = media_error
        self._has_media = has_media
        self.media_calls: list[dict] = []

    async def count_completed_documents(self, *, chatbot_id):
        return self.documents

    async def has_media(self, *, chatbot_id):
        return self._has_media

    async def similarity_search_chunks(self, **_kw):
        return [{
            "chunk_id": "c-1", "document_id": "d-1", "filename": "f.txt", "chunk_index": 0,
            "content": "Opening hours 10:30-23:45", "distance": 0.1, "document_metadata": {},
        }]

    async def full_text_search_chunks(self, **_kw):
        return []

    async def search_media(self, **kw):
        self.media_calls.append(kw)
        if self.media_error:
            raise RuntimeError("db down")
        return self.media


class _Embedder:
    async def aembed_query(self, query):
        return [0.1, 0.2]


@pytest.fixture(autouse=True)
def _hybrid(monkeypatch):
    monkeypatch.setattr(AppVars, "RAG_RERANK_ENABLED", False)
    monkeypatch.setattr(AppVars, "RAG_RETRIEVAL_ENABLED", True)
    monkeypatch.setattr(AppVars, "RAG_RETRIEVAL_MIN_SCORE", 0.5)
    _embed_query_cached.cache_clear()


def _service(store):
    return RAGRetrievalService(store=store, embedder=_Embedder())


async def test_retrieval_lists_media_next_to_the_chunks():
    store = _Store(media=[MENU_ROW])
    result = await _service(store).retrieve(chatbot_id="bot-1", query="menu please")

    assert result.status == "ok" and len(result.chunks) == 1
    assert result.media == [RetrievedMedia(
        id="item-menu", title="Menu Mộc Đà Nẵng",
        description=MENU_ROW["description"], mime_type="application/pdf",
    )]
    # Same query embedding, the bot's own media only.
    assert store.media_calls == [{"embedding": [0.1, 0.2], "chatbot_id": "bot-1", "limit": AppVars.RAG_MEDIA_LIMIT}]


async def test_a_failed_media_search_leaves_the_turn_its_knowledge():
    result = await _service(_Store(media_error=True)).retrieve(chatbot_id="bot-1", query="menu")

    assert result.status == "ok" and len(result.chunks) == 1
    assert result.media == []


async def test_an_image_only_library_is_still_listed():
    result = await _service(_Store(documents=0, media=[MENU_ROW])).retrieve(chatbot_id="bot-1", query="menu")

    assert result.status == "no_documents"
    assert [m.id for m in result.media] == ["item-menu"]


async def test_no_documents_and_no_media_skips_the_embedding():
    class _NoEmbed:
        async def aembed_query(self, query):
            raise AssertionError("should not embed")

    store = _Store(documents=0, has_media=False)
    result = await RAGRetrievalService(store=store, embedder=_NoEmbed()).retrieve(chatbot_id="b", query="hi")

    assert result.status == "no_documents" and result.media == []


def test_the_library_goes_ahead_of_the_message_with_ids_and_no_urls():
    retrieval = RAGRetrievalResult(
        query="menu", chunks=[], context="", status="below_threshold",
        media=[RetrievedMedia(id="item-menu", title="Menu", description="Line one\nline two " + "x" * 300,
                              mime_type="application/pdf"),
               RetrievedMedia(id="item-cake", title="Birthday cake", description="", mime_type="image/png")],
    )
    message = _build_rag_message("send me the menu", retrieval)

    library = message[message.index("<media_library>"):message.index("</media_library>")]
    assert "- id=item-menu | PDF | Menu | Line one line two xxx" in library
    assert library.split("\n")[1].endswith("...")
    assert "- id=item-cake | image | Birthday cake\n" in library
    assert "https://" not in message
    assert message.index("</media_library>") < message.index("send me the menu")


def test_no_media_leaves_the_message_as_before():
    retrieval = RAGRetrievalResult(query="hi", chunks=[], context="", status="below_threshold")
    assert "media_library" not in _build_rag_message("hi", retrieval)


async def test_send_media_returns_the_file_with_a_readable_name(monkeypatch):
    lookup = AsyncMock(return_value=MENU_ROW)
    monkeypatch.setattr(st, "_get_chatbot", lambda: BOT)
    monkeypatch.setattr(st, "_lookup_media", lookup)

    out = await st.send_media.ainvoke({"id": " item-menu "})

    lookup.assert_awaited_once_with("bot-1", "item-menu")
    assert out == {
        "ok": True, "url": "https://cdn/menu.pdf", "media_type": "application/pdf",
        "filename": "Menu Mộc Đà Nẵng.pdf", "size": 14010986,
    }


async def test_send_media_rejects_an_id_that_is_not_the_bots(monkeypatch):
    monkeypatch.setattr(st, "_get_chatbot", lambda: BOT)
    monkeypatch.setattr(st, "_lookup_media", AsyncMock(return_value=None))

    out = await st.send_media.ainvoke({"id": "someone-elses"})

    assert out["ok"] is False
    assert "—" not in out["reason"]


async def test_send_media_rejects_when_the_lookup_fails(monkeypatch):
    monkeypatch.setattr(st, "_get_chatbot", lambda: BOT)
    monkeypatch.setattr(st, "_lookup_media", AsyncMock(side_effect=RuntimeError("db")))

    assert (await st.send_media.ainvoke({"id": "item-menu"}))["ok"] is False


def _parts(frames):
    return [json.loads(f[len("data: "):]) for f in frames if f.startswith("data: {")]


async def test_send_media_emits_a_file_part_with_its_name():
    output = {"ok": True, "url": "https://cdn/menu.pdf", "media_type": "application/pdf",
              "filename": "Menu.pdf", "size": 1200}

    async def events():
        yield {"event": "on_tool_start", "run_id": "r1", "name": "send_media", "data": {"input": {"id": "x"}}}
        yield {"event": "on_tool_end", "run_id": "r1", "name": "send_media",
               "data": {"output": ToolMessage(content=json.dumps(output), tool_call_id="r1")}}

    parts = _parts([f async for f in events_to_ui_parts(events(), request_id="m1")])
    assert {"type": "file", "url": "https://cdn/menu.pdf", "mediaType": "application/pdf",
            "providerMetadata": {"eccho": {"filename": "Menu.pdf", "size": 1200}}} in parts
    meta = [p for p in parts if p["type"] == "data-tool-meta"]
    assert meta[0]["data"] == {"kind": "image"}


async def test_a_rejected_send_media_sends_nothing():
    async def events():
        yield {"event": "on_tool_start", "run_id": "r1", "name": "send_media", "data": {"input": {"id": "x"}}}
        yield {"event": "on_tool_end", "run_id": "r1", "name": "send_media",
               "data": {"output": ToolMessage(content='{"ok": false}', tool_call_id="r1")}}

    parts = _parts([f async for f in events_to_ui_parts(events(), request_id="m1")])
    assert not [p for p in parts if p["type"] == "file"]
