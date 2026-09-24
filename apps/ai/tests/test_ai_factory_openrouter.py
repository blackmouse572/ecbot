import pytest
from langchain_openai import ChatOpenAI
from pydantic import SecretStr

import eccho_ai.core.variables as cv
from eccho_ai.llm.providers.chat_model import build_chat_model


def test_returns_chatopenai_pointed_at_openrouter(monkeypatch):
    # Ensure a key is present so construction doesn't 400.
    monkeypatch.setattr(cv.AppVars, "OPENROUTER_API_KEY", SecretStr("sk-test"))
    llm = build_chat_model("anthropic/claude-sonnet-4.5", temperature=0.5)
    assert isinstance(llm, ChatOpenAI)
    assert str(llm.openai_api_base).rstrip("/") == "https://openrouter.ai/api/v1"
    assert llm.model_name == "anthropic/claude-sonnet-4.5"


def test_rejects_out_of_range_temperature(monkeypatch):
    from fastapi import HTTPException

    # Non-empty key so the empty-key branch (which runs first) doesn't shadow
    # the temperature-range check we're actually exercising here.
    monkeypatch.setattr(cv.AppVars, "OPENROUTER_API_KEY", SecretStr("sk-test"))
    with pytest.raises(HTTPException) as exc_info:
        build_chat_model("openai/gpt-4o", temperature=3.0)
    assert "Temperature" in exc_info.value.detail
    assert exc_info.value.status_code == 400


# ── Prompt caching + response caching (#318) ─────────────────────────────────

def test_anthropic_model_enables_cache_control(monkeypatch):
    # OpenRouter: Anthropic needs caching enabled explicitly, via a top-level
    # `cache_control` body param. Gemini 2.5+ caches implicitly.
    monkeypatch.setattr(cv.AppVars, "OPENROUTER_API_KEY", SecretStr("sk-test"))
    llm = build_chat_model("anthropic/claude-sonnet-4.5", temperature=0.1)
    assert llm.extra_body == {"cache_control": {"type": "ephemeral"}}


def test_anthropic_auto_router_prefix_enables_cache_control(monkeypatch):
    # OpenRouter's auto-router ids carry a leading "~".
    monkeypatch.setattr(cv.AppVars, "OPENROUTER_API_KEY", SecretStr("sk-test"))
    llm = build_chat_model("~anthropic/claude-sonnet-latest", temperature=0.2)
    assert llm.extra_body == {"cache_control": {"type": "ephemeral"}}


def test_non_anthropic_model_has_no_cache_control(monkeypatch):
    monkeypatch.setattr(cv.AppVars, "OPENROUTER_API_KEY", SecretStr("sk-test"))
    llm = build_chat_model("google/gemini-2.5-flash", temperature=0.3)
    assert llm.extra_body is None


def test_cache_flag_attaches_bounded_response_cache(monkeypatch):
    from langchain_core.caches import InMemoryCache

    monkeypatch.setattr(cv.AppVars, "OPENROUTER_API_KEY", SecretStr("sk-test"))
    monkeypatch.setattr(cv.AppVars, "GUARDRAIL_CACHE_MAXSIZE", 7)
    llm = build_chat_model("google/gemini-2.5-flash", temperature=0.4, cache=True)
    assert isinstance(llm.cache, InMemoryCache)
    assert llm.cache._maxsize == 7


def test_no_response_cache_by_default(monkeypatch):
    monkeypatch.setattr(cv.AppVars, "OPENROUTER_API_KEY", SecretStr("sk-test"))
    llm = build_chat_model("google/gemini-2.5-flash", temperature=0.6)
    assert llm.cache is None


def test_cache_flag_disabled_when_maxsize_is_zero(monkeypatch):
    monkeypatch.setattr(cv.AppVars, "OPENROUTER_API_KEY", SecretStr("sk-test"))
    monkeypatch.setattr(cv.AppVars, "GUARDRAIL_CACHE_MAXSIZE", 0)
    llm = build_chat_model("google/gemini-2.5-flash", temperature=0.7, cache=True)
    assert llm.cache is None


# ── Task 16: bound the model call so a hung upstream can't hang the agent loop ──

def test_chat_model_uses_configured_timeout(monkeypatch):
    monkeypatch.setattr(cv.AppVars, "OPENROUTER_API_KEY", SecretStr("sk-test"))
    monkeypatch.setattr(cv.AppVars, "CHAT_MODEL_TIMEOUT_SECONDS", 45.0)
    llm = build_chat_model("google/gemini-2.5-flash", temperature=0.8)
    assert llm.request_timeout == 45.0
