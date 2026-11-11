"""The marketing lines of the customer context block (ecbot #499), without a
database, so they run in CI."""
from datetime import UTC, datetime
from uuid import uuid4

from eccho_ai.models.customer_marketing_states import CustomerMarketingStates
from eccho_ai.modules.chat.customer_context import _marketing_lines


def _state(**fields) -> CustomerMarketingStates:
    return CustomerMarketingStates(workspace_id=uuid4(), customer_id=uuid4(), **fields)


def test_no_row_is_not_asked_yet():
    assert _marketing_lines(None) == ["Offers: not asked yet"]


def test_pending_shows_the_stage_and_not_asked_yet():
    assert _marketing_lines(_state(stage="INTERESTED")) == [
        "Journey stage: INTERESTED",
        "Offers: not asked yet",
    ]


def test_pending_after_the_question_says_never_ask_again():
    lines = _marketing_lines(_state(consent_asked_at=datetime(2026, 11, 1, tzinfo=UTC)))
    assert "Offers: PENDING, consent already asked (never ask again)" in lines


def test_paused_shows_the_date():
    lines = _marketing_lines(
        _state(permission="PAUSED", permission_until=datetime(2026, 12, 24, 10, 30, tzinfo=UTC))
    )
    assert "Offers: PAUSED until 2026-12-24" in lines


def test_stopped_and_hostile():
    assert _marketing_lines(_state(permission="STOPPED", hostile=True)) == [
        "Journey stage: NEW",
        "Offers: STOPPED (never ask; reopen only if the customer asks for offers)",
        "Hostile: yes (never ask about offers)",
    ]


def test_granted():
    assert "Offers: GRANTED" in _marketing_lines(_state(permission="GRANTED"))
