"""Website items: the owner picks how many pages to read, and the API keeps
what was read (page count, title, a preview) so the owner can check it."""

from types import SimpleNamespace

import pytest

from eccho_ai.llm.retrievers.safe_fetch import EgressBlockedError
from eccho_ai.modules.rag.services import RAGIngestService


class _Store:
    def __init__(self):
        self.chunk_metadatas = []

    async def delete_by_knowledge_item(self, _id):
        return None

    async def create_document(self, **_kwargs):
        return None

    async def replace_chunks(self, **kwargs):
        self.chunk_metadatas = kwargs["metadatas"]

    async def mark_ready(self, **_kwargs):
        return None


def _page(url, title, markdown):
    return SimpleNamespace(
        markdown=markdown,
        metadata={"url": url, "source_url": url, "title": title},
    )


@pytest.fixture
def service(monkeypatch, tmp_path):
    store = _Store()
    svc = RAGIngestService(store=store, embedder=object())

    async def embed(texts):
        return [[0.0] * svc.embedding_dimension for _ in texts], None

    async def public(url):
        if "169.254" in url:
            raise EgressBlockedError("private")

    monkeypatch.setattr(svc, "_embed_documents", embed)
    monkeypatch.setattr(svc, "_validate_embeddings", lambda *_a, **_k: None)
    monkeypatch.setattr(svc, "_save_text_document", lambda text, *, document_id, filename: tmp_path / filename)
    monkeypatch.setattr("eccho_ai.modules.rag.services.assert_public_url", public)
    monkeypatch.setattr("eccho_ai.modules.rag.services.AppVars.FIRECRAWL_API_KEY", SimpleNamespace(get_secret_value=lambda: "fc-key"))
    return svc


async def test_one_page_scrapes_only_that_page(monkeypatch, service):
    monkeypatch.setattr(service, "_scrape_url", lambda **_: _page("https://shop.vn/", "Shop", "# Shop\n\nÁo thun 199k"))
    monkeypatch.setattr(service, "_crawl_site", lambda **_: pytest.fail("must not crawl for one page"))

    result = await service.ingest_url(url="https://shop.vn/", knowledge_item_id="item-1", max_pages=1)

    assert result.pages_crawled == 1
    assert result.page_title == "Shop"
    assert result.preview.startswith("# Shop")


async def test_several_pages_crawl_the_site_up_to_the_limit(monkeypatch, service):
    calls = {}

    def crawl(**kwargs):
        calls.update(kwargs)
        return [
            _page("https://shop.vn/", "Shop", "# Shop\n\nÁo thun 199k"),
            _page("https://shop.vn/doi-tra", "Đổi trả", "Đổi trả trong 7 ngày"),
            _page("https://shop.vn/empty", "Empty", "   "),
        ]

    monkeypatch.setattr(service, "_crawl_site", crawl)
    monkeypatch.setattr(service, "_scrape_url", lambda **_: pytest.fail("must crawl, not scrape"))

    result = await service.ingest_url(url="https://shop.vn/", knowledge_item_id="item-1", max_pages=5)

    assert calls["limit"] == 5
    assert calls["url"] == "https://shop.vn/"
    assert result.pages_crawled == 2
    assert result.page_title == "Shop"
    assert "Đổi trả trong 7 ngày" in result.preview
    # Each chunk names the page it came from, not just the start page.
    sources = {m["source"] for m in service.store.chunk_metadatas}
    assert sources == {"https://shop.vn/", "https://shop.vn/doi-tra"}


async def test_preview_is_cut_short(monkeypatch, service):
    monkeypatch.setattr(service, "_scrape_url", lambda **_: _page("https://shop.vn/", "Shop", "a " * 5000))

    result = await service.ingest_url(url="https://shop.vn/", knowledge_item_id="item-1")

    assert len(result.preview) <= 2001


async def test_images_keep_their_alt_text_and_address(monkeypatch, service):
    markdown = "# Shop\n\n![Áo Phao Nữ Siêu Nhẹ](https://cdn.shop.vn/ao-phao.jpg)\n\n399.200đ"
    monkeypatch.setattr(service, "_scrape_url", lambda **_: _page("https://shop.vn/", "Shop", markdown))

    result = await service.ingest_url(url="https://shop.vn/", knowledge_item_id="item-1")

    assert "![Áo Phao Nữ Siêu Nhẹ](https://cdn.shop.vn/ao-phao.jpg)" in result.preview


async def test_the_entered_page_gives_the_title_and_leads_the_preview(monkeypatch, service):
    monkeypatch.setattr(
        service,
        "_crawl_site",
        lambda **_: [
            _page("https://shop.vn/doi-tra", "Đổi trả", "Đổi trả trong 7 ngày"),
            _page("https://shop.vn/", "Shop", "# Shop"),
        ],
    )

    result = await service.ingest_url(url="https://shop.vn/", knowledge_item_id="item-1", max_pages=5)

    assert result.page_title == "Shop"
    assert result.preview.startswith("# Shop")


async def test_crawl_reads_pdfs_like_a_single_page(monkeypatch, service):
    calls = {}

    def crawl(**kwargs):
        calls.update(kwargs)
        return [_page("https://shop.vn/", "Shop", "# Shop")]

    monkeypatch.setattr(service, "_crawl_site", crawl)

    await service.ingest_url(url="https://shop.vn/", knowledge_item_id="item-1", max_pages=5)

    assert calls["parsers"] == ["pdf"]


async def test_crawled_links_to_private_addresses_are_dropped(monkeypatch, service):
    monkeypatch.setattr(
        service,
        "_crawl_site",
        lambda **_: [
            _page("https://shop.vn/", "Shop", "# Shop"),
            _page("http://169.254.169.254/latest/meta-data/", "meta", "secret-token"),
        ],
    )

    result = await service.ingest_url(url="https://shop.vn/", knowledge_item_id="item-1", max_pages=5)

    assert result.pages_crawled == 1
    assert "secret-token" not in result.preview
