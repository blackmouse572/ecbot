"""What the agent saves about a customer (2026-10-20): it saved every detail
(height, weight, "need") with an extra model round each turn, into fields no
one read."""
from __future__ import annotations

from importlib.resources import files

AGENT_MD = files("eccho_ai.llm.prompts").joinpath("AGENT.md").read_text(encoding="utf-8")


def _saving_block() -> str:
    start = AGENT_MD.index("<saving>")
    return " ".join(AGENT_MD[start : AGENT_MD.index("</saving>", start)].split())


def test_saves_only_the_address_and_details_the_owner_asks_for():
    block = _saving_block()
    assert 'Delivery address → call set_customer_field with key "address"' in block
    assert "A detail named in your instructions' list of what to collect" in block
    assert "Any other preference or detail" not in block
    assert "Save nothing else, even details you asked for yourself" in block
