import os
os.environ.setdefault("POSTGRES_URL", "postgresql://u:p@localhost/x")

import asyncio
import pytest
from eccho_ai.llm.retrievers import vector_store


@pytest.mark.asyncio
async def test_get_pool_is_singleton(monkeypatch):
    created = {"n": 0}

    class FakePool: ...
    async def fake_create_pool(*a, **k):
        created["n"] += 1
        return FakePool()

    monkeypatch.setattr(vector_store.asyncpg, "create_pool", fake_create_pool)
    vector_store._POOL = None  # reset singleton
    p1 = await vector_store.get_pool()
    p2 = await vector_store.get_pool()
    assert p1 is p2
    assert created["n"] == 1
