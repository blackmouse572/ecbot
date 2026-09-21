import pytest
from httpx import AsyncClient, ASGITransport
from eccho_ai.main import app


@pytest.mark.asyncio
async def test_ingest_text_returns_chunk_count(monkeypatch):
    async def fake_ingest_text(**kwargs):
        from eccho_ai.modules.rag.models import RAGIngestResponse
        return RAGIngestResponse(
            document_id="00000000-0000-0000-0000-000000000001",
            filename="note.txt", stored_path="/tmp/note.txt", mime_type="text/plain",
            content_chars=42, chunk_count=2, chunk_size=1000, chunk_overlap=150,
            embedding_model="gemini-embedding-001", embedding_dimension=768,
        )
    monkeypatch.setattr("eccho_ai.modules.rag.routers.rag_ingest_service.ingest_text", fake_ingest_text)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.post("/api/rag/ingest/text", json={
            "knowledge_item_id": "item-1", "text": "hello world",
            "title": "note", "chatbot_ids": ["c1"],
        })
    assert resp.status_code == 200
    assert resp.json()["data"]["chunk_count"] == 2
