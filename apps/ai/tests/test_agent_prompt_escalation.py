"""The bundled system prompt's handoff rule (#281)."""
from __future__ import annotations

from importlib.resources import files

AGENT_MD = files("eccho_ai.llm.prompts").joinpath("AGENT.md").read_text(encoding="utf-8")


def _escalation_block() -> str:
    start = AGENT_MD.index("<escalation>")
    return AGENT_MD[start : AGENT_MD.index("</escalation>", start)]


def test_handoff_rule_covers_operator_instructions_not_only_customer_asks():
    block = " ".join(_escalation_block().split())
    assert "whenever your instructions call for handing the conversation to a person" in block
    assert "after an order is confirmed" in block


def test_handoff_rule_refers_to_the_marker_not_a_tag_name():
    block = _escalation_block()
    assert '"(triggers handoff)"' in block
    for seeded_name in ("New order", "Complaint", "Angry"):
        assert seeded_name not in block
