"""Per-turn clock for the chat agent (#285).

The current time is volatile, so it never enters the system prompt: that would
change the prompt prefix every request and defeat provider prompt caching.
Instead `with_current_time` prefixes it onto the newest human turn of the model
input only; the messages in agent state (and the history apps/api stores) stay
untouched.

`resolve_timezone` is the single place the effective zone is decided. #292 adds
the conversation's own timezone in front of the agent's here.
"""
from __future__ import annotations

from collections.abc import Sequence
from datetime import datetime
from functools import lru_cache
from typing import TYPE_CHECKING, Any
from zoneinfo import ZoneInfo

from langchain_core.messages import BaseMessage, HumanMessage

from eccho_ai.core.app_logger import get_logger
from eccho_ai.core.variables import AppVars

if TYPE_CHECKING:
    from eccho_ai.models.chat import Chatbots

logger = get_logger(__name__)


@lru_cache(maxsize=128)
def _zone(key: str) -> ZoneInfo | None:
    """Cached per key, so a bad stored value warns once, not on every model call."""
    try:
        return ZoneInfo(key)
    # ZoneInfoNotFoundError is a KeyError; malformed keys ("../x") raise ValueError.
    except (KeyError, ValueError):
        logger.warning("invalid_timezone", timezone=key)
        return None


def resolve_timezone(chatbot: Chatbots | None) -> ZoneInfo:
    """Agent timezone, else the deployment default. A bad value never breaks a turn."""
    configured = getattr(chatbot, "timezone", None)
    return (
        (configured and _zone(configured))
        or _zone(AppVars.APP_TIMEZONE)
        or ZoneInfo("UTC")
    )


def render_current_time(now: datetime, tz: ZoneInfo) -> str:
    local = now.astimezone(tz)
    offset = local.strftime("%z")  # +0700
    return (
        f"<current_time>{local:%A, %Y-%m-%d %H:%M} "
        f"({tz.key}, UTC{offset[:3]}:{offset[3:]})</current_time>"
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
