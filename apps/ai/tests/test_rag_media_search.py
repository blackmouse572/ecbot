"""The media library the agent can send: `search_media` / `get_media` only ever
return COMPLETED, not deleted knowledge items linked to the asking chatbot."""
from __future__ import annotations

import json
import os
from decimal import Decimal
from uuid import uuid4

import pytest

from eccho_ai.llm.retrievers import vector_store
from eccho_ai.llm.retrievers.vector_store import PgVectorStore


class _Conn:
    def __init__(self, rows):
        self.rows = rows
        self.calls: list[tuple[str, tuple]] = []

    async def fetch(self, sql, *args):
        self.calls.append((sql, args))
        return self.rows

    async def fetchrow(self, sql, *args):
        self.calls.append((sql, args))
        return self.rows[0] if self.rows else None


class _Pool:
    def __init__(self, conn):
        self.conn = conn

    def acquire(self):
        conn = self.conn

        class _Ctx:
            async def __aenter__(self):
                return conn

            async def __aexit__(self, *exc):
                return False

        return _Ctx()


def _row(**over):
    row = {
        "id": "item-1",
        "title": "Lunch banner",
        "description": "A red banner",
        "url": "https://cdn/x.webp",
        "mime_type": "image/webp",
        "size": Decimal("2048000.00"),
        "compact": json.dumps({"url": "https://cdn/x-compact.jpg", "mime": "image/jpeg", "size": 900000}),
        "distance": 0.21,
    }
    row.update(over)
    return row


@pytest.fixture
def conn(monkeypatch):
    holder = _Conn([_row()])

    async def fake_pool():
        return _Pool(holder)

    monkeypatch.setattr(vector_store, "get_pool", fake_pool)
    return holder


def _filters(sql: str) -> None:
    flat = " ".join(sql.split())
    assert "JOIN knowledge_base_items k ON k.id::text = m.knowledge_item_id" in flat
    assert "k.status = 'COMPLETED'" in flat
    assert "NOT k.deleted" in flat
    assert "= ANY(m.chatbot_ids)" in flat


async def test_search_media_filters_and_orders_by_distance(conn):
    rows = await PgVectorStore(embedding_dimension=3).search_media(
        embedding=[0.1, 0.2, 0.3], chatbot_id="c1", limit=5, max_distance=0.6
    )

    sql, args = conn.calls[0]
    _filters(sql)
    flat = " ".join(sql.split())
    assert "<=>" in flat and "ORDER BY distance" in flat and "LIMIT" in flat
    assert "c1" in args and 0.6 in args and 5 in args
    assert rows == [
        {
            "id": "item-1",
            "title": "Lunch banner",
            "description": "A red banner",
            "url": "https://cdn/x.webp",
            "mime_type": "image/webp",
            "size": 2048000,
            "compact": {"url": "https://cdn/x-compact.jpg", "mime": "image/jpeg", "size": 900000},
            "distance": 0.21,
        }
    ]


async def test_get_media_filters_by_chatbot_and_item(conn):
    conn.rows = [_row(compact=None, size=None, distance=None)]
    item = await PgVectorStore(embedding_dimension=3).get_media(
        chatbot_id="c1", knowledge_item_id="item-1"
    )

    sql, args = conn.calls[0]
    _filters(sql)
    assert args == ("c1", "item-1")
    assert item["compact"] is None and item["size"] is None


async def test_get_media_returns_none_when_missing(conn):
    conn.rows = []
    assert await PgVectorStore(embedding_dimension=3).get_media(
        chatbot_id="c1", knowledge_item_id="nope"
    ) is None


# ---- live Postgres ---------------------------------------------------------


async def _seed_item(conn, *, status: str, deleted: bool = False, metadata=None) -> str:
    kb_id = await conn.fetchval("SELECT id FROM knowledge_bases LIMIT 1")
    if kb_id is None:
        pytest.skip("no knowledge base to attach test items to (run the seed)")
    item_id = uuid4()
    await conn.execute(
        """
        INSERT INTO knowledge_base_items (
            id, knowledge_base_id, type, title, status, deleted, attachment_size, metadata
        )
        VALUES ($1, $2, 'MEDIA', 'media search test', $3, $4, 1234.00, $5::jsonb)
        """,
        item_id, kb_id, status, deleted, json.dumps(metadata) if metadata else None,
    )
    return str(item_id)


@pytest.mark.integration
async def test_only_completed_live_items_of_the_chatbot_come_back(pg_store_factory):
    if not (os.environ.get("RAG_POSTGRES_URL") or os.environ.get("POSTGRES_URL")):
        pytest.skip("no database")
    from eccho_ai.core.variables import AppVars

    store = pg_store_factory()
    dim = AppVars.RAG_EMBEDDING_DIMENSION
    vector = [1.0] + [0.0] * (dim - 1)
    pool = await vector_store.get_pool()
    chatbot = f"bot-{uuid4()}"
    other = f"bot-{uuid4()}"
    seeded: list[str] = []
    async with pool.acquire() as conn:
        ok = await _seed_item(conn, status="COMPLETED", metadata={"compact": {"url": "https://c/x.jpg", "mime": "image/jpeg", "size": 9}})
        failed = await _seed_item(conn, status="FAILED")
        processing = await _seed_item(conn, status="PROCESSING")
        deleted = await _seed_item(conn, status="COMPLETED", deleted=True)
        foreign = await _seed_item(conn, status="COMPLETED")
        seeded = [ok, failed, processing, deleted, foreign]
    try:
        for item_id in seeded:
            await store.upsert_media(
                knowledge_item_id=item_id,
                chatbot_ids=[other] if item_id == foreign else [chatbot],
                title="media search test", description="d", url=f"https://cdn/{item_id}.png",
                mime_type="image/png", embedding=vector,
            )

        found = await store.search_media(embedding=vector, chatbot_id=chatbot, limit=10, max_distance=0.6)
        assert [row["id"] for row in found] == [ok]
        assert found[0]["size"] == 1234
        assert found[0]["compact"] == {"url": "https://c/x.jpg", "mime": "image/jpeg", "size": 9}

        assert (await store.get_media(chatbot_id=chatbot, knowledge_item_id=ok))["id"] == ok
        for item_id in (failed, processing, deleted, foreign):
            assert await store.get_media(chatbot_id=chatbot, knowledge_item_id=item_id) is None
    finally:
        async with pool.acquire() as conn:
            await conn.execute("DELETE FROM rag_media WHERE knowledge_item_id = ANY($1::text[])", seeded)
            await conn.execute("DELETE FROM knowledge_base_items WHERE id::text = ANY($1::text[])", seeded)
