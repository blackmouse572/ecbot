"""The per-request dynamic toolset for a chatbot.

One place decides what dynamic tools a Turn gets. Resolved once when the chatbot
is loaded and carried on the runtime context, so the middleware never rebuilds it.

Operator (registry) tools plus the progressive-disclosure `load_skill` tool.
`build_skills` reads `chatbot.chatbot_skills`, eager-loaded by `_fetch_chatbot`.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

from eccho_ai.llm.tools.operator_tools import build_tools
from eccho_ai.llm.tools.skills import build_skills

if TYPE_CHECKING:
    from langchain_core.tools import StructuredTool

    from eccho_ai.models.chat import Chatbots


def resolve_chatbot_tools(chatbot: "Chatbots") -> list["StructuredTool"]:
    """Operator (registry) tools + skills' `load_skill` tool for this chatbot."""
    return build_tools(chatbot) + build_skills(chatbot)
