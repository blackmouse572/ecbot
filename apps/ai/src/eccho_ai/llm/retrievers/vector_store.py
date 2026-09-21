from datetime import datetime
from typing import Any
from uuid import UUID, uuid4
import asyncio
import json
import re

import asyncpg

from eccho_ai.core.variables import AppVars


_POOL: asyncpg.Pool | None = None
_POOL_LOCK = asyncio.Lock()


async def get_pool() -> asyncpg.Pool:
    global _POOL
    if _POOL is None:
        async with _POOL_LOCK:
            if _POOL is None:
                _POOL = await asyncpg.create_pool(
                    dsn=_asyncpg_dsn(),
                    min_size=1,
                    max_size=10,
                    # Resolve unqualified table names to the dedicated `rag` schema
                    # first; keep `public` for the `vector` type/extension.
                    server_settings={"search_path": "rag, public"},
                )
    return _POOL


_SQLALCHEMY_DRIVER_PREFIX = re.compile(r"^postgresql\+asyncpg://")
_SSL_QUERY_PARAM = re.compile(r"([?&])ssl=")


def _asyncpg_dsn() -> str:
    """Raw asyncpg DSN derived from the SQLAlchemy-style settings URL.

    Drops the `+asyncpg` driver suffix and turns `ssl=` back into libpq's
    `sslmode=`: variables.py rewrites sslmode -> ssl for the SQLAlchemy engine,
    but asyncpg only knows `sslmode` and would forward `ssl` to the server as an
    unknown configuration parameter.
    """
    secret = AppVars.RAG_POSTGRES_URL or AppVars.POSTGRES_URL
    plain = _SQLALCHEMY_DRIVER_PREFIX.sub("postgresql://", secret.get_secret_value())
    return _SSL_QUERY_PARAM.sub(r"\1sslmode=", plain)


def _vector_literal(values: list[float]) -> str:
    return "[" + ",".join(str(float(value)) for value in values) + "]"


def _jsonb_dict(value: Any) -> dict[str, Any]:
    if value is None:
        return {}
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        loaded = json.loads(value)
        if isinstance(loaded, dict):
            return loaded
        return {"value": loaded}
    return dict(value)


def _chunk_row(row: asyncpg.Record) -> dict[str, Any]:
    data = dict(row)
    data["chunk_metadata"] = _jsonb_dict(row["chunk_metadata"])
    data["document_metadata"] = _jsonb_dict(row["document_metadata"])
    return data


