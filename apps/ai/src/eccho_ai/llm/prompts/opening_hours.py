"""Per-turn open/closed status from the agent's weekly hours (#289).

The owner enters the week in the agent builder; it is stored as
`agent_profile.openingHours` (shape and validation in
packages/agent-blueprint/src/opening-hours.ts): weekday key -> list of same-day
`{"open": "HH:MM", "close": "HH:MM"}` ranges, "24:00" allowed as a close.

Like the clock, the status changes with time, so it rides the newest human turn
next to <current_time> and never enters the cached system prompt. The readable
weekly schedule itself is static and lives in the compiled prompt.
"""
from __future__ import annotations

import re
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

WEEKDAYS = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")  # datetime.weekday() order
_TIME = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$|^24:00$")

Week = list[list[tuple[int, int]]]  # per weekday, sorted (open, close) in minutes


def _minutes(value: Any) -> int | None:
    if not isinstance(value, str) or not _TIME.match(value):
        return None
    hours, minutes = value.split(":")
    return int(hours) * 60 + int(minutes)


def _parse_week(chatbot: Any) -> Week | None:
    """The stored week, or None when unset or malformed (a bad value never breaks a turn)."""
    profile = getattr(chatbot, "agent_profile", None)
    hours = profile.get("openingHours") if isinstance(profile, dict) else None
    if not isinstance(hours, dict):
        return None
    week: Week = []
    for day in WEEKDAYS:
        ranges = hours.get(day) or []
        if not isinstance(ranges, list):
            return None
        parsed = []
        for r in ranges:
            start = _minutes(r.get("open")) if isinstance(r, dict) else None
            end = _minutes(r.get("close")) if isinstance(r, dict) else None
            if start is None or end is None or start >= end:
                return None
            parsed.append((start, end))
        week.append(sorted(parsed))
    return week if any(week) else None


def _hhmm(minutes: int) -> str:
    return f"{minutes // 60:02d}:{minutes % 60:02d}"


def _clock(minutes: int) -> str:
    return "midnight" if minutes == 24 * 60 else _hhmm(minutes)


_DAY_NAMES = ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")


def _day_name(day: int) -> str:
    return _DAY_NAMES[day]


def render_opening_hours(chatbot: Any, now: datetime, tz: ZoneInfo) -> str | None:
    week = _parse_week(chatbot)
    if week is None:
        return None
    local = now.astimezone(tz)
    today, minute = local.weekday(), local.hour * 60 + local.minute

    current = next(((s, e) for s, e in week[today] if s <= minute < e), None)
    if current:
        status = f"Open now, until {_clock(current[1])}."
    else:
        status = "Closed now."
        for offset in range(8):
            day = (today + offset) % 7
            start = next((s for s, _ in week[day] if offset or s > minute), None)
            if start is None:
                continue
            when = (
                "today" if offset == 0
                else f"tomorrow, {_day_name(day)}," if offset == 1
                else f"next {_day_name(day)}" if offset == 7
                else _day_name(day)
            )
            status += f" Opens {when} at {_clock(start)}."
            break

    todays = " and ".join(f"{_hhmm(s)}-{_hhmm(e)}" for s, e in week[today]) or "closed"
    return f"<opening_hours>{status} Today ({_day_name(today)}): {todays}.</opening_hours>"

