"""Why a turn got the knowledge it got (#205): one test per retrieval status,
plus the stable chunk id and score kind on each source."""
from __future__ import annotations

import json
from unittest.mock import AsyncMock

import pytest

from eccho_ai.core.variables import AppVars
from eccho_ai.llm.retrievers.retrieval import RAGRetrievalService, _embed_query_cached, stable_chunk_id
from eccho_ai.modules.chat import services as chat_services
from eccho_ai.modules.chat.models.chat_models import ChatRequest
from eccho_ai.modules.chat.services import _build_rag_message, get_rag_retrieval
from eccho_ai.modules.chat.stream_pipeline import events_to_ui_parts


def _row(chunk_id: str, distance: float, content: str | None = None) -> dict:
    return {
        "chunk_id": chunk_id,
        "document_id": "doc-1",
        "filename": "123-menu.txt",
        "chunk_index": 0,
        "content": content or f"content of {chunk_id}",
        "distance": distance,
        "document_metadata": {"title": "Menu", "knowledge_item_id": "item-7"},
    }


class _Store:
    def __init__(self, documents: int = 1, rows: list[dict] | None = None):
        self.documents = documents
        self.rows = rows or []

    async def count_completed_documents(self, *, chatbot_id):
        return self.documents

    async def similarity_search_chunks(self, **_kw):
        return self.rows

    async def full_text_search_chunks(self, **_kw):
        return []


class _Embedder:
    async def aembed_query(self, query):
        return [0.1, 0.2]


@pytest.fixture(autouse=True)
def _hybrid_scores(monkeypatch):
    # Hybrid scoring keeps torch out of the tests; MIN_SCORE 0.5 makes the
    # threshold easy to straddle with cosine distances.
    monkeypatch.setattr(AppVars, "RAG_RERANK_ENABLED", False)
    monkeypatch.setattr(AppVars, "RAG_RETRIEVAL_ENABLED", True)
    monkeypatch.setattr(AppVars, "RAG_RETRIEVAL_MIN_SCORE", 0.5)
    _embed_query_cached.cache_clear()


def _service(store: _Store) -> RAGRetrievalService:
    return RAGRetrievalService(store=store, embedder=_Embedder())


async def test_ok_reports_the_top_score_and_stable_chunk_ids():
    result = await _service(_Store(rows=[_row("c-9", 0.1), _row("c-4", 0.8)])).retrieve(
        chatbot_id="bot", query="menu?"
    )

    assert result.status == "ok"
    assert result.summary == {"status": "ok", "top_score": pytest.approx(0.9), "score_kind": "hybrid"}
    [source] = result.source_attributions
    assert source["id"] == "KB-1"
    assert source["chunk_id"].startswith("item-7:0:")
    assert source["title"] == "Menu"
    assert source["score_kind"] == "hybrid"


async def test_below_threshold_still_reports_the_best_score():
    result = await _service(_Store(rows=[_row("c-1", 0.7)])).retrieve(chatbot_id="bot", query="menu?")

    assert result.chunks == []
    assert result.summary == {
        "status": "below_threshold",
        "top_score": pytest.approx(0.3),
        "score_kind": "hybrid",
    }


async def test_no_documents():
    result = await _service(_Store(documents=0)).retrieve(chatbot_id="bot", query="menu?")

    assert result.summary == {"status": "no_documents"}


async def test_disabled(monkeypatch):
    monkeypatch.setattr(AppVars, "RAG_RETRIEVAL_ENABLED", False)

    result = await _service(_Store()).retrieve(chatbot_id="bot", query="menu?")

    assert result.summary == {"status": "disabled"}


async def test_empty_query_is_no_query():
    result = await _service(_Store()).retrieve(chatbot_id="bot", query="  ")

    assert result.summary == {"status": "no_query"}


async def test_chunk_id_survives_a_reingest():
    # Re-ingesting reinserts every chunk with a new row id.
    first = await _service(_Store(rows=[_row("row-1", 0.1, "Pho 50k")])).retrieve(chatbot_id="bot", query="menu?")
    _embed_query_cached.cache_clear()
    again = await _service(_Store(rows=[_row("row-2", 0.1, "Pho 50k")])).retrieve(chatbot_id="bot", query="menu?")

    assert first.source_attributions[0]["chunk_id"] == again.source_attributions[0]["chunk_id"]


