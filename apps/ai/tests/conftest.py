# tests/conftest.py
"""Shared pytest fixtures for the eccho-ai test suite.

Combines #139's TestClient + strict-env setup with the async fixtures added
on main (#172/#174/#176).
"""
from __future__ import annotations

import asyncio
import os
import sys
import warnings
from collections.abc import AsyncIterator, Iterator
from pathlib import Path
from typing import Any

import pytest
from dotenv import load_dotenv

# 1. Platform-agnostic path resolution
# Resolves to the parent directory of 'tests/'
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

# 2. Environment Detection — load .env if it exists; in CI env vars are injected directly.
env_path = ROOT_DIR / ".env"
if not env_path.exists():
    warnings.warn(
        f"No .env file at {env_path}. "
        "Relying on system environment variables (acceptable in CI).",
        stacklevel=1,
    )

# Load the environment variables (no-op if file is absent)
load_dotenv(env_path)

# `_AppVars` (pydantic-settings) requires POSTGRES_URL, and it is instantiated at
# import time by many modules — so collection fails in CI (no .env) before the
# `integration` marker can deselect the DB tests. Provide a dummy so imports and
# collection succeed everywhere; nothing connects at import time. Tests that need
# a real database are marked `integration` and supply a real URL.
os.environ.setdefault("POSTGRES_URL", "postgresql://user:pass@localhost:5432/eccho_test")

# Every chat/customer/rag route requires a matching X-Internal-Token header
# (see `core/security.py`). Give the shared clients below a default token +
# header so existing tests don't each need to know about auth.
TEST_INTERNAL_TOKEN = "test-internal-token"
os.environ.setdefault("API_INTERNAL_TOKEN", TEST_INTERNAL_TOKEN)

# 3. Import app ONLY AFTER paths and envs are loaded.
#    Wrapped in try/except so that DB-less environments can still run
#    fixtures that don't require the full FastAPI app (e.g. pg_store_factory).
try:
    from eccho_ai.main import app as _fastapi_app
    from fastapi.testclient import TestClient
    _APP_AVAILABLE = True
except Exception as _import_err:  # noqa: BLE001
    warnings.warn(
        f"Could not import FastAPI app (check env vars / DB config): {_import_err}",
        stacklevel=1,
    )
    _fastapi_app = None  # type: ignore[assignment]
    _APP_AVAILABLE = False


@pytest.fixture(scope="session")
def client():
    """Provides a global TestClient for all tests."""
    if not _APP_AVAILABLE:
        pytest.skip("FastAPI app unavailable — check env vars / DB config")
    with TestClient(
        _fastapi_app, headers={"X-Internal-Token": TEST_INTERNAL_TOKEN}
    ) as c:
        yield c


@pytest.fixture(scope="session")
def event_loop() -> Iterator[asyncio.AbstractEventLoop]:
    """Shared event loop for async tests (overrides pytest-asyncio default of
    one-loop-per-test so module-scoped async fixtures work)."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
async def async_client() -> AsyncIterator[Any]:
    """An httpx.AsyncClient bound to the FastAPI app via ASGITransport.

    Lazily imports the app so importing this conftest doesn't pay the cost of
    spinning up the whole app for tests that don't need it.
    """
    if not _APP_AVAILABLE:
        pytest.skip("FastAPI app unavailable — check env vars / DB config")
    import httpx

    transport = httpx.ASGITransport(_fastapi_app)
    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
        headers={"X-Internal-Token": TEST_INTERNAL_TOKEN},
    ) as c:
        yield c


# ---------------------------------------------------------------------------
# Postgres fixtures (RAG pipeline tests)
# ---------------------------------------------------------------------------

@pytest.fixture
def pg_store_factory():
    """Return a zero-argument factory that creates a PgVectorStore.

    Skips automatically when neither RAG_POSTGRES_URL nor POSTGRES_URL is
    configured — keeps the test suite green in CI environments without a DB.
    """
    db_url = os.environ.get("RAG_POSTGRES_URL") or os.environ.get("POSTGRES_URL") or ""
    if not db_url:
        pytest.skip("RAG_POSTGRES_URL / POSTGRES_URL not set — skipping DB tests")

    def factory():
        from eccho_ai.llm.retrievers.vector_store import PgVectorStore
        from eccho_ai.core.variables import AppVars
        return PgVectorStore(embedding_dimension=AppVars.RAG_EMBEDDING_DIMENSION)

    return factory
