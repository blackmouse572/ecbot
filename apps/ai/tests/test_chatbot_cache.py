"""#318: the per-request chatbot config query is cached, with explicit invalidation."""
from __future__ import annotations

from unittest.mock import MagicMock

import pytest

import eccho_ai.core.variables as cv
import eccho_ai.llm.agents.agent as agent_mod


@pytest.fixture(autouse=True)
def _clear_cache():
    agent_mod._fetch_chatbot_cached.cache_clear()
    yield
    agent_mod._fetch_chatbot_cached.cache_clear()


def _stub_query(monkeypatch, calls: dict, result=MagicMock()):
    async def _query(chatbot_id: str):
        calls["n"] = calls.get("n", 0) + 1
        return result

    monkeypatch.setattr(agent_mod, "_query_chatbot", _query)
    return result


async def test_repeated_fetch_hits_the_cache(monkeypatch):
    monkeypatch.setattr(cv.AppVars, "CHATBOT_CACHE_TTL_SECONDS", 60.0)
    calls: dict = {}
    bot = _stub_query(monkeypatch, calls)

    assert await agent_mod._fetch_chatbot("cb-1") is bot
    assert await agent_mod._fetch_chatbot("cb-1") is bot
    assert calls["n"] == 1


async def test_distinct_chatbots_are_cached_separately(monkeypatch):
    monkeypatch.setattr(cv.AppVars, "CHATBOT_CACHE_TTL_SECONDS", 60.0)
    calls: dict = {}
    _stub_query(monkeypatch, calls)

    await agent_mod._fetch_chatbot("cb-1")
    await agent_mod._fetch_chatbot("cb-2")
    assert calls["n"] == 2


async def test_invalidate_forces_a_refetch(monkeypatch):
    monkeypatch.setattr(cv.AppVars, "CHATBOT_CACHE_TTL_SECONDS", 60.0)
    calls: dict = {}
    _stub_query(monkeypatch, calls)

    await agent_mod._fetch_chatbot("cb-1")
    assert agent_mod.invalidate_chatbot("cb-1") is True
    await agent_mod._fetch_chatbot("cb-1")
    assert calls["n"] == 2


async def test_invalidate_unknown_chatbot_is_a_noop(monkeypatch):
    assert agent_mod.invalidate_chatbot("never-cached") is False


async def test_misses_are_not_cached(monkeypatch):
    """A chatbot created moments ago must not 404 for a whole TTL."""
    monkeypatch.setattr(cv.AppVars, "CHATBOT_CACHE_TTL_SECONDS", 60.0)
    calls: dict = {}
    _stub_query(monkeypatch, calls, result=None)

    assert await agent_mod._fetch_chatbot("cb-1") is None
    assert await agent_mod._fetch_chatbot("cb-1") is None
    assert calls["n"] == 2


async def test_zero_ttl_bypasses_the_cache(monkeypatch):
    monkeypatch.setattr(cv.AppVars, "CHATBOT_CACHE_TTL_SECONDS", 0.0)
    calls: dict = {}
    _stub_query(monkeypatch, calls)

    await agent_mod._fetch_chatbot("cb-1")
    await agent_mod._fetch_chatbot("cb-1")
    assert calls["n"] == 2


async def test_invalidate_endpoint_drops_the_cached_chatbot(monkeypatch, async_client):
    monkeypatch.setattr(cv.AppVars, "CHATBOT_CACHE_TTL_SECONDS", 60.0)
    calls: dict = {}
    _stub_query(monkeypatch, calls)

    await agent_mod._fetch_chatbot("cb-1")
    resp = await async_client.delete("/api/chat/chatbot-cache/cb-1")
    assert resp.status_code == 200
    assert resp.json()["data"] == {"invalidated": True}

    await agent_mod._fetch_chatbot("cb-1")
    assert calls["n"] == 2
