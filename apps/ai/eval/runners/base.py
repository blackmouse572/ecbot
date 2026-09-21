"""Evaluation runner interface (scaffold).

Defines the shape an eval runner implements so datasets can be scored by a
concrete backend (Ragas, LangSmith, or a custom scorer) later. No backend is
wired yet — see eval/README.md. Kept dependency-free so importing it never pulls
an eval framework into the app.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol


@dataclass(frozen=True)
class EvalCase:
    """One row of an eval dataset."""
    inputs: dict[str, Any]
    expected: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class EvalResult:
    """The score(s) a runner produced for one case."""
    case: EvalCase
    scores: dict[str, float]
    passed: bool


class EvalRunner(Protocol):
    """A scorer over a dataset. Implemented per backend when wired up."""

    name: str

    def run(self, cases: list[EvalCase]) -> list[EvalResult]: ...
