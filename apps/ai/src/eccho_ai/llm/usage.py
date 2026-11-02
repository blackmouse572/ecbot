"""Token counts of a one-shot LLM call, for apps/api to meter (#250).

Same snake_case shape as the chat stream's `message-metadata` usage, so
apps/api parses both with one function.
"""
from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from pydantic import BaseModel


class TokenUsage(BaseModel):
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0
    # Parts of `input_tokens` read from or written to the provider's prompt
    # cache, which bill at their own rates (Anthropic reads cost a tenth).
    cache_read_tokens: int = 0
    cache_write_tokens: int = 0


def cache_counts(usage_metadata: Mapping[str, Any]) -> tuple[int, int]:
    """(cache reads, cache writes) from a LangChain `usage_metadata`."""
    details = usage_metadata.get("input_token_details") or {}
    return int(details.get("cache_read") or 0), int(details.get("cache_creation") or 0)


def sum_usage(by_model: Mapping[str, Mapping[str, Any]]) -> TokenUsage | None:
    """Add up `UsageMetadataCallbackHandler.usage_metadata`; None when nothing ran."""
    if not by_model:
        return None
    usage = TokenUsage()
    for entry in by_model.values():
        usage.input_tokens += int(entry.get("input_tokens") or 0)
        usage.output_tokens += int(entry.get("output_tokens") or 0)
        usage.total_tokens += int(entry.get("total_tokens") or 0)
        read, write = cache_counts(entry)
        usage.cache_read_tokens += read
        usage.cache_write_tokens += write
    return usage
