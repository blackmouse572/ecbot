"""Test chatbot link update and delete-by-item endpoints.

Requires a live Postgres instance accessible via RAG_POSTGRES_URL or POSTGRES_URL.
Skipped automatically when neither env var is configured.
"""
import pytest

from tests.test_rag_ingest_idempotency import _seed_document

pytestmark = pytest.mark.integration


@pytest.mark.asyncio
async def test_update_chatbot_links_changes_visibility(pg_store_factory):
    store = pg_store_factory()
    await store.ensure_schema()
    await _seed_document(store, knowledge_item_id="item-A", chatbot_ids=["c1"])

    updated = await store.update_chatbot_links("item-A", ["c1", "c2"])

    assert updated == 1
    assert await store.count_completed_documents(chatbot_id="c2") == 1
