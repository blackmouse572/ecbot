"""Unit tests for AGENT_PROMPT_PATH — see loader.py docstring for cache semantics."""
from __future__ import annotations

import re
import sys
from importlib.resources import files
from pathlib import Path
from types import SimpleNamespace

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

import pytest

from eccho_ai.core.variables import AppVars
from eccho_ai.llm.prompts.loader import (
    render_system_prompt,
    sanitize_config_value,
    system_prompt_template,
)

BUNDLED_AGENT_MD = files("eccho_ai.llm.prompts").joinpath("AGENT.md")


@pytest.fixture(autouse=True)
def _clear_prompt_cache():
    """system_prompt_template() is @lru_cache(maxsize=1) — clear before and
    after each test so the order tests run in never matters."""
    system_prompt_template.cache_clear()
    yield
    system_prompt_template.cache_clear()


def _chatbot_stub(**overrides) -> SimpleNamespace:
    """Smallest object render_system_prompt reads (see loader.py)."""
    base = dict(
        general_knowledge=None,
        primary_language="en",
        defered_language=None,
        welcome_message=None,
        fallback_message=None,
        followup_rules=None,
    )
    base.update(overrides)
    return SimpleNamespace(**base)


def test_unset_returns_bundled_template(monkeypatch):
    monkeypatch.setattr(AppVars, "AGENT_PROMPT_PATH", None)
    assert system_prompt_template() == BUNDLED_AGENT_MD.read_text(encoding="utf-8")


def test_set_path_returns_that_files_content(monkeypatch, tmp_path):
    custom = tmp_path / "custom.md"
    custom.write_text("Custom enterprise prompt.\n", encoding="utf-8")
    monkeypatch.setattr(AppVars, "AGENT_PROMPT_PATH", custom)
    assert system_prompt_template() == "Custom enterprise prompt.\n"


def test_missing_path_raises_filenotfounderror_naming_the_path(monkeypatch, tmp_path):
    missing = tmp_path / "missing.md"
    monkeypatch.setattr(AppVars, "AGENT_PROMPT_PATH", missing)
    with pytest.raises(FileNotFoundError, match=re.escape(str(missing))):
        system_prompt_template()


def test_render_system_prompt_unset_matches_bundled_template(monkeypatch):
    """Constraint: unset -> rendered prompt is byte-identical to today."""
    monkeypatch.setattr(AppVars, "AGENT_PROMPT_PATH", None)
    stub = _chatbot_stub(followup_rules="Check payment after 30 minutes.")

    expected = BUNDLED_AGENT_MD.read_text(encoding="utf-8")
    values = {
        "{general_knowledge}": stub.general_knowledge or "",
        "{prefer_language_code}": stub.primary_language or "vi",
        "{defer_language_code}": stub.defered_language or "vi",
        "{greeting_message}": stub.welcome_message or "",
        "{fallback_message}": stub.fallback_message or "",
        "{followup_rules}": stub.followup_rules or "",
    }
    for token, value in values.items():
        expected = expected.replace(token, sanitize_config_value(value))

    assert render_system_prompt(stub) == expected
