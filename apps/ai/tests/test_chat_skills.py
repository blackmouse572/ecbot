"""Unit tests for build_skills / load_skill (no DB, no MinIO)."""
from __future__ import annotations

from types import SimpleNamespace

import pytest

from eccho_ai.llm.tools import skills as skills_mod
from eccho_ai.llm.tools.skills import build_skills


@pytest.fixture(autouse=True)
def _clear_skill_cache():
    """The memoization cache is module-level (shared across requests) — isolate tests."""
    skills_mod._skill_body_cache.clear()
    yield
    skills_mod._skill_body_cache.clear()


def _skill(slug, *, status="ACTIVE", bucket="b", key="k", description="desc", updated_at="v1"):
    return SimpleNamespace(
        slug=slug,
        status=status,
        s3_bucket=bucket,
        s3_key=key,
        description=description,
        updated_at=updated_at,
    )


def _cs(skill, *, enabled=True):
    return SimpleNamespace(enabled=enabled, skill=skill)


def _chatbot(chatbot_skills):
    return SimpleNamespace(id="cb-1", chatbot_skills=chatbot_skills)


def test_build_skills_empty_when_no_usable_skills():
    assert build_skills(_chatbot([])) == []
    assert build_skills(_chatbot([_cs(_skill("a"), enabled=False)])) == []
    assert build_skills(_chatbot([_cs(_skill("a", status="INACTIVE"))])) == []
    assert build_skills(_chatbot([_cs(_skill("a", key=None))])) == []


def test_build_skills_returns_load_skill_tool_with_listing():
    tools = build_skills(_chatbot([_cs(_skill("book-slot", description="đặt lịch"))]))
    assert len(tools) == 1
    assert tools[0].name == "load_skill"
    assert "book-slot: đặt lịch" in tools[0].description


async def test_load_skill_fetches_and_memoizes(monkeypatch):
    calls = []

    def fake_download(bucket, key):
        calls.append((bucket, key))
        return b"FULL INSTRUCTIONS"

    monkeypatch.setattr(skills_mod, "_download_from_s3", fake_download)
    tool = build_skills(_chatbot([_cs(_skill("book-slot", bucket="B", key="K"))]))[0]

    assert await tool.coroutine("book-slot") == "FULL INSTRUCTIONS"
    # memoized — second call does not hit S3 again
    assert await tool.coroutine("book-slot") == "FULL INSTRUCTIONS"
    assert calls == [("B", "K")]


async def test_load_skill_unknown_slug_lists_available(monkeypatch):
    monkeypatch.setattr(skills_mod, "_download_from_s3", lambda b, k: b"x")
    tool = build_skills(_chatbot([_cs(_skill("book-slot"))]))[0]
    out = await tool.coroutine("nope")
    assert "Unknown skill 'nope'" in out
    assert "book-slot" in out


async def test_load_skill_graceful_degrade_on_s3_error(monkeypatch):
    def boom(bucket, key):
        raise RuntimeError("s3 down")

    monkeypatch.setattr(skills_mod, "_download_from_s3", boom)
    tool = build_skills(_chatbot([_cs(_skill("book-slot"))]))[0]
    out = await tool.coroutine("book-slot")
    assert "temporarily unavailable" in out


async def test_load_skill_truncates_oversized_body(monkeypatch):
    monkeypatch.setattr(skills_mod, "_S3_MAX_BYTES", 10)
    monkeypatch.setattr(skills_mod, "_download_from_s3", lambda b, k: b"x" * 20)
    tool = build_skills(_chatbot([_cs(_skill("book-slot"))]))[0]
    out = await tool.coroutine("book-slot")
    assert out == "x" * 10


async def test_load_skill_memoizes_across_build_skills_calls(monkeypatch):
    """Simulates two separate chat requests: each rebuilds tools via a fresh
    build_skills() call, but the S3 body should only be fetched once."""
    calls = []

    def fake_download(bucket, key):
        calls.append((bucket, key))
        return b"FULL INSTRUCTIONS"

    monkeypatch.setattr(skills_mod, "_download_from_s3", fake_download)

    tool_1 = build_skills(_chatbot([_cs(_skill("book-slot", bucket="B", key="K"))]))[0]
    assert await tool_1.coroutine("book-slot") == "FULL INSTRUCTIONS"

    # New chatbot/tool instance, same skill — mirrors a second request.
    tool_2 = build_skills(_chatbot([_cs(_skill("book-slot", bucket="B", key="K"))]))[0]
    assert await tool_2.coroutine("book-slot") == "FULL INSTRUCTIONS"

    assert calls == [("B", "K")]


async def test_load_skill_refetches_when_updated_at_changes(monkeypatch):
    calls = []

    def fake_download(bucket, key):
        calls.append((bucket, key))
        return f"body-{len(calls)}".encode()

    monkeypatch.setattr(skills_mod, "_download_from_s3", fake_download)

    tool_1 = build_skills(_chatbot([_cs(_skill("book-slot", updated_at="v1"))]))[0]
    assert await tool_1.coroutine("book-slot") == "body-1"

    # Same updated_at across a rebuild — served from cache, no second download.
    tool_2 = build_skills(_chatbot([_cs(_skill("book-slot", updated_at="v1"))]))[0]
    assert await tool_2.coroutine("book-slot") == "body-1"
    assert len(calls) == 1

    # Skill content changed — new updated_at busts the cache.
    tool_3 = build_skills(_chatbot([_cs(_skill("book-slot", updated_at="v2"))]))[0]
    assert await tool_3.coroutine("book-slot") == "body-2"
    assert len(calls) == 2
