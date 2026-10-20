"""Boot behavior of the app: what runs when the server starts and stops.

The seam is the app's lifespan. Postgres is faked at its boundary
(`PostgresRepo.get_instance` and the asyncpg pool), nothing inside the app is mocked.
"""
from __future__ import annotations

import asyncio
from pathlib import Path

import pytest

from eccho_ai.core.variables import AppVars
from eccho_ai.llm.prompts.loader import system_prompt_template
from eccho_ai.main import app


class FakeDb:
    def __init__(self) -> None:
        self.connect_calls = 0
        self.close_calls = 0

    async def connect(self) -> None:
        self.connect_calls += 1

    async def close(self) -> None:
        self.close_calls += 1


@pytest.fixture
def fake_db(monkeypatch: pytest.MonkeyPatch) -> FakeDb:
    db = FakeDb()
    monkeypatch.setattr("eccho_ai.main.PostgresRepo.get_instance", lambda: db)

    async def _get_pool() -> None:
        return None

    monkeypatch.setattr("eccho_ai.llm.retrievers.vector_store.get_pool", _get_pool)
    monkeypatch.setenv("ENABLE_INPROCESS_JOBS", "false")
    return db


async def test_boot_fails_naming_the_path_when_agent_prompt_path_is_missing(
    fake_db: FakeDb, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    missing = tmp_path / "nope" / "AGENT.md"
    monkeypatch.setattr(AppVars, "AGENT_PROMPT_PATH", missing)
    system_prompt_template.cache_clear()
    try:
        with pytest.raises(FileNotFoundError) as excinfo:
            async with app.router.lifespan_context(app):
                pytest.fail("the app should not finish booting")
    finally:
        system_prompt_template.cache_clear()

    assert excinfo.value.filename == str(missing)
    assert fake_db.connect_calls == 0


class FakeHeartbeat:
    def __init__(self) -> None:
        self.started = False
        self.cancelled = False

    async def __call__(self, jobs: list, interval: float) -> None:
        self.started = True
        try:
            await asyncio.Event().wait()
        except asyncio.CancelledError:
            self.cancelled = True
            raise


@pytest.fixture
def heartbeat(monkeypatch: pytest.MonkeyPatch) -> FakeHeartbeat:
    fake = FakeHeartbeat()
    monkeypatch.setattr("eccho_ai.jobs.main.heartbeat", fake)
    return fake


async def test_in_process_jobs_stay_off_by_default(
    fake_db: FakeDb, heartbeat: FakeHeartbeat, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.delenv("ENABLE_INPROCESS_JOBS", raising=False)
    async with app.router.lifespan_context(app):
        await asyncio.sleep(0)
        assert not heartbeat.started


async def test_in_process_jobs_run_when_enabled_and_stop_on_shutdown(
    fake_db: FakeDb, heartbeat: FakeHeartbeat, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("ENABLE_INPROCESS_JOBS", "true")
    async with app.router.lifespan_context(app):
        await asyncio.sleep(0)
        assert heartbeat.started
    assert heartbeat.cancelled


async def test_boot_connects_the_database_and_shutdown_closes_it(fake_db: FakeDb) -> None:
    async with app.router.lifespan_context(app):
        assert fake_db.connect_calls == 1
    assert fake_db.close_calls == 1
