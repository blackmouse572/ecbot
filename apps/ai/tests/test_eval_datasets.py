"""Smoke test for the eval scaffold: datasets load and are non-empty."""
from __future__ import annotations

import csv
from pathlib import Path

import pytest

_DATASETS = Path(__file__).resolve().parent.parent / "eval" / "datasets"


@pytest.mark.parametrize(
    "name",
    ["escalation-continuity.csv", "groundedness-tool-results.csv"],
)
def test_dataset_loads_with_rows(name: str):
    path = _DATASETS / name
    assert path.exists(), f"missing eval dataset: {path}"
    with path.open(newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    assert rows, f"eval dataset has no rows: {name}"
    # header present -> DictReader keys are non-empty
    assert all(rows[0].keys())


def test_runner_interface_importable():
    from eval.runners.base import EvalCase, EvalResult, EvalRunner  # noqa: F401

    case = EvalCase(inputs={"q": "hi"}, expected={"a": "hello"})
    assert case.inputs["q"] == "hi"
