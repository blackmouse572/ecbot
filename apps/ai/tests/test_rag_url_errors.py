"""#165: a failed URL item must say why, not "Request failed with status code 502"."""
import pytest
from fastapi import HTTPException

from eccho_ai.modules.rag import routers
from eccho_ai.modules.rag.constants import URL_FETCH_FAILED, URL_NOT_PUBLIC
from eccho_ai.modules.rag.models import RAGUrlIngestRequest
from eccho_ai.modules.rag.services import RAGIngestService


@pytest.mark.parametrize("url", ["http://localhost:5500/products.html", "http://127.0.0.1/a", "http://10.0.0.5/menu"])
async def test_non_public_url_is_rejected_before_scraping(monkeypatch, url):
    service = RAGIngestService()

    def scrape(**_):
        raise AssertionError("must not scrape a non-public URL")

    monkeypatch.setattr(service, "_scrape_url", scrape)
    with pytest.raises(ValueError, match="not publicly reachable"):
        await service.ingest_url(url=url, knowledge_item_id="item-1")


async def test_non_public_url_is_a_400_with_a_clear_message(monkeypatch):
    async def ingest_url(**_):
        raise ValueError(URL_NOT_PUBLIC)

    monkeypatch.setattr(routers.rag_ingest_service, "ingest_url", ingest_url)
    with pytest.raises(HTTPException) as exc:
        await routers.ingest_url(RAGUrlIngestRequest(url="http://localhost/x", knowledge_item_id="item-1"))
    # 400 is permanent for apps/api, so it is not retried.
    assert exc.value.status_code == 400
    assert exc.value.detail == URL_NOT_PUBLIC


async def test_scraper_failure_is_a_502_with_a_readable_message(monkeypatch):
    async def ingest_url(**_):
        raise RuntimeError("Firecrawl: Invalid URL")

    monkeypatch.setattr(routers.rag_ingest_service, "ingest_url", ingest_url)
    with pytest.raises(HTTPException) as exc:
        await routers.ingest_url(RAGUrlIngestRequest(url="https://shop.vn/x", knowledge_item_id="item-1"))
    assert exc.value.status_code == 502
    assert exc.value.detail == URL_FETCH_FAILED
