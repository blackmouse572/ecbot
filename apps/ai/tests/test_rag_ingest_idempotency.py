"""Test idempotent upsert by knowledge_item_id.

Requires a live Postgres instance accessible via RAG_POSTGRES_URL or POSTGRES_URL.
Skipped automatically when neither env var is configured.
"""
import hashlib
import pytest
from uuid import uuid4

from eccho_ai.llm.retrievers.vector_store import PgVectorStore

pytestmark = pytest.mark.integration


async def _seed_document(
    store: PgVectorStore,
    *,
    knowledge_item_id: str,
    chatbot_ids: list[str],
) -> None:
    """Insert one minimal document + one chunk so delete_by_knowledge_item has something to delete."""
    from eccho_ai.core.variables import AppVars  # deferred: AppVars requires POSTGRES_URL at init
    doc_id = uuid4()
    content = f"seed content for {knowledge_item_id}"
    await store.create_document(
        document_id=doc_id,
        source_filename=f"{knowledge_item_id}.txt",
        local_path=f"/tmp/{knowledge_item_id}.txt",
        mime_type="text/plain",
        content_hash=hashlib.sha256(content.encode()).hexdigest(),
        content_chars=len(content),
        chunk_size=512,
        chunk_overlap=50,
        embedding_model=AppVars.RAG_EMBEDDING_MODEL,
        metadata={"knowledge_item_id": knowledge_item_id, "chatbot_ids": chatbot_ids},
    )
    await store.replace_chunks(
        document_id=doc_id,
        chunks=[content],
        embeddings=[[0.0] * AppVars.RAG_EMBEDDING_DIMENSION],
        metadatas=[{"knowledge_item_id": knowledge_item_id, "chunk_index": 0}],
    )


@pytest.mark.asyncio
async def test_delete_by_knowledge_item_removes_only_that_item(pg_store_factory):
    store: PgVectorStore = pg_store_factory()
    await store.ensure_schema()
    await _seed_document(store, knowledge_item_id="item-A", chatbot_ids=["c1"])
    await _seed_document(store, knowledge_item_id="item-B", chatbot_ids=["c1"])

    removed = await store.delete_by_knowledge_item("item-A")

    assert removed == 1
    remaining = await store.list_documents(limit=10)
    ids = {d["metadata"].get("knowledge_item_id") for d in remaining}
    assert ids == {"item-B"}
