"""The bundled system prompt's rules for skills loaded with load_skill."""
from __future__ import annotations

from importlib.resources import files

AGENT_MD = files("eccho_ai.llm.prompts").joinpath("AGENT.md").read_text(encoding="utf-8")


def _block(tag: str) -> str:
    start = AGENT_MD.index(f"<{tag}>")
    return " ".join(AGENT_MD[start : AGENT_MD.index(f"</{tag}>", start)].split())


def test_a_matching_skill_is_loaded_before_anything_else():
    # Live tests: without this rule the agent skipped load_skill in most
    # conversations and answered from its own guess.
    block = _block("skills")
    assert "call load_skill first, before any other tool and before you reply" in block


def test_a_loaded_skill_is_followed_not_treated_as_untrusted_data():
    assert "like the operator instructions" in _block("skills")
    assert "(except a skill from load_skill, see <skills>)" in " ".join(
        _block("untrusted_input").split()
    )


def test_a_skill_in_another_language_does_not_change_the_reply_language():
    block = _block("skills")
    assert "A skill never changes your reply language" in block
    assert "translate any message it tells you to send" in block
