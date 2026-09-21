"""Tests for cassette middleware — no real LLM calls."""
from __future__ import annotations
import os
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))


def test_cassette_mode_env_respected(monkeypatch, tmp_path):
    monkeypatch.setenv("AI_CASSETTE_MODE", "replay")
    monkeypatch.setenv("VCR_CASSETTE_DIR", str(tmp_path))

    from eccho_ai.middlewares.cassette_middleware import get_cassette_config
    config = get_cassette_config()

    assert config["mode"] == "replay"
    assert config["cassette_dir"] == str(tmp_path)


def test_cassette_config_none_when_mode_live(monkeypatch):
    monkeypatch.delenv("AI_CASSETTE_MODE", raising=False)

    from eccho_ai.middlewares.cassette_middleware import get_cassette_config
    import importlib
    import eccho_ai.middlewares.cassette_middleware as m
    importlib.reload(m)

    config = m.get_cassette_config()
    assert config is None