class PgVectorStore:
    def __init__(self, *, embedding_dimension: int):
        self.embedding_dimension = embedding_dimension

    async def ensure_schema(self) -> None:
        pool = await get_pool()
        async with pool.acquire() as conn:
            # RAG tables live in a dedicated `rag` schema rather than `public` so
            # apps/api's MikroORM (which manages `public`) never sees them as schema
            # drift and can't inject spurious create/drop into its migrations. The
            # pool's search_path=rag,public makes the unqualified names below resolve
            # to `rag`, while the `vector` type stays in `public`.
            await conn.execute("CREATE SCHEMA IF NOT EXISTS rag")
            await conn.execute("CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public")
            # One-time migration off the legacy `public` location: drop the old
            # public.rag_* tables so MikroORM stops diffing them. These tables are
            # owned solely by apps/ai and their contents are re-ingestible.
            await conn.execute(
                "DROP TABLE IF EXISTS public.rag_document_chunks, public.rag_documents CASCADE"
            )
            await conn.execute(
                """
                CREATE TABLE IF NOT EXISTS rag_documents (
                    id uuid PRIMARY KEY,
                    source_filename text NOT NULL,
                    local_path text NOT NULL,
                    mime_type text,
                    content_hash text NOT NULL,
                    content_chars integer NOT NULL DEFAULT 0,
                    chunk_count integer NOT NULL DEFAULT 0,
                    chunk_size integer NOT NULL,
                    chunk_overlap integer NOT NULL,
                    embedding_model text NOT NULL,
                    embedding_dimension integer NOT NULL,
                    status text NOT NULL DEFAULT 'PROCESSING',
                    error_message text,
                    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
                    created_at timestamptz NOT NULL DEFAULT now(),
                    updated_at timestamptz NOT NULL DEFAULT now()
                )
                """
            )
            await conn.execute(
                f"""
                CREATE TABLE IF NOT EXISTS rag_document_chunks (
                    id uuid PRIMARY KEY,
                    document_id uuid NOT NULL REFERENCES rag_documents(id) ON DELETE CASCADE,
                    chunk_index integer NOT NULL,
                    content text NOT NULL,
                    content_chars integer NOT NULL,
                    embedding vector({self.embedding_dimension}) NOT NULL,
                    metadata jsonb NOT NULL DEFAULT '{{}}'::jsonb,
                    created_at timestamptz NOT NULL DEFAULT now(),
                    UNIQUE(document_id, chunk_index)
                )
                """
            )
            try:
                await conn.execute(
                    """
                    CREATE INDEX IF NOT EXISTS rag_document_chunks_embedding_hnsw_idx
                    ON rag_document_chunks
                    USING hnsw (embedding vector_cosine_ops)
                    """
                )
            except asyncpg.PostgresError:
                await conn.execute(
                    """
                    CREATE INDEX IF NOT EXISTS rag_document_chunks_embedding_ivfflat_idx
                    ON rag_document_chunks
                    USING ivfflat (embedding vector_cosine_ops)
                    """
                )
            await conn.execute(
                """
                CREATE INDEX IF NOT EXISTS rag_documents_knowledge_item_idx
                ON rag_documents ((metadata->>'knowledge_item_id'))
                """
            )
            await conn.execute(
                """
                CREATE INDEX IF NOT EXISTS rag_documents_chatbot_ids_gin_idx
                ON rag_documents USING GIN (metadata jsonb_path_ops)
                """
            )

    async def create_document(
        self,
        *,
        document_id: UUID,
        source_filename: str,
        local_path: str,
        mime_type: str | None,
        content_hash: str,
        content_chars: int,
        chunk_size: int,
        chunk_overlap: int,
        embedding_model: str,
        metadata: dict[str, Any],
    ) -> None:
        pool = await get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO rag_documents (
                    id, source_filename, local_path, mime_type, content_hash,
                    content_chars, chunk_size, chunk_overlap, embedding_model,
                    embedding_dimension, status, metadata
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PROCESSING', $11::jsonb)
                """,
                document_id,
                source_filename,
                local_path,
                mime_type,
                content_hash,
                content_chars,
                chunk_size,
                chunk_overlap,
                embedding_model,
                self.embedding_dimension,
                json.dumps(metadata),
            )

    async def replace_chunks(
        self,
        *,
        document_id: UUID,
        chunks: list[str],
        embeddings: list[list[float]],
        metadatas: list[dict[str, Any]],
    ) -> None:
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.transaction():
                await conn.execute(
                    "DELETE FROM rag_document_chunks WHERE document_id = $1",
                    document_id,
                )
                await conn.executemany(
                    """
                    INSERT INTO rag_document_chunks (
                        id, document_id, chunk_index, content, content_chars, embedding, metadata
                    )
                    VALUES ($1, $2, $3, $4, $5, $6::vector, $7::jsonb)
                    """,
                    [
                        (
                            uuid4(),
                            document_id,
                            index,
                            chunk,
                            len(chunk),
                            _vector_literal(embedding),
                            json.dumps(metadatas[index]),
                        )
                        for index, (chunk, embedding) in enumerate(zip(chunks, embeddings))
                    ],
                )
                await conn.execute(
                    """
                    UPDATE rag_documents
                    SET chunk_count = $2, status = 'COMPLETED', error_message = NULL, updated_at = now()
                    WHERE id = $1
                    """,
                    document_id,
                    len(chunks),
                )

    async def mark_failed(self, *, document_id: UUID, error_message: str) -> None:
        pool = await get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE rag_documents
                SET status = 'FAILED', error_message = $2, updated_at = now()
                WHERE id = $1
                """,
                document_id,
                error_message,
            )

    async def delete_by_knowledge_item(self, knowledge_item_id: str) -> int:
        """Delete all documents whose metadata.knowledge_item_id matches.

        Chunks are removed via ON DELETE CASCADE.
        Returns the number of document rows deleted.
        """
        pool = await get_pool()
        async with pool.acquire() as conn:
            result = await conn.execute(
                "DELETE FROM rag_documents WHERE metadata->>'knowledge_item_id' = $1",
                knowledge_item_id,
            )
            # asyncpg returns e.g. "DELETE 1"
            return int(result.split()[-1]) if result else 0

    async def update_chatbot_links(self, knowledge_item_id: str, chatbot_ids: list[str]) -> int:
        pool = await get_pool()
        async with pool.acquire() as conn:
            result = await conn.execute(
                """
                UPDATE rag_documents
                SET metadata = jsonb_set(metadata, '{chatbot_ids}', $2::jsonb, true),
                    updated_at = now()
                WHERE metadata->>'knowledge_item_id' = $1
                """,
                knowledge_item_id,
                json.dumps(chatbot_ids),
            )
            return int(result.split()[-1]) if result else 0

    async def list_documents(self, *, limit: int = 20) -> list[dict[str, Any]]:
        pool = await get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT
                    id,
                    source_filename AS filename,
                    local_path AS stored_path,
                    mime_type,
                    content_chars,
                    chunk_count,
                    chunk_size,
                    chunk_overlap,
                    embedding_model,
                    embedding_dimension,
                    status,
                    error_message,
                    metadata,
                    created_at
                FROM rag_documents
                ORDER BY created_at DESC
                LIMIT $1
                """,
                limit,
            )
            return [
                {
                    **dict(row),
                    "metadata": _jsonb_dict(row["metadata"]),
                    "created_at": row["created_at"] or datetime.now(),
                }
                for row in rows
            ]

    async def similarity_search_chunks(
        self,
        *,
        embedding: list[float],
        chatbot_id: str,
        limit: int,
    ) -> list[dict[str, Any]]:
        pool = await get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT
                    c.id AS chunk_id,
                    c.document_id,
                    c.chunk_index,
                    c.content,
                    c.content_chars,
                    c.metadata AS chunk_metadata,
                    d.source_filename AS filename,
                    d.local_path AS stored_path,
                    d.metadata AS document_metadata,
                    d.created_at AS document_created_at,
                    c.embedding <=> $1::vector AS distance
                FROM rag_document_chunks c
                JOIN rag_documents d ON d.id = c.document_id
                WHERE
                    d.status = 'COMPLETED'
                    AND (d.metadata->'chatbot_ids' ? $2 OR d.metadata->>'chatbot_id' = $2)
                ORDER BY c.embedding <=> $1::vector
                LIMIT $3
                """,
                _vector_literal(embedding),
                chatbot_id,
                limit,
            )
            return [_chunk_row(row) for row in rows]

    async def count_completed_documents(self, *, chatbot_id: str) -> int:
        pool = await get_pool()
        async with pool.acquire() as conn:
            return await conn.fetchval(
                """
                SELECT COUNT(*)
                FROM rag_documents
                WHERE status = 'COMPLETED'
                    AND (metadata->'chatbot_ids' ? $1 OR metadata->>'chatbot_id' = $1)
                """,
                chatbot_id,
            )

    async def full_text_search_chunks(
        self,
        *,
        query: str,
        chatbot_id: str,
        limit: int,
    ) -> list[dict[str, Any]]:
        pool = await get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                WITH q AS (
                    SELECT websearch_to_tsquery('simple', $1) AS query
                )
                SELECT
                    c.id AS chunk_id,
                    c.document_id,
                    c.chunk_index,
                    c.content,
                    c.content_chars,
                    c.metadata AS chunk_metadata,
                    d.source_filename AS filename,
                    d.local_path AS stored_path,
                    d.metadata AS document_metadata,
                    d.created_at AS document_created_at,
                    ts_rank_cd(to_tsvector('simple', c.content), q.query) AS fts_rank
                FROM rag_document_chunks c
                JOIN rag_documents d ON d.id = c.document_id
                CROSS JOIN q
                WHERE
                    d.status = 'COMPLETED'
                    AND (d.metadata->'chatbot_ids' ? $2 OR d.metadata->>'chatbot_id' = $2)
                    AND to_tsvector('simple', c.content) @@ q.query
                ORDER BY fts_rank DESC, c.chunk_index ASC
                LIMIT $3
                """,
                query,
                chatbot_id,
                limit,
            )
            return [_chunk_row(row) for row in rows]