def test_chunk_id_falls_back_to_the_row_id_without_a_knowledge_item():
    from eccho_ai.llm.retrievers.retrieval import RetrievedChunk

    chunk = RetrievedChunk(chunk_id="row-1", document_id="d", filename="f", chunk_index=0, content="x")

    assert stable_chunk_id(chunk) == "row-1"


async def test_rerank_scores_are_labelled_rerank(monkeypatch):
    monkeypatch.setattr(AppVars, "RAG_RERANK_ENABLED", True)
    service = _service(_Store(rows=[_row("c-1", 0.1)]))

    async def rerank(_query, chunks):
        for chunk in chunks:
            chunk.rerank_score = 0.8
        return chunks

    monkeypatch.setattr(service, "_rerank", rerank)

    result = await service.retrieve(chatbot_id="bot", query="menu?")

    assert result.summary["score_kind"] == "rerank"
    assert result.source_attributions[0]["score_kind"] == "rerank"


@pytest.mark.parametrize(
    ("broken", "code"),
    [("count_completed_documents", "store_failed"), ("similarity_search_chunks", "store_failed")],
)
async def test_store_errors_report_a_fixed_code(monkeypatch, broken, code):
    store = _Store(rows=[_row("c-1", 0.1)])

    async def boom(**_kw):
        raise ConnectionError("could not connect to db.internal:5432")

    monkeypatch.setattr(store, broken, boom)
    monkeypatch.setattr(chat_services, "rag_retrieval_service", _service(store))

    result = await get_rag_retrieval(ChatRequest(chatbot_id="bot", message="menu?"))

    # Owners read this in the preview: never the driver's text.
    assert result.summary == {"status": "error", "reason": code}


async def test_embedding_error_reports_embedding_failed(monkeypatch):
    class _BrokenEmbedder:
        async def aembed_query(self, query):
            raise TimeoutError("https://openrouter.internal timed out")

    service = RAGRetrievalService(store=_Store(rows=[_row("c-1", 0.1)]), embedder=_BrokenEmbedder())
    monkeypatch.setattr(chat_services, "rag_retrieval_service", service)

    result = await get_rag_retrieval(ChatRequest(chatbot_id="bot", message="menu?"))

    assert result.summary == {"status": "error", "reason": "embedding_failed"}


async def test_error_is_reported_and_the_prompt_is_unchanged(monkeypatch):
    class _Broken:
        async def retrieve(self, **_kw):
            raise ConnectionError("pgvector down")

    monkeypatch.setattr(chat_services, "rag_retrieval_service", _Broken())

    result = await get_rag_retrieval(ChatRequest(chatbot_id="bot", message="menu?"))

    assert result.summary == {"status": "error", "reason": "retrieval_failed"}
    # As before: the model answers without the no-knowledge framing.
    assert _build_rag_message("menu?", result) == "menu?"


async def test_retrieval_goes_on_message_metadata():
    async def no_events():
        if False:
            yield  # pragma: no cover

    frames = [
        f
        async for f in events_to_ui_parts(
            no_events(), request_id="m1", retrieval={"status": "below_threshold", "top_score": 0.3}
        )
    ]
    metadata = next(
        json.loads(f[len("data: "):])["messageMetadata"]
        for f in frames
        if f.startswith("data: {") and json.loads(f[len("data: "):])["type"] == "message-metadata"
    )

    assert metadata["retrieval"] == {"status": "below_threshold", "top_score": 0.3}
    assert "usage" in metadata


def test_blocked_turn_still_reports_retrieval(client, monkeypatch):
    """The non-streaming endpoint's guardrail block keeps `retrieval`, so an
    eval of a blocked turn still sees why retrieval found what it did."""
    from types import SimpleNamespace

    from eccho_ai.llm.retrievers.retrieval import RAGRetrievalResult
    from eccho_ai.modules.chat import routers

    async def retrieval(_req):
        return RAGRetrievalResult(query="menu?", chunks=[], context="", status="no_documents")

    async def agent(_id):
        return SimpleNamespace(chatbot=object())

    async def block(_message, _chatbot):
        return "off topic"

    monkeypatch.setattr(routers, "get_rag_retrieval", retrieval)
    monkeypatch.setattr(routers, "get_media_retrieval", AsyncMock(return_value=[]))
    monkeypatch.setattr(routers, "get_agent", agent)
    monkeypatch.setattr(routers, "run_input_guardrail", block)

    res = client.post("/api/chat/message", json={"chatbot_id": "bot", "message": "menu?"})

    metadata = res.json()["data"]["metadata"]
    assert metadata["guardrail_block"] is True
    assert metadata["retrieval"] == {"status": "no_documents"}
