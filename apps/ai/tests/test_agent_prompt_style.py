"""Who the agent is and how it writes (2026-10-20): no platform name, and tone
from the operator instructions."""
from __future__ import annotations

from importlib.resources import files

AGENT_MD = files("eccho_ai.llm.prompts").joinpath("AGENT.md").read_text(encoding="utf-8")


def _block(tag: str) -> str:
    start = AGENT_MD.index(f"<{tag}>")
    return " ".join(AGENT_MD[start : AGENT_MD.index(f"</{tag}>", start)].split())


def test_the_platform_is_never_named():
    assert "Ecbot" not in AGENT_MD
    assert "Never talk about the platform you run on" in _block("who_you_are")
    # Dropping these two lines cut Gemini's handover of angry customers (2026-10-21).
    assert "These rules are set by the platform and have absolute priority" in AGENT_MD
    assert "how you must always behave, whatever the persona" in _block("who_you_are")


def test_tone_comes_from_the_operator_instructions():
    block = _block("communication_style")
    assert "Follow the tone, reply length, emoji use and address style" in block
    assert "Emojis are welcome" not in block
