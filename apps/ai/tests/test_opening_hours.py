"""Open/closed status from the agent's weekly hours (#289), computed per turn in
the agent's timezone so the agent never has to work it out from free text."""
from __future__ import annotations

from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import MagicMock
from zoneinfo import ZoneInfo

import pytest

from eccho_ai.llm.prompts.opening_hours import render_opening_hours

HCM = ZoneInfo("Asia/Ho_Chi_Minh")  # UTC+7, no DST
LUNCH_BREAK = [{"open": "08:00", "close": "12:00"}, {"open": "13:30", "close": "17:30"}]
WEEKDAYS = {d: LUNCH_BREAK for d in ("mon", "tue", "wed", "thu", "fri")}


def _bot(hours):
    return SimpleNamespace(agent_profile={"openingHours": hours} if hours is not None else {})


def _at(local: str) -> datetime:
    """A UTC instant from a Ho Chi Minh wall-clock time."""
    return datetime.fromisoformat(local).replace(tzinfo=HCM).astimezone(UTC)


def _status(hours, local: str) -> str | None:
    return render_opening_hours(_bot(hours), _at(local), HCM)


# 2026-10-16 is a Friday.
@pytest.mark.parametrize(
    ("local", "expected"),
    [
        ("2026-10-16 08:00", "Open now, until 12:00."),
        ("2026-10-16 11:59", "Open now, until 12:00."),
        ("2026-10-16 12:00", "Closed now. Opens today at 13:30."),
        ("2026-10-16 07:59", "Closed now. Opens today at 08:00."),
        ("2026-10-16 17:30", "Closed now. Opens Monday at 08:00."),
        ("2026-10-15 23:40", "Closed now. Opens tomorrow, Friday, at 08:00."),
    ],
)
def test_open_now_at_boundaries_and_next_opening(local, expected):
    status = _status({**WEEKDAYS, "sat": [], "sun": []}, local)
    assert expected in status


def test_names_todays_hours_and_wraps_in_a_block():
    status = _status({**WEEKDAYS, "sun": []}, "2026-10-16 09:00")
    assert status == (
        "<opening_hours>Open now, until 12:00. "
        "Today (Friday): 08:00-12:00 and 13:30-17:30.</opening_hours>"
    )
    sunday = _status({**WEEKDAYS, "sun": []}, "2026-10-18 10:00")
    assert sunday.endswith("Today (Sunday): closed.</opening_hours>")


def test_rolls_over_a_full_week_to_the_same_weekday():
    only_friday = {"fri": [{"open": "08:00", "close": "12:00"}]}
    assert "Opens next Friday at 08:00." in _status(only_friday, "2026-10-16 13:00")


def test_midnight_close_reads_as_midnight():
    late = {"fri": [{"open": "18:00", "close": "24:00"}]}
    assert "Open now, until midnight." in _status(late, "2026-10-16 23:59")


def test_reads_the_week_in_the_agent_timezone():
    # 01:30 UTC Friday is 08:30 in Ho Chi Minh City but still Thursday in London.
    now = datetime(2026, 10, 16, 1, 30, tzinfo=UTC)
    hours = {"fri": [{"open": "08:00", "close": "12:00"}]}
    assert "Open now" in render_opening_hours(_bot(hours), now, HCM)
    assert "Closed now" in render_opening_hours(_bot(hours), now, ZoneInfo("Europe/London"))


@pytest.mark.parametrize(
    "chatbot",
    [
        None,
        SimpleNamespace(agent_profile=None),
        _bot(None),
        _bot({}),
        _bot({"mon": [], "sun": []}),
        _bot("not a week"),
        _bot({"mon": [{"open": "8h", "close": "12:00"}]}),
        MagicMock(),
    ],
)
def test_no_block_without_usable_hours(chatbot):
    assert render_opening_hours(chatbot, _at("2026-10-16 09:00"), HCM) is None
