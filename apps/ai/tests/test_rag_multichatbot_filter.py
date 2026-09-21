"""Test that retrieval filters work with chatbot_ids array (jsonb ? operator).

Requires a live Postgres instance accessible via RAG_POSTGRES_URL or POSTGRES_URL.
Skipped automatically when neither env var is configured.
"""
import pytest

from tests.test_rag_ingest_idempotency import _seed_document

pytestmark = pytest.mark.integration


@pytest.mark.asyncio
async def test_document_tagged_with_multiple_chatbots_is_found_by_each(pg_store_factory):
    store = pg_store_factory()
    await store.ensure_schema()
    await _seed_document(store, knowledge_item_id="item-A", chatbot_ids=["c1", "c2"])

    for cid in ("c1", "c2"):
        count = await store.count_completed_documents(chatbot_id=cid)
        assert count == 1, f"chatbot {cid} should see the document"
    assert await store.count_completed_documents(chatbot_id="c3") == 0
