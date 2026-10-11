"""Creates the rag tables for integration tests from the API's migration.

The AI service runs no DDL of its own: production gets these tables from
apps/api/migrations. Reading the same file here keeps the tests on the schema
production has.
"""
from pathlib import Path
import re

from eccho_ai.llm.retrievers.vector_store import get_pool

_MIGRATION = (
    Path(__file__).resolve().parents[2]
    / "api"
    / "migrations"
    / "20261012090000_create_rag_schema.ts"
)


def rag_migration_statements() -> list[str]:
    up = _MIGRATION.read_text().split("async up()")[1].split("async down()")[0]
    return [sql.strip() for sql in re.findall(r"`([^`]+)`", up)]


async def apply_rag_migration() -> None:
    pool = await get_pool()
    async with pool.acquire() as conn:
        for statement in rag_migration_statements():
            await conn.execute(statement)
