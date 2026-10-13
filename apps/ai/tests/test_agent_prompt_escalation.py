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
    assert "when a confirmed order has no order tool to place it" in block


def test_order_placed_by_a_tool_is_not_an_example_of_a_handoff():
    # #288: "after an order is confirmed" made agents hand off every order
    # their order tool had already placed, whatever the owner chose.
    block = " ".join(_escalation_block().split())
    assert "after an order is confirmed" not in block


def test_handoff_rule_refers_to_the_marker_not_a_tag_name():
    block = _escalation_block()
    assert '"(triggers handoff)"' in block
    for seeded_name in ("New order", "Complaint", "Angry"):
        assert seeded_name not in block


def test_upset_or_complaining_customer_is_handed_over_in_the_same_turn():
    # #282: the agent apologised and kept asking whether the customer wanted
    # someone else instead of handing over.
    block = " ".join(_escalation_block().split())
    assert "angry, complaining, or clearly escalating" in block
    assert "in that same reply" in block
    assert "Do not only apologize" in block
    assert "do not ask whether they want to talk to someone" in block
