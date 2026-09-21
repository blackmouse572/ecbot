from types import SimpleNamespace

import pytest

from eccho_ai.llm.retrievers import vector_store

CASES = {
    "ssl-only": (
        "postgresql+asyncpg://u:p@host/db?ssl=require",
        "postgresql://u:p@host/db?sslmode=require",
    ),
    "ssl-first": (
        "postgresql+asyncpg://u:p@host/db?ssl=require&foo=bar",
        "postgresql://u:p@host/db?sslmode=require&foo=bar",
    ),
    "ssl-last": (
        "postgresql+asyncpg://u:p@host/db?foo=bar&ssl=require",
        "postgresql://u:p@host/db?foo=bar&sslmode=require",
    ),
    "no-query": (
        "postgresql+asyncpg://u:p@host/db",
        "postgresql://u:p@host/db",
    ),
    "already-sslmode": (
        "postgresql+asyncpg://u:p@host/db?sslmode=require",
        "postgresql://u:p@host/db?sslmode=require",
    ),
}


def _settings_with(url: str) -> SimpleNamespace:
    """Stand-in for AppVars: only the two URL fields the DSN helper reads."""
    secret = SimpleNamespace(get_secret_value=lambda: url)
    return SimpleNamespace(RAG_POSTGRES_URL=None, POSTGRES_URL=secret)


@pytest.mark.parametrize("url, expected", CASES.values(), ids=CASES.keys())
def test_asyncpg_dsn_speaks_libpq_sslmode(monkeypatch, url, expected):
    monkeypatch.setattr(vector_store, "AppVars", _settings_with(url))

    dsn = vector_store._asyncpg_dsn()

    assert dsn == expected
