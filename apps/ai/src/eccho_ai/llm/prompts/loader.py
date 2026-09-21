"""System-prompt assembly for the chat agent.

The template lives next to this module as package data (AGENT.md) and is loaded
via importlib.resources so it resolves regardless of the working directory or
whether the app runs from source or an installed wheel. `AGENT_PROMPT_PATH`
(set only by the enterprise image) overrides it with the file at that path.

`system_prompt_template()` is cached (`@lru_cache(maxsize=1)`) — changing
`AGENT_PROMPT_PATH` requires a process restart to take effect.
"""
from __future__ import annotations

from functools import lru_cache
from importlib.resources import files
from typing import TYPE_CHECKING

from eccho_ai.core.variables import AppVars

if TYPE_CHECKING:
    from eccho_ai.models.chat import Chatbots


@lru_cache(maxsize=1)
def system_prompt_template() -> str:
    if AppVars.AGENT_PROMPT_PATH is not None:
        return AppVars.AGENT_PROMPT_PATH.read_text(encoding="utf-8")
    return files("eccho_ai.llm.prompts").joinpath("AGENT.md").read_text(encoding="utf-8")


def sanitize_config_value(value: str) -> str:
    """Neutralize structural prompt breakouts in operator-supplied config."""
    return value.replace("<", "‹").replace(">", "›")


def render_system_prompt(chatbot: "Chatbots") -> str:
    values = {
        "{general_knowledge}": chatbot.general_knowledge or "",
        "{prefer_language_code}": chatbot.primary_language or "vi",
        "{defer_language_code}": chatbot.defered_language or "vi",
        "{greeting_message}": chatbot.welcome_message or "",
        "{fallback_message}": chatbot.fallback_message or "",
        "{followup_rules}": chatbot.followup_rules or "",
    }
    rendered = system_prompt_template()
    for token, value in values.items():
        rendered = rendered.replace(token, sanitize_config_value(value))
    return rendered
