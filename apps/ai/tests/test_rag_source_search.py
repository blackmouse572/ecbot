"""Regression tests for searching RAG source labels.

Requires a live Postgres instance accessible via RAG_POSTGRES_URL or
POSTGRES_URL. Skipped automatically when neither env var is configured.
"""
from __future__ import annotations

import hashlib
from uuid import uuid4

import pytest

from eccho_ai.core.variables import AppVars


pytestmark = pytest.mark.integration


@pytest.mark.asyncio
async def test_full_text_search_matches_document_filename(pg_store_factory):
    store = pg_store_factory()
    await store.ensure_schema()

    document_id = uuid4()
    content = "Contact support for eligibility and processing details."
    await store.create_document(
        document_id=document_id,
        source_filename="refund-policy.txt",
        local_path="/tmp/refund-policy.txt",
        mime_type="text/plain",
        content_hash=hashlib.sha256(content.encode()).hexdigest(),
        content_chars=len(content),
        chunk_size=512,
        chunk_overlap=50,
        embedding_model=AppVars.RAG_EMBEDDING_MODEL,
        metadata={"knowledge_item_id": "item-source-search", "chatbot_ids": ["c1"]},
    )
    await store.replace_chunks(
        document_id=document_id,
        chunks=[content],
        embeddings=[[0.0] * AppVars.RAG_EMBEDDING_DIMENSION],
        metadatas=[{"knowledge_item_id": "item-source-search", "chunk_index": 0}],
    )

    rows = await store.full_text_search_chunks(
        query="refund policy",
        chatbot_id="c1",
        limit=5,
    )

    assert [row["content"] for row in rows] == [content]
