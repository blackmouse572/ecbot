"""Functional tests for `build_customer_context_block` (#174).

Uses an in-memory async SQLite engine and monkey-patches the singleton
PostgresRepo to point at it. The shared `event_loop` fixture in conftest is
session-scoped, so we tear down the engine per-test for isolation.
"""
from __future__ import annotations

from uuid import UUID, uuid4

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

pytestmark = pytest.mark.integration

from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

# Importing the models registers them on SQLModel.metadata so create_all works.
from eccho_ai.models.customers import Customers
from eccho_ai.models.customer_tags import CustomerTags
from eccho_ai.models.customer_tag_assignments import CustomerTagAssignments
from eccho_ai.modules.chat import customer_context as customer_context_module
from eccho_ai.modules.chat.customer_context import build_customer_context_block
from eccho_ai.core.postgres import PostgresRepo


@pytest.fixture
async def sqlite_repo(monkeypatch):
    """Spin up a fresh in-memory async-SQLite engine and bind PostgresRepo to it.

    apps/ai's `build_customer_context_block` resolves the repo via
    `PostgresRepo.get_instance()`. We replace that singleton's session factory
    for the test only.
    """
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    real_instance = PostgresRepo.get_instance()
    original_factory = real_instance.session_factory
    real_instance.session_factory = factory  # type: ignore[assignment]

    try:
        yield factory
    finally:
        real_instance.session_factory = original_factory  # type: ignore[assignment]
        await engine.dispose()


async def _make_customer(
    factory,
    *,
    workspace_id: UUID | None = None,
    name: str | None = None,
    profile_summary: str | None = None,
    merged_into: UUID | None = None,
) -> Customers:
    customer = Customers(
        workspace_id=workspace_id or uuid4(),
        name=name,
        profile_summary=profile_summary,
        merged_into_customer_id=merged_into,
    )
    async with factory() as session:
        session.add(customer)
        await session.commit()
        await session.refresh(customer)
    return customer


async def _make_tag(
    factory,
    workspace_id: UUID,
    name: str,
    *,
    emoji: str | None = None,
    description: str | None = None,
    triggers_handoff: bool = False,
) -> CustomerTags:
    tag = CustomerTags(
        workspace_id=workspace_id,
        name=name,
        emoji=emoji,
        description=description,
        triggers_handoff=triggers_handoff,
    )
    async with factory() as session:
        session.add(tag)
        await session.commit()
        await session.refresh(tag)
    return tag


async def _apply_tag(factory, customer_id: UUID, tag_id: UUID) -> None:
    assignment = CustomerTagAssignments(customer_id=customer_id, tag_id=tag_id)
    async with factory() as session:
        session.add(assignment)
        await session.commit()


async def test_returns_empty_string_when_customer_id_is_none(sqlite_repo):
    block = await build_customer_context_block(None)
    assert block == ""


async def test_unknown_customer_returns_empty_string(sqlite_repo):
    # session.get() accepts the native UUID; production passes the string and
    # SQLAlchemy's Uuid type coerces under PG. On SQLite we pass the UUID.
    block = await build_customer_context_block(uuid4())
    assert block == ""


async def test_block_for_customer_with_no_tags_and_empty_profile(sqlite_repo):
    customer = await _make_customer(sqlite_repo)

    block = await build_customer_context_block(customer.id)

    assert "Name: Unknown" in block
    assert "Applied tags: none" in block
    # Workspace has zero tags — catalog rendered with the empty marker.
    assert "(no tags defined in this workspace)" in block


async def test_block_lists_applied_tag_names(sqlite_repo):
    customer = await _make_customer(sqlite_repo, name="Alice")
    tag_vip = await _make_tag(sqlite_repo, customer.workspace_id, "VIP", emoji="⭐")
    tag_hot = await _make_tag(sqlite_repo, customer.workspace_id, "Hot lead")
    await _apply_tag(sqlite_repo, customer.id, tag_vip.id)
    await _apply_tag(sqlite_repo, customer.id, tag_hot.id)

    block = await build_customer_context_block(customer.id)

    assert "Name: Alice" in block
    # Both applied tag names appear on the Applied tags line.
    applied_line = next(
        line for line in block.splitlines() if line.startswith("Applied tags:")
    )
    assert "VIP" in applied_line
    assert "Hot lead" in applied_line


async def test_block_includes_profile_summary_when_set(sqlite_repo):
    customer = await _make_customer(
        sqlite_repo,
        name="Alice",
        profile_summary="Long-time buyer who prefers Vietnamese.",
    )

    block = await build_customer_context_block(customer.id)

    assert "Long-time buyer who prefers Vietnamese." in block


async def test_merged_customer_is_invisible_to_agent(sqlite_repo):
    # A is the canonical record; B has been merged into A.
    customer_a = await _make_customer(sqlite_repo, name="Canonical")
    customer_b = await _make_customer(
        sqlite_repo,
        workspace_id=customer_a.workspace_id,
        name="Duplicate",
        merged_into=customer_a.id,
    )

    block_a = await build_customer_context_block(customer_a.id)
    block_b = await build_customer_context_block(customer_b.id)

    assert block_a != ""
    assert "Canonical" in block_a
    # Merged-away record returns empty so the agent never sees a duplicate identity.
    assert block_b == ""


async def test_catalog_caps_at_twelve_and_marks_truncation(sqlite_repo):
    customer = await _make_customer(sqlite_repo, name="Alice")
    # Create 15 tags; only 12 most-recent should appear, plus a "…" truncation row.
    for i in range(15):
        await _make_tag(sqlite_repo, customer.workspace_id, f"tag-{i:02d}")

    block = await build_customer_context_block(customer.id)

    catalog_lines = [
        line for line in block.splitlines() if line.startswith("- ")
    ]
    # 12 tag rows + 1 truncation row.
    assert len(catalog_lines) == 13
    assert catalog_lines[-1].strip() == "- …"
