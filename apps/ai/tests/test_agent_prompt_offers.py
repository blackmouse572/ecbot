"""AGENT.md guidance for the one-time offers question (ecbot #499)."""
from importlib.resources import files

AGENT_MD = files("eccho_ai.llm.prompts").joinpath("AGENT.md").read_text(encoding="utf-8")


def _section() -> str:
    start = AGENT_MD.index("<offers_permission>")
    return AGENT_MD[start : AGENT_MD.index("</offers_permission>")]


def test_asks_once_and_records_it_with_the_tool():
    section = _section()
    assert "ask once" in section
    assert "action ASKED" in section
    assert "alreadyAsked" in section


def test_never_asks_an_upset_or_hostile_customer():
    section = _section()
    assert "Never ask while they are upset" in section
    assert '"Hostile: yes"' in section


def test_keeps_answering_whatever_the_permission():
    assert "Keep\n      answering every question as usual" in _section()
