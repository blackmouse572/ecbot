"""Media items (product photos, banners, PDF menus) are indexed apart from the
knowledge chunks: one row per item, embedded from its title and description,
so they never take a place in the chunk retrieval."""
from __future__ import annotations

from unittest.mock import AsyncMock

import pytest
from httpx import ASGITransport, AsyncClient

from eccho_ai.llm.usage import TokenUsage
from eccho_ai.modules.rag import media
from eccho_ai.modules.rag.media import MediaIngestService

PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 32


def _service(dimension: int = 3):
    store = AsyncMock()
    embed = AsyncMock(return_value=([[0.1] * dimension], TokenUsage(input_tokens=7, total_tokens=7)))
    service = MediaIngestService(store=store, embed=embed)
    service.embedding_dimension = dimension
    return service, store, embed


async def test_an_image_is_described_then_embedded_with_its_title(monkeypatch):
    service, store, embed = _service()
    describe = AsyncMock(return_value=("A red banner: Lunch combo 89k.", TokenUsage(input_tokens=300, output_tokens=20, total_tokens=320)))
    monkeypatch.setattr(media, "describe_media_image", describe)

    result = await service.ingest(
        content=PNG, mime_type="image/png", knowledge_item_id="item-1",
        chatbot_ids=["c1"], title="Lunch banner", url="https://cdn/x.png", description=None,
    )

    describe.assert_awaited_once()
    assert embed.await_args.args[0] == ["Lunch banner\nA red banner: Lunch combo 89k."]
    row = store.upsert_media.await_args.kwargs
    assert row["knowledge_item_id"] == "item-1"
    assert row["chatbot_ids"] == ["c1"]
    assert row["url"] == "https://cdn/x.png"
    assert row["description"] == "A red banner: Lunch combo 89k."
    assert result.description == "A red banner: Lunch combo 89k."
    # Vision and embedding tokens are both metered.
    assert result.usage.total_tokens == 327


async def test_a_given_description_skips_the_vision_call(monkeypatch):
    service, _, _ = _service()
    describe = AsyncMock()
    monkeypatch.setattr(media, "describe_media_image", describe)

    result = await service.ingest(
        content=PNG, mime_type="image/png", knowledge_item_id="item-1",
        chatbot_ids=[], title="Ao thun", url="https://cdn/x.png", description="Áo thun trắng cổ tròn",
    )

    describe.assert_not_awaited()
    assert result.description == "Áo thun trắng cổ tròn"


async def test_a_pdf_is_described_by_the_start_of_its_text(monkeypatch):
    service, _, embed = _service()
    monkeypatch.setattr(media, "_pdf_text", lambda content: "Drinks menu\nPeach tea 45.000\n" + "x" * 5000)

    result = await service.ingest(
        content=b"%PDF-1.4", mime_type="application/pdf", knowledge_item_id="item-2",
        chatbot_ids=[], title="Menu do uong", url="https://cdn/m.pdf", description=None,
    )

    assert result.description.startswith("Drinks menu\nPeach tea 45.000")
    assert len(result.description) <= media.MEDIA_DESCRIPTION_MAX_CHARS
    assert embed.await_args.args[0][0].startswith("Menu do uong\nDrinks menu")


async def test_an_image_the_model_cannot_read_still_indexes_by_title(monkeypatch):
    service, store, embed = _service()
    monkeypatch.setattr(media, "describe_media_image", AsyncMock(return_value=(None, None)))

    result = await service.ingest(
        content=PNG, mime_type="image/png", knowledge_item_id="item-3",
        chatbot_ids=[], title="Banner khai truong", url="https://cdn/b.png", description=None,
    )

    assert result.description == ""
    assert embed.await_args.args[0] == ["Banner khai truong"]
    store.upsert_media.assert_awaited_once()


async def test_an_unsupported_type_is_refused():
    service, _, _ = _service()
    with pytest.raises(ValueError):
        await service.ingest(
            content=b"abc", mime_type="text/plain", knowledge_item_id="i",
            chatbot_ids=[], title="t", url="https://cdn/t.txt", description=None,
        )


async def test_ingest_media_endpoint_returns_the_description(monkeypatch):
    from eccho_ai.main import app
    from eccho_ai.modules.rag.media import MediaIngestResponse

    fake = AsyncMock(return_value=MediaIngestResponse(description="A banner.", embedding_model="m"))
    monkeypatch.setattr("eccho_ai.modules.rag.routers.media_ingest_service.ingest", fake)

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test",
        headers={"X-Internal-Token": "test-internal-token"},
    ) as ac:
        resp = await ac.post(
            "/api/rag/ingest/media",
            files={"file": ("b.png", PNG, "image/png")},
            data={"knowledge_item_id": "item-1", "chatbot_ids": "c1,c2", "title": "Banner", "url": "https://cdn/b.png"},
        )

    assert resp.status_code == 200
    assert resp.json()["data"]["description"] == "A banner."
    assert fake.await_args.kwargs["chatbot_ids"] == ["c1", "c2"]
    assert fake.await_args.kwargs["description"] is None


def test_pdf_text_drops_page_markers(monkeypatch):
    doc = type("Doc", (), {"page_content": "[Page 1]\nMenu do uong\nTra dao 45.000\n[Page 2]\nCa phe 30.000"})()
    monkeypatch.setattr(media, "load_document", lambda *a, **k: doc)

    assert media._pdf_text(b"%PDF") == "Menu do uong\nTra dao 45.000\nCa phe 30.000"
