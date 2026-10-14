"""Media items (product photos, banners, PDF menus) are indexed apart from the
knowledge chunks: one row per item, embedded from its title and description,
so they never take a place in the chunk retrieval."""
from __future__ import annotations

from types import SimpleNamespace
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


def _pdf_service(monkeypatch, pages, read=None):
    service, store, embed = _service()
    service._ingest_text = AsyncMock(return_value=SimpleNamespace(usage=None, chunk_count=0))
    monkeypatch.setattr(media, "_pdf_pages", lambda content: pages)
    if read is not None:
        monkeypatch.setattr(media, "read_pdf_page_images", read)
    return service, store, embed


async def _ingest_pdf(service, description=None):
    return await service.ingest(
        content=b"%PDF-1.4", mime_type="application/pdf", knowledge_item_id="item-2",
        chatbot_ids=["c1"], title="Menu Moc", url="https://cdn/m.pdf", description=description,
    )


async def test_a_pdf_is_described_by_the_start_of_its_text(monkeypatch):
    pages = [("Drinks menu\nPeach tea 45.000\n" + "x" * 5000, None)]
    service, _, embed = _pdf_service(monkeypatch, pages)

    result = await _ingest_pdf(service)

    assert result.description.startswith("Drinks menu\nPeach tea 45.000")
    assert len(result.description) <= media.MEDIA_DESCRIPTION_MAX_CHARS
    assert embed.await_args.args[0][0].startswith("Menu Moc\nDrinks menu")


async def test_pdf_pages_that_are_pictures_are_read_by_the_vision_model(monkeypatch):
    # A restaurant menu: an intro page with text, then dishes as photos.
    pages = [("Welcome to Moc", None), ("", b"img-2"), ("", b"img-3")]
    read = AsyncMock(return_value=(
        ["Canh ga chien mam - 69.000", "Cua gach - 75.000/100gr"],
        TokenUsage(input_tokens=900, output_tokens=40, total_tokens=940),
    ))
    service, _, _ = _pdf_service(monkeypatch, pages, read)

    result = await _ingest_pdf(service)

    assert read.await_args.args[0] == [b"img-2", b"img-3"]
    assert "Canh ga chien mam - 69.000" in result.description
    # Page order is kept.
    assert result.description.index("Welcome") < result.description.index("Canh ga")
    assert result.usage.total_tokens == 947


async def test_the_whole_pdf_text_goes_to_the_knowledge_chunks(monkeypatch):
    # The description is capped, so a long menu is also chunked for retrieval.
    pages = [("Welcome to Moc", None), ("", b"img-2")]
    read = AsyncMock(return_value=(["Canh ga chien mam - 69.000"], None))
    service, _, _ = _pdf_service(monkeypatch, pages, read)

    await _ingest_pdf(service, description="Thuc don chinh")

    kwargs = service._ingest_text.await_args.kwargs
    assert kwargs["knowledge_item_id"] == "item-2"
    assert kwargs["chatbot_ids"] == ["c1"]
    assert kwargs["title"] == "Menu Moc"
    assert kwargs["text"] == "Welcome to Moc\n\nCanh ga chien mam - 69.000"


async def test_a_pdf_that_fails_to_chunk_leaves_no_media_row(monkeypatch):
    # A failed item must not stay findable, so the media row is written last.
    pages = [("Welcome to Moc", None)]
    service, store, _ = _pdf_service(monkeypatch, pages)
    service._ingest_text = AsyncMock(side_effect=ValueError("embedding down"))

    with pytest.raises(ValueError):
        await _ingest_pdf(service)

    store.upsert_media.assert_not_awaited()


async def test_a_pdf_reports_how_many_chunks_it_made(monkeypatch):
    pages = [("Welcome to Moc", None)]
    service, _, _ = _pdf_service(monkeypatch, pages)
    service._ingest_text = AsyncMock(return_value=SimpleNamespace(usage=None, chunk_count=12))

    result = await _ingest_pdf(service)

    assert result.chunk_count == 12


async def test_an_image_media_item_adds_no_knowledge_chunks(monkeypatch):
    service, _, _ = _service()
    service._ingest_text = AsyncMock()
    monkeypatch.setattr(media, "describe_media_image", AsyncMock(return_value=("A banner.", None)))

    await service.ingest(
        content=PNG, mime_type="image/png", knowledge_item_id="item-1",
        chatbot_ids=[], title="Banner", url="https://cdn/b.png", description=None,
    )

    service._ingest_text.assert_not_awaited()


async def test_page_images_are_read_in_parallel_batches(monkeypatch):
    calls = []

    async def fake_read(batch):
        calls.append(batch)
        return f"read {len(batch)}", TokenUsage(input_tokens=1, output_tokens=1, total_tokens=2)

    monkeypatch.setattr(media, "_read_page_batch", fake_read)

    texts, usage = await media.read_pdf_page_images([b"p"] * 19)

    assert [len(b) for b in calls] == [8, 8, 3]
    assert texts == ["read 8", "read 8", "read 3"]
    assert usage.total_tokens == 6


async def test_a_batch_the_model_cannot_read_is_skipped(monkeypatch):
    async def fake_read(batch):
        return (None, None) if batch[0] == b"bad" else ("ok", None)

    monkeypatch.setattr(media, "_read_page_batch", fake_read)

    texts, _ = await media.read_pdf_page_images([b"bad"] * 8 + [b"good"])

    assert texts == ["ok"]


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


def test_pdf_pages_keep_text_and_render_pages_without_it():
    import fitz

    doc = fitz.open()
    doc.new_page().insert_text((72, 72), "Menu do uong: Tra dao 45.000, Ca phe 30.000")
    doc.new_page().insert_text((72, 72), "12")  # a photo page carries only its number
    pages = media._pdf_pages(doc.tobytes())

    assert pages[0][0].startswith("Menu do uong") and pages[0][1] is None
    assert pages[1][1][:2] == b"\xff\xd8"  # rendered as a JPEG
