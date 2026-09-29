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
async def test_full_text_search_matches_chunk_source_titles(pg_store_factory):
    store = pg_store_factory()
    await store.ensure_schema()

    cases = [
        ("Refund policy", "refund-policy.txt", "refund policy"),
        ("Chính sách hoàn tiền", "Ch-nh-s-ch-ho-n-ti-n.txt", "chính sách hoàn tiền"),
    ]
    for index, (title, filename, query) in enumerate(cases):
        document_id = uuid4()
        content = f"Contact support for item {index} eligibility details."
        await store.create_document(
            document_id=document_id,
            source_filename=filename,
            local_path=f"/tmp/{filename}",
            mime_type="text/plain",
            content_hash=hashlib.sha256(content.encode()).hexdigest(),
            content_chars=len(content),
            chunk_size=512,
            chunk_overlap=50,
            embedding_model=AppVars.RAG_EMBEDDING_MODEL,
            metadata={
                "knowledge_item_id": f"item-source-search-{index}",
                "chatbot_ids": ["c1"],
            },
        )
        await store.replace_chunks(
            document_id=document_id,
            chunks=[content],
            embeddings=[[0.0] * AppVars.RAG_EMBEDDING_DIMENSION],
            metadatas=[
                {
                    "knowledge_item_id": f"item-source-search-{index}",
                    "chunk_index": 0,
                    "source": title,
                }
            ],
        )

        rows = await store.full_text_search_chunks(
            query=query,
            chatbot_id="c1",
            limit=5,
        )

        assert [row["content"] for row in rows] == [content]
