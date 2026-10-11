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


def sum_usage(by_model: Mapping[str, Mapping[str, Any]]) -> TokenUsage | None:
    """Add up `UsageMetadataCallbackHandler.usage_metadata`; None when nothing ran."""
    if not by_model:
        return None
    usage = TokenUsage()
    for entry in by_model.values():
        usage.input_tokens += int(entry.get("input_tokens") or 0)
        usage.output_tokens += int(entry.get("output_tokens") or 0)
        usage.total_tokens += int(entry.get("total_tokens") or 0)
    return usage
