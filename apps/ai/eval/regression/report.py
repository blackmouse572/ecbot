"""Pass counts per case, model and arm, and which ones fail or got worse."""
from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any


@dataclass
class Sample:
    case: str  # Case.key
    model: str
    arm: str
    passed: bool
    skipped: bool
    turn: dict[str, Any]
    checks: list[dict[str, Any]] = field(default_factory=list)


# Statuses that don't fail a run: "known gap" fails on the baseline as well.
OK = {"ok", "known gap"}


@dataclass
class Row:
    case: str
    model: str
    counts: dict[str, tuple[int, int]]  # arm -> (passed, run)
    status: str  # ok | FAIL | REGRESSED | known gap
    misses: list[str]


def _short(model: str) -> str:
    return model.split("/")[-1]


def build_rows(samples: list[Sample], arms: list[str], min_pass: dict[str, float]) -> list[Row]:
    grouped: dict[tuple[str, str], dict[str, list[Sample]]] = defaultdict(lambda: defaultdict(list))
    for s in samples:
        if not s.skipped:
            grouped[(s.case, s.model)][s.arm].append(s)
    rows: list[Row] = []
    for (case, model), by_arm in sorted(grouped.items()):
        counts = {arm: (sum(s.passed for s in by_arm.get(arm, [])), len(by_arm.get(arm, []))) for arm in arms}
        current_pass, current_run = counts[arms[0]]
        status = "ok"
        if current_run and current_pass / current_run < min_pass[case]:
            status = "FAIL"
        if len(arms) > 1:
            base_pass, base_run = counts[arms[1]]
            if status == "FAIL" and base_run and base_pass / base_run < min_pass[case]:
                status = "known gap"  # below the bar on the baseline too: not this change
            runs = min(current_run, base_run)
            # More than one run worse, as in the October AGENT.md refactor review.
            if runs and (base_pass / base_run - current_pass / current_run) * runs > 1:
                status = "REGRESSED"
        misses = [
            f"{'; '.join(c['detail'] for c in s.checks if not c['ok'])} :: {s.turn['summary'][:200]}"
            for s in by_arm.get(arms[0], [])
            if not s.passed
        ][:2]
        rows.append(Row(case, model, counts, status, misses))
    return rows


def render(rows: list[Row], arms: list[str], spent: float, skipped: int) -> str:
    head = ["Case", "Model", *arms, "Status"]
    lines = ["| " + " | ".join(head) + " |", "|" + "---|" * len(head)]
    for r in rows:
        cells = [r.case, _short(r.model), *(f"{p}/{n}" for p, n in (r.counts[a] for a in arms)), r.status]
        lines.append("| " + " | ".join(cells) + " |")
    bad = [r for r in rows if r.status not in OK]
    if bad:
        lines.append("")
        lines.append("Failing or worse:")
        for r in bad:
            lines.append(f"- {r.case} ({_short(r.model)}): {r.status}")
            lines.extend(f"  - {m}" for m in r.misses)
    lines.append("")
    lines.append(f"Spent ${spent:.3f}." + (f" {skipped} samples skipped: budget reached." if skipped else ""))
    return "\n".join(lines)
