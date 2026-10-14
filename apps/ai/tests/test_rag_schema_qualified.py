"""SQL in the AI service must name the schema of everything it uses.

Prod reaches Postgres through Neon's pooler (PgBouncer, transaction mode),
which does not apply a `search_path` sent at connect time. An unqualified
`rag_documents` then resolves against `public` and fails with
`relation "rag_documents" does not exist`, although the migration created
`rag.rag_documents`. `tests/test_schema_contract.py` runs the queries against
a migrated database; this test catches the same mistake in any module,
including ones the contract test does not call.
"""
import os

os.environ.setdefault("POSTGRES_URL", "postgresql://u:p@localhost/x")

import re
from pathlib import Path

import pytest

import eccho_ai
from eccho_ai.llm.retrievers import vector_store

# A `rag_*` table in a FROM / INTO / UPDATE / JOIN clause without `rag.`
UNQUALIFIED_TABLE = re.compile(r"\b(FROM|INTO|UPDATE|JOIN)\s+rag_\w+", re.IGNORECASE)
# A pgvector cast without `public.`, where the migration installs the type
UNQUALIFIED_VECTOR = re.compile(r"::vector\b")

PACKAGE_DIR = Path(eccho_ai.__file__).parent
SOURCES = sorted(PACKAGE_DIR.rglob("*.py"))


def test_scans_the_modules_that_hold_rag_sql():
    names = {path.relative_to(PACKAGE_DIR).as_posix() for path in SOURCES}
    assert "llm/retrievers/vector_store.py" in names
    assert "llm/tools/image_urls.py" in names


@pytest.mark.parametrize(
    "path", SOURCES, ids=lambda p: p.relative_to(PACKAGE_DIR).as_posix()
)
def test_sql_names_its_schema(path):
    offending = [
        f"{number}: {line.strip()}"
        for number, line in enumerate(path.read_text().splitlines(), start=1)
        if UNQUALIFIED_TABLE.search(line) or UNQUALIFIED_VECTOR.search(line)
    ]
    assert offending == []


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
