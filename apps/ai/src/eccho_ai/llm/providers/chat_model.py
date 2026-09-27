"""Stateless LangChain chat-model builder, routed through OpenRouter.

Replaces the old `AIFactory.get_langchain_llm` static method: building a chat
model needs no instance state, so it is a plain (cached) function.
"""
from __future__ import annotations

from functools import lru_cache
from typing import TYPE_CHECKING

from fastapi import HTTPException

from eccho_ai.core.variables import AppVars

if TYPE_CHECKING:
    from langchain_openai import ChatOpenAI


@lru_cache(maxsize=32)
def build_chat_model(
    model_text_name: str,
    temperature: float = 1.0,
    max_tokens: int | None = None,
    cache: bool = False,
) -> "ChatOpenAI":
    """Build a chat model routed through the OpenRouter gateway.

    `model_text_name` is a full OpenRouter id (e.g. "anthropic/claude-sonnet-4.5").
    `max_tokens` caps the model's output tokens — without it, the model requests
    its max output capacity (e.g. 65535), which can exceed the OpenRouter
    account's available credit and fail with a 402.

    `cache` attaches a bounded per-instance response cache. Only deterministic
    callers may set it (the guardrail classifier runs at temperature 0.0 with a
    fixed prompt) — never the chatbot's own model. Deliberately NOT LangChain's
    global `set_llm_cache`, which would cache chat responses too.

    Cached by argument tuple: identical (model, temperature, max_tokens, cache)
    reuse one client. Exceptions are never cached by lru_cache.
    """
    from langchain_core.caches import InMemoryCache
    from langchain_openai import ChatOpenAI

    api_key = AppVars.OPENROUTER_API_KEY.get_secret_value()
    if not api_key:
        raise HTTPException(
            status_code=400,
            detail="OPENROUTER_API_KEY is not configured.",
        )
    if not (0.0 <= temperature <= 2.0):
        raise HTTPException(
            status_code=400,
            detail="Temperature must be between 0.0 and 2.0.",
        )
    # OpenRouter prompt caching: Anthropic must be opted in per request via a
    # top-level `cache_control`; Gemini 2.5+ and the rest cache implicitly.
    # The "~" prefix is OpenRouter's auto-router form of a model id.
    is_anthropic = model_text_name.lstrip("~").startswith("anthropic/")
    extra_body = {"cache_control": {"type": "ephemeral"}} if is_anthropic else None

    maxsize = AppVars.GUARDRAIL_CACHE_MAXSIZE
    response_cache = InMemoryCache(maxsize=maxsize) if cache and maxsize > 0 else None

    return ChatOpenAI(
        model=model_text_name,
        base_url=AppVars.OPENROUTER_BASE_URL,
        api_key=api_key,
        temperature=temperature,
        max_tokens=max_tokens,
        max_retries=2,
        timeout=AppVars.CHAT_MODEL_TIMEOUT_SECONDS,
        extra_body=extra_body,
        cache=response_cache,
    )
