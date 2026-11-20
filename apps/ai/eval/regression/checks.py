"""What a reply must (or must not) do. Each check is one key in a case's
`expect` list; a sample passes when every check passes.

Rule checks run on the tool calls and the reply text. `judge` is the only
check that asks a model (see judge.py), for what a rule can't express.
"""
from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field
from typing import Any

from eval.regression.cases import Case


def tag_name(name: str) -> str:
    """The tag name apps/api resolves: it retries a miss with emoji stripped
    ("Angry 🚨" finds "Angry"), so the suite counts it the same way."""
    kept = "".join(c for c in unicodedata.normalize("NFC", name) if unicodedata.category(c) not in ("So", "Sk", "Mn", "Cf") or c.isalnum())
    return " ".join(kept.split()) or name


@dataclass
class Turn:
    """What the agent did on one sample of a case."""
    reply: str
    tool_calls: list[tuple[str, dict[str, Any]]] = field(default_factory=list)
    cost: float = 0.0
    error: str | None = None

    def tags_applied(self) -> list[str]:
        return [tag_name(str(a.get("name", ""))) for n, a in self.tool_calls if n == "apply_customer_tag"]

    def called(self, tool: str) -> bool:
        return any(n == tool for n, _ in self.tool_calls)

    def summary(self) -> str:
        calls = ", ".join(f"{n}({_short_args(a)})" for n, a in self.tool_calls)
        return f"[{calls}] {self.reply}" if calls else self.reply


def _short_args(args: dict[str, Any]) -> str:
    for key in ("name", "key", "id"):
        if key in args:
            return str(args[key])
    return ""


def _names(value: Any) -> list[str]:
    return [value] if isinstance(value, str) else list(value)


def _words(text: str) -> int:
    return len(text.split())


def run_rule(kind: str, value: Any, case: Case, turn: Turn) -> tuple[bool, str]:
    """(passed, what was seen) for one rule check."""
    tags = turn.tags_applied()
    if kind == "handoff":
        handed = [t for t in tags if t in case.handoff_tags]
        return (bool(handed) == bool(value), f"handoff tags {handed or 'none'}")
    if kind == "tag":
        missing = [t for t in _names(value) if t not in tags]
        return (not missing, f"tags {tags or 'none'}")
    if kind == "no_tag":
        present = [t for t in _names(value) if t in tags]
        return (not present, f"tags {tags or 'none'}")
    if kind == "tool":
        missing = [t for t in _names(value) if not turn.called(t)]
        return (not missing, f"missing {missing}" if missing else "called")
    if kind == "no_tool":
        present = [t for t in _names(value) if turn.called(t)]
        return (not present, f"called {present}" if present else "not called")
    if kind == "reply_matches":
        return (bool(re.search(value, turn.reply, re.I)), "matched" if re.search(value, turn.reply, re.I) else "no match")
    if kind == "reply_not_matches":
        hit = re.search(value, turn.reply, re.I)
        return (hit is None, f"matched {hit.group(0)!r}" if hit else "no match")
    if kind == "max_words":
        return (_words(turn.reply) <= int(value), f"{_words(turn.reply)} words")
    raise ValueError(f"unknown check {kind!r}")


RULES = {"handoff", "tag", "no_tag", "tool", "no_tool", "reply_matches", "reply_not_matches", "max_words"}
JUDGE = "judge"


def validate(case: Case) -> None:
    for check in case.expect:
        for kind in check:
            if kind not in RULES and kind != JUDGE:
                raise ValueError(f"{case.key}: unknown check {kind!r}")
