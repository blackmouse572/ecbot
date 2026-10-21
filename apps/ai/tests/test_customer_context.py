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
    notifies_team: bool = False,
) -> CustomerTags:
    tag = CustomerTags(
        workspace_id=workspace_id,
        name=name,
        emoji=emoji,
        description=description,
        triggers_handoff=triggers_handoff,
        notifies_team=notifies_team,
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


async def test_catalog_header_says_to_pass_the_bare_tag_name(sqlite_repo):
    # A live run sent "Angry 🚨" as the name: the lookup is by exact name, so
    # the tag 404s and the handoff never fires (#282).
    customer = await _make_customer(sqlite_repo)

    block = await build_customer_context_block(customer.id)

    assert "apply_customer_tag" in block
    assert "applyCustomerTag" not in block
    assert "only the text inside the quotes" in block


async def test_catalog_marks_notify_only_tags(sqlite_repo):
    # #288: the agent applies a notify-only tag after its order tool places
    # an order; the prompt finds it by this marker, like "(triggers handoff)".
    customer = await _make_customer(sqlite_repo)
    await _make_tag(sqlite_repo, customer.workspace_id, "Order placed", emoji="🛒", notifies_team=True)
    await _make_tag(
        sqlite_repo, customer.workspace_id, "New order", triggers_handoff=True, notifies_team=True
    )

    block = await build_customer_context_block(customer.id)

    lines = block.splitlines()
    placed = next(line for line in lines if '"Order placed"' in line)
    assert placed.endswith("(notifies the team)")
    # A handoff tag already notifies, so it keeps its one marker.
    new_order = next(line for line in lines if '"New order"' in line)
    assert new_order.endswith("(triggers handoff)")
    assert "notifies the team" not in new_order


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


async def test_staff_note_at_the_end_of_a_long_summary_reaches_the_agent(sqlite_repo):
    summary = "x" * 600 + " Staff call her cô and keep replies short."
    customer = await _make_customer(sqlite_repo, name="Alice", profile_summary=summary)

    block = await build_customer_context_block(customer.id)

    assert "Staff call her cô and keep replies short." in block


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


async def test_catalog_caps_at_twenty_and_marks_truncation(sqlite_repo):
    customer = await _make_customer(sqlite_repo, name="Alice")
    # Create 23 tags; only 20 most-recent should appear, plus a "…" truncation row.
    for i in range(23):
        await _make_tag(sqlite_repo, customer.workspace_id, f"tag-{i:02d}")

    block = await build_customer_context_block(customer.id)

    catalog_lines = [
        line for line in block.splitlines() if line.startswith("- ")
    ]
    # 20 tag rows + 1 truncation row.
    assert len(catalog_lines) == 21
    assert catalog_lines[-1].strip() == "- …"
