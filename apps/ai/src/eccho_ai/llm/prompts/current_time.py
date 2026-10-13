"""Per-turn clock for the chat agent (#285).

The current time is volatile, so it never enters the system prompt: that would
change the prompt prefix every request and defeat provider prompt caching.
Instead `with_current_time` prefixes it onto the newest human turn of the model
input only; the messages in agent state (and the history apps/api stores) stay
untouched.

apps/api decides which zones apply (#292: conversation -> agent -> deployment
default) and sends them resolved on the chat request; this module only loads
and renders them.
"""
from __future__ import annotations

from collections.abc import Sequence
from datetime import datetime
from functools import lru_cache
from typing import Any
from zoneinfo import ZoneInfo

from langchain_core.messages import BaseMessage, HumanMessage

from eccho_ai.core.app_logger import get_logger

logger = get_logger(__name__)


@lru_cache(maxsize=128)
def _zone(key: str) -> ZoneInfo | None:
    """Cached per key, so a bad value warns once, not on every model call."""
    try:
        return ZoneInfo(key)
    # ZoneInfoNotFoundError is a KeyError; malformed keys ("../x") raise ValueError.
    except (KeyError, ValueError):
        logger.warning("invalid_timezone", timezone=key)
        return None


def zone(key: str | None) -> ZoneInfo:
    """The zone apps/api resolved. UTC when it is missing (an older apps/api
    mid-deploy) or invalid, so a bad value never breaks a turn."""
    return (key and _zone(key)) or ZoneInfo("UTC")


def _clock(now: datetime, tz: ZoneInfo) -> str:
    local = now.astimezone(tz)
    offset = local.strftime("%z")  # +0700
    return f"{local:%A, %Y-%m-%d %H:%M} ({tz.key}, UTC{offset[:3]}:{offset[3:]})"


def render_current_time(
    now: datetime, agent_tz: ZoneInfo, customer_tz: ZoneInfo | None = None
) -> str:
    """One clock when the customer shares the business's zone (the common
    case); both clocks and the rule for which one applies when they differ."""
    if customer_tz is None or customer_tz.key == agent_tz.key:
        return f"<current_time>{_clock(now, agent_tz)}</current_time>"
    return (
        "<current_time>\n"
        f"Business: {_clock(now, agent_tz)}\n"
        f"Customer: {_clock(now, customer_tz)}\n"
        "Opening hours and business facts follow the business clock. Times the "
        'customer states ("call me at 9", "tomorrow morning") follow the '
        "customer clock.\n"
        "</current_time>"
    )


def with_current_time(messages: Sequence[BaseMessage], block: str) -> list[BaseMessage]:
    """Copy `messages` with `block` prefixed onto the newest human turn."""
    out = list(messages)
    for i in range(len(out) - 1, -1, -1):
        message = out[i]
        if isinstance(message, HumanMessage):
            content: Any = message.content
            if isinstance(content, str):
                content = f"{block}\n\n{content}"
            else:
                content = [{"type": "text", "text": block}, *content]
            out[i] = message.model_copy(update={"content": content})
            break
    return out
