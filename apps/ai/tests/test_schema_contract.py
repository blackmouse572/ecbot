"""Every table and column the AI service uses must come from the API's migrations.

The AI service creates nothing in the database. It reads the API's tables
through the SQLModel classes in `eccho_ai.models`, and it reads and writes the
`rag` tables with raw SQL. Nothing else ties those to the schema the deploy's
migrate step builds, so a model that names a column no migration adds only
fails in production.

CI runs this against a database built by `migration:up` alone (see
`.github/workflows/test-ai.yml`). Locally: point POSTGRES_URL at a migrated
database and run `pytest -m schema_contract`.
"""
import importlib
import os
import pkgutil
from uuid import uuid4

import pytest
from sqlmodel import SQLModel

pytestmark = [
    pytest.mark.schema_contract,
    pytest.mark.skipif(
        not os.environ.get("SCHEMA_CONTRACT_DATABASE"),
        reason="needs a database built by the API migrations (SCHEMA_CONTRACT_DATABASE=1)",
    ),
]


@pytest.fixture(autouse=True)
async def _fresh_pool():
    """The pool is a module singleton tied to the loop that opened it."""
    from eccho_ai.llm.retrievers import vector_store

    vector_store._POOL = None
    yield
    if vector_store._POOL is not None:
        await vector_store._POOL.close()
    vector_store._POOL = None


def _model_tables():
    import eccho_ai.models as models

    for module in pkgutil.iter_modules(models.__path__):
        importlib.import_module(f"eccho_ai.models.{module.name}")
    return SQLModel.metadata.tables


async def _columns(conn, schema: str, table: str) -> set[str]:
    rows = await conn.fetch(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_schema = $1 AND table_name = $2",
        schema,
        table,
    )
    return {row["column_name"] for row in rows}


async def test_every_model_column_exists_in_the_migrated_database():
    from eccho_ai.llm.retrievers.vector_store import get_pool

    pool = await get_pool()
    missing: list[str] = []
    async with pool.acquire() as conn:
        for name, table in sorted(_model_tables().items()):
            found = await _columns(conn, table.schema or "public", table.name)
            if not found:
                missing.append(f"table {name}")
                continue
            missing += [
                f"column {name}.{column.name}"
                for column in table.columns
                if column.name not in found
            ]

    assert missing == [], "no migration creates: " + ", ".join(missing)


async def test_every_rag_query_runs_on_the_migrated_database():
    from eccho_ai.core.variables import AppVars
    from eccho_ai.llm.retrievers.vector_store import PgVectorStore

    dimension = AppVars.RAG_EMBEDDING_DIMENSION
    store = PgVectorStore(embedding_dimension=dimension)
    document_id = uuid4()
    item_id = f"schema-contract-{document_id}"
    vector = [0.0] * dimension

    await store.create_document(
        document_id=document_id,
        source_filename="contract.txt",
        local_path="contract.txt",
        mime_type="text/plain",
        content_hash="contract",
        content_chars=5,
        chunk_size=100,
        chunk_overlap=0,
        embedding_model="contract",
        metadata={"knowledge_item_id": item_id, "chatbot_ids": ["contract-bot"]},
    )
    try:
        await store.replace_chunks(
            document_id=document_id,
            chunks=["hello"],
            embeddings=[vector],
            metadatas=[{}],
        )
        await store.update_chatbot_links(item_id, ["contract-bot"])
        await store.list_documents(limit=1)
        await store.count_completed_documents(chatbot_id="contract-bot")
        await store.similarity_search_chunks(
            embedding=vector, limit=1, chatbot_id="contract-bot"
        )
        await store.full_text_search_chunks(
            query="hello", limit=1, chatbot_id="contract-bot"
        )
        await store.mark_failed(document_id=document_id, error_message="contract")
        await store.upsert_media(
            knowledge_item_id=item_id, chatbot_ids=["contract-bot"], title="t",
            description="d", url="https://cdn/t.png", mime_type="image/png", embedding=vector,
        )
        await store.update_media_chatbot_links(item_id, ["contract-bot"])
        assert await store.delete_media_by_knowledge_item(item_id) == 1
    finally:
        assert await store.delete_by_knowledge_item(item_id) == 1
