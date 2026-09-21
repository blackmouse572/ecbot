# jobs/base.py
from abc import ABC, abstractmethod
from typing import Generic, TypeVar, Type, Any
from datetime import datetime
from uuid import UUID
import asyncio
import logging

from sqlmodel import SQLModel, Field, select, update
from sqlmodel.ext.asyncio.session import AsyncSession

from sqlalchemy.sql._typing import _ColumnExpressionArgument
from eccho_ai.core.postgres import PostgresRepo
from eccho_ai.jobs.constants import DEFAULT_DB_QUERY_LIMIT, DEFAULT_SEMAPHORE_LIMIT


logger = logging.getLogger(__name__)


class _WatchTable(SQLModel, table=False):
    '''Base schema for the table a job watches. Used for type hinting.
    Must have at least 'id' and 'created_at' fields for the locking mechanism to work.'''
    id: UUID | str = Field(...)
    created_at: datetime = Field(...)

_WatchTableSchema = TypeVar("_WatchTableSchema", bound=_WatchTable)


class BaseJob(ABC, Generic[_WatchTableSchema]):
    table: Type[_WatchTableSchema]
    where_clauses: _ColumnExpressionArgument[bool] | bool = True
    updated_values: dict[str, Any] = {}

    db_query_limit:  int = DEFAULT_DB_QUERY_LIMIT
    semaphore_limit: int = DEFAULT_SEMAPHORE_LIMIT

    def __init__(self) -> None:
        self._sem  = asyncio.Semaphore(self.semaphore_limit)
        self._repo: PostgresRepo[_WatchTableSchema] = PostgresRepo.get_instance()

    # ── Lifecycle hooks (all receive the SAME session) ─────────────────────

    @abstractmethod
    async def before_execute(
        self,
        session: AsyncSession,
        repo: PostgresRepo[_WatchTableSchema],
        records: list[_WatchTableSchema],
    ) -> None:
        """Bulk prep. Records are already locked. Update statuses freely."""
        pass

    @abstractmethod
    async def execute(
        self,
        session: AsyncSession,
        repo: PostgresRepo[_WatchTableSchema],
        record: _WatchTableSchema,
    ) -> None:
        """Core logic for one record."""

    @abstractmethod
    async def after_execute(
        self,
        session: AsyncSession,
        repo: PostgresRepo[_WatchTableSchema],
        record: _WatchTableSchema,
    ) -> None:
        """Called on success. Mark DONE, save results."""
        pass

    @abstractmethod
    async def on_error(
        self,
        session: AsyncSession,
        repo: PostgresRepo[_WatchTableSchema],
        record: _WatchTableSchema,
        error: Exception,
    ) -> None:
        """Called on failure. Mark FAILED, log, alert."""
        pass

    # ── Fetch + lock ───────────────────────────────────────────────────────

    async def _fetch_records(self, session: AsyncSession) -> list[_WatchTableSchema]:
        # Step 1: Lock row IDs using SELECT FOR UPDATE SKIP LOCKED (avoids parallel workers
        #         picking the same rows).  The lock is held for the duration of the transaction
        #         so the caller must commit (or roll back) when done.
        locked_stmt = (
            select(self.table.id)
            .where(self.where_clauses)
            .order_by(self.table.created_at)  # type: ignore[union-attr]
            .limit(self.db_query_limit)
            .with_for_update(skip_locked=True)
        )
        id_rows = (await session.exec(locked_stmt)).all()

        if not id_rows:
            return []

        ids = list(id_rows)

        # Step 2: Atomically stamp the rows (e.g. status → PROCESSING) if configured.
        #         Guard against an empty dict which would produce invalid SQL.
        if self.updated_values:
            await session.exec(
                update(self.table)
                .where(self.table.id.in_(ids))   # type: ignore[union-attr]
                .values(**self.updated_values)
            )

        # Step 3: Re-fetch as session-tracked objects so that before_execute can
        #         modify them and those changes will be flushed on commit.
        result = await session.exec(
            select(self.table).where(self.table.id.in_(ids))  # type: ignore[union-attr]
        )
        return list(result.all())

    # ── Per-record runner ──────────────────────────────────────────────────

    async def _run_one(self, record: _WatchTableSchema) -> None:
        """
        Each record gets its OWN session.

        Why not share the before_execute session here?
        before_execute may commit (e.g. bulk status update). After commit,
        SQLAlchemy expires all attributes on tracked objects. Reusing that
        session across concurrent _run_one calls causes attribute access on
        expired instances in parallel — a detached instance race condition.
        One session per record = clean isolation.
        """
        async with self._sem:
            async with self._repo.session_factory() as session:
                try:
                    await self.execute(session, self._repo, record)
                    await self.after_execute(session, self._repo, record)
                    await session.commit()
                except Exception as exc:
                    await session.rollback()
                    try:
                        await self.on_error(session, self._repo, record, exc)
                        await session.commit()
                    except Exception as hook_exc:
                        logger.error(f"[{self.__class__.__name__}] on_error hook failed: {hook_exc}")

    # ── Heartbeat entrypoint ───────────────────────────────────────────────

    async def run(self) -> int:
        """
        Execute one full tick: fetch → before_execute → execute×N.
        Returns number of records processed.
        The heartbeat loop (sleep + repeat) lives in runner.py.
        """
        async with self._repo.session_factory() as session:
            # Fetch and lock records, stamp them (e.g. PROCESSING) — all in one transaction.
            records = await self._fetch_records(session)
            if not records:
                return 0

            # Allow subclasses to do bulk prep while the rows are still in the transaction.
            await self.before_execute(session, self._repo, records)
            await session.commit()

        # Each record is processed in its own independent session.
        await asyncio.gather(*[self._run_one(r) for r in records])
        return len(records)