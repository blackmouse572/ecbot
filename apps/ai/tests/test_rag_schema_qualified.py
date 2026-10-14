"""The `rag` tables must be named with their schema in every query.

Prod reaches Postgres through Neon's pooler (PgBouncer, transaction mode),
which does not apply a `search_path` sent at connect time. An unqualified
`rag_documents` then resolves against `public` and fails with
`relation "rag_documents" does not exist`, although the migration created
`rag.rag_documents`.
"""
import os

os.environ.setdefault("POSTGRES_URL", "postgresql://u:p@localhost/x")

import inspect
import re

import pytest

from eccho_ai.llm.retrievers import vector_store
from eccho_ai.llm.tools import image_urls

# A rag table name not preceded by `rag.`
UNQUALIFIED = re.compile(r"(?<!rag\.)\brag_document(s|_chunks)\b")


@pytest.mark.parametrize("module", [vector_store, image_urls])
def test_rag_tables_are_schema_qualified(module):
    source = inspect.getsource(module)
    lines = [line.strip() for line in source.splitlines() if UNQUALIFIED.search(line)]
    assert lines == []


async def test_pool_does_not_rely_on_a_connect_time_search_path(monkeypatch):
    seen = {}

    async def fake_create_pool(*args, **kwargs):
        seen.update(kwargs)
        return object()

    monkeypatch.setattr(vector_store.asyncpg, "create_pool", fake_create_pool)
    vector_store._POOL = None
    try:
        await vector_store.get_pool()
    finally:
        vector_store._POOL = None
    assert "search_path" not in (seen.get("server_settings") or {})
