"""#204: the knowledge item's title is kept with the document so a source
can be shown to operators by name, not by its storage file name."""

import pytest

from eccho_ai.modules.rag.services import RAGIngestService


class _Store:
    def __init__(self):
        self.metadata = None

    async def delete_by_knowledge_item(self, _id):
        return None

    async def create_document(self, **kwargs):
        self.metadata = kwargs["metadata"]

    async def replace_chunks(self, **_kwargs):
        return None

    async def mark_ready(self, **_kwargs):
        return None


def _service(monkeypatch, tmp_path):
    store = _Store()
    service = RAGIngestService(store=store, embedder=object())

    async def embed(texts):
        return [[0.0] * service.embedding_dimension for _ in texts]

    monkeypatch.setattr(service, "_embed_documents", embed)
    monkeypatch.setattr(service, "_validate_embeddings", lambda *_a, **_k: None)
    monkeypatch.setattr(
        service,
        "_save_text_document",
        lambda text, *, document_id, filename: tmp_path / filename,
    )
    return service, store


@pytest.mark.asyncio
async def test_text_item_keeps_its_title(monkeypatch, tmp_path):
    service, store = _service(monkeypatch, tmp_path)

    await service.ingest_text(
        knowledge_item_id="item-1",
        text="Đổi trả trong 7 ngày.",
        title="Chính sách đổi trả",
    )

    assert store.metadata["title"] == "Chính sách đổi trả"


@pytest.mark.asyncio
async def test_uploaded_file_keeps_the_title_apps_api_sends(monkeypatch, tmp_path):
    service, store = _service(monkeypatch, tmp_path)

    class _Doc:
        page_content = "Đổi trả trong 7 ngày."
        metadata = {}

    async def save_upload(_file, *, document_id):
        return tmp_path / "1790661848627-kunmart-doi-tra.txt"

    monkeypatch.setattr(service, "_save_upload", save_upload)
    monkeypatch.setattr(
        "eccho_ai.modules.rag.services.load_document", lambda *_a, **_k: _Doc()
    )

    class _Upload:
        filename = "1790661848627-kunmart-doi-tra.txt"
        content_type = "text/plain"

    await service.ingest_upload(
        file=_Upload(), knowledge_item_id="item-1", title="Chính sách đổi trả"
    )

    assert store.metadata["title"] == "Chính sách đổi trả"
