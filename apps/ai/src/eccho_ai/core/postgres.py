# repos/postgres.py
import asyncio
from functools import lru_cache
from typing import (
    Sequence,
    Type,
    Generic,
    TypeVar,
)
from sqlalchemy.sql._typing import _ColumnExpressionArgument
from sqlmodel import (
    SQLModel,
    select,
    delete,
    text,
)
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    async_sessionmaker,
    async_scoped_session,
)
from eccho_ai.core.variables import AppVars

_T = TypeVar("_T", bound=SQLModel)

_engine = create_async_engine(AppVars.POSTGRES_URL.get_secret_value())
_session_factory = async_sessionmaker(_engine, expire_on_commit=False, class_=AsyncSession)
_scoped_session = async_scoped_session(_session_factory, scopefunc=asyncio.current_task)


class PostgresRepo(Generic[_T]):
    def __init__(self) -> None:
        self.engine = _engine
        self.session_factory = _session_factory
        self.scoped_session = _scoped_session

    # =================================================================
    # Session Management
    # =================================================================

    @property
    def session(self) -> AsyncSession:
        """
        Retrieves the task-local session.
        Acts as a singleton per FastAPI request/async task.
        """
        return _scoped_session()

    @staticmethod
    async def clean_session():
        """Removes the task-local session. Should be called at the end of each request to prevent session leaks."""
        await _scoped_session.remove()

    async def connect(self):
        """Ensure tables are created in the database based on the defined SQLModel models"""
        async with self.engine.begin() as conn:
            await conn.execute(text("SELECT 1"))

    async def ping(self) -> None:
        """Liveness probe. Uses `connect()` (no transaction) rather than `begin()`,
        which would open and commit a transaction on every health probe."""
        async with self.engine.connect() as conn:
            await conn.execute(text("SELECT 1"))

    async def close(self):
        """Close the database connection"""
        await self.engine.dispose()

    # ── Session-unaware (open their own session) ───────────────────────────
    # Keep for use outside the job lifecycle (e.g. API routes, scripts)

    async def get_all(self, model: Type[_T], offset: int | None = None, limit: int | None = None) -> Sequence[_T]:
        async with self.session_factory() as session:
            stmt = select(model)
            if offset is not None: stmt = stmt.offset(offset)
            if limit is not None:  stmt = stmt.limit(limit)
            return (await session.exec(stmt)).all()

    async def get_by_id(self, model: Type[_T], id: str) -> _T | None:
        async with self.session_factory() as session:
            return await session.get(model, id)

    async def add(self, instance: _T) -> _T:
        async with self.session_factory() as session:
            async with session.begin():
                session.add(instance)
            return instance

    async def delete(self, model: Type[_T], id: str) -> None:
        async with self.session_factory() as session:
            async with session.begin():
                await session.exec(delete(model).where(getattr(model, "id") == id))

    # ── Session-aware (caller provides session) ────────────────────────────
    # Use these inside job lifecycle hooks to stay in one transaction

    async def with_session_add(self, session: AsyncSession, instance: _T) -> _T:
        session.add(instance)
        await session.flush()   # writes to DB, stays in transaction
        return instance

    async def with_session_add_all(self, session: AsyncSession, instances: list[_T]) -> None:
        """Add multiple instances in bulk and flush within the caller's transaction."""
        for instance in instances:
            session.add(instance)
        await session.flush()

    async def with_session_delete(self, session: AsyncSession, model: Type[_T], id: str) -> None:
        await session.exec(delete(model).where(getattr(model, "id") == id))
        await session.flush()

    async def with_session_delete_by_clauses(
        self,
        session: AsyncSession,
        model: Type[_T],
        *clauses: _ColumnExpressionArgument[bool],
    ) -> None:
        """Delete all rows matching *clauses* within the caller's transaction."""
        stmt = delete(model)
        for clause in clauses:
            stmt = stmt.where(clause)
        await session.exec(stmt)
        await session.flush()

    async def with_session_get_by_id(self, session: AsyncSession, model: Type[_T], id: str) -> _T | None:
        return await session.get(model, id)

    async def with_session_get_by_clauses(
        self,
        session: AsyncSession,
        model: Type[_T],
        *clauses: _ColumnExpressionArgument[bool] | bool,
        offset: int | None = None,
        limit: int | None = None,
    ) -> Sequence[_T]:
        stmt = select(model)
        for clause in clauses:
            stmt = stmt.where(clause)
        if offset is not None: stmt = stmt.offset(offset)
        if limit is not None:  stmt = stmt.limit(limit)
        return (await session.exec(stmt)).all()

    # =================================================================
    # Singleton Accessor
    # =================================================================

    @staticmethod
    @lru_cache(maxsize=1)
    def get_instance() -> "PostgresRepo":
        return PostgresRepo()
