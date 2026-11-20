"""Prompt regression suite: every scenario in eval/scenarios, live.

    pnpm --filter ai eval                              # all cases, default models
    pnpm --filter ai eval -- --baseline main           # also run main, flag what got worse
    pnpm --filter ai eval -- --only handover,booking/spa_nails --langs vi --samples 2
    pnpm --filter ai eval -- --dry-run                 # list cases and the number of model turns

Costs OpenRouter credit: it stops starting samples once `--budget` dollars
are spent (judge calls included) and reports what it skipped.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from dataclasses import asdict
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv

AI_DIR = Path(__file__).resolve().parents[2]
load_dotenv(AI_DIR / ".env")
# eccho_ai reads its settings at import; the suite needs no database, API or Sentry.
os.environ.setdefault("POSTGRES_URL", "postgresql://eval:eval@localhost:5432/eval_unused")
os.environ["SENTRY_DSN"] = ""

from eval.regression.cases import Case, load_cases, select  # noqa: E402
from eval.regression.checks import JUDGE, Turn, run_rule, validate  # noqa: E402
from eval.regression.report import OK, Sample, build_rows, render  # noqa: E402

DEFAULT_MODELS = ["deepseek/deepseek-v4.1-flash", "google/gemini-2.5-flash"]


def _args(argv: list[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(prog="eval.regression", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--only", help="comma list of area or area/case_id")
    p.add_argument("--langs", help="comma list: vi,en")
    p.add_argument("--models", default=",".join(DEFAULT_MODELS))
    p.add_argument("--samples", type=int, default=3, help="runs per case, language, model and arm")
    p.add_argument("--baseline", help="git ref to compare against, e.g. main")
    p.add_argument("--budget", type=float, default=0.50, help="stop starting samples after this many dollars")
    p.add_argument("--judge-model", default=None)
    p.add_argument("--concurrency", type=int, default=8)
    p.add_argument("--dry-run", action="store_true")
    return p.parse_args(argv)


class Budget:
    def __init__(self, cap: float):
        self.cap = cap
        self.spent = 0.0

    def left(self) -> bool:
        return self.spent < self.cap


async def _score(case: Case, turn: Turn, judge_model: str | None) -> tuple[bool, list[dict], float]:
    """(passed, check results, judge spend for this sample)."""
    if turn.error:
        return False, [{"check": "run", "ok": False, "detail": turn.error}], 0.0
    spent = 0.0
    results = []
    for check in case.expect:
        for kind, value in check.items():
            if kind == JUDGE:
                continue
            ok, detail = run_rule(kind, value, case, turn)
            results.append({"check": kind, "ok": ok, "detail": f"{kind}: {detail}"})
    # Judge only what the rules passed: a failed sample needs no paid verdict.
    if all(r["ok"] for r in results):
        for check in case.expect:
            if JUDGE in check:
                from eval.regression.judge import OpenRouterJudge, judge

                # One scorer per verdict, so its spend is this sample's alone
                # while other samples are judged concurrently.
                scorer = OpenRouterJudge(judge_model)
                ok, detail = await judge(check[JUDGE], case, turn, scorer)
                spent += scorer.spent
                results.append({"check": JUDGE, "ok": ok, "detail": f"judge: {detail}"})
                if not ok:
                    break
    return all(r["ok"] for r in results), results, spent


async def _run(args: argparse.Namespace, cases: list[Case], models: list[str]) -> int:
    from eval.regression import blueprint, harness

    arms = [blueprint.working_tree_arm()]
    if args.baseline:
        arms.append(blueprint.ref_arm(args.baseline))
    compiled = {arm.name: blueprint.compile_profiles(arm, cases) for arm in arms}
    harness.install_stubs()

    budget = Budget(args.budget)
    judge_model = None
    if any(JUDGE in check for c in cases for check in c.expect):
        from eval.regression.judge import DEFAULT_JUDGE

        judge_model = args.judge_model or DEFAULT_JUDGE

    def job(case: Case, model: str, arm):
        async def go() -> Sample:
            if not budget.left():
                return Sample(case.key, model, arm.name, False, True, {})
            turn = await harness.run_sample(case, compiled[arm.name][case.key], model, arm.template)
            budget.spent += turn.cost
            passed, checks, judged = await _score(case, turn, judge_model)
            budget.spent += judged
            data = {**asdict(turn), "summary": turn.summary()}
            return Sample(case.key, model, arm.name, passed, False, data, checks)
        return go

    # Interleaved, so a budget stop cuts every arm and case evenly.
    jobs = [job(c, m, arm) for _ in range(args.samples) for c in cases for m in models for arm in arms]
    print(f"Running {len(jobs)} samples ({len(cases)} cases x {len(models)} models x {len(arms)} arms x {args.samples}), budget ${args.budget:.2f}", flush=True)
    samples = await harness.gather_limited(jobs, args.concurrency)

    arm_names = [a.name for a in arms]
    rows = build_rows(samples, arm_names, {c.key: c.min_pass for c in cases})
    skipped = sum(s.skipped for s in samples)
    text = render(rows, arm_names, budget.spent, skipped)
    print(text)

    out = AI_DIR / "eval" / ".cache" / "runs" / datetime.now().strftime("%Y%m%d-%H%M%S")
    out.mkdir(parents=True, exist_ok=True)
    (out / "report.md").write_text(text + "\n", encoding="utf-8")
    with (out / "samples.jsonl").open("w", encoding="utf-8") as f:
        for s in samples:
            f.write(json.dumps(asdict(s), ensure_ascii=False) + "\n")
    print(f"Replies and checks: {out}")
    return 1 if any(r.status not in OK for r in rows) or skipped else 0


def main(argv: list[str] | None = None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    if argv[:1] == ["--"]:  # `pnpm --filter ai eval -- ...` passes the separator on
        argv = argv[1:]
    args = _args(argv)
    cases = select(load_cases(), args.only, args.langs.split(",") if args.langs else None)
    for case in cases:
        validate(case)
    models = [m.strip() for m in args.models.split(",") if m.strip()]
    arms = 2 if args.baseline else 1
    if not cases and (args.only or args.langs):
        raise SystemExit(f"no case matches --only {args.only!r} --langs {args.langs!r}")
    if args.dry_run or not cases:
        for c in cases:
            print(f"{c.key}  {c.note}")
        print(f"{len(cases)} cases, {len(cases) * len(models) * arms * args.samples} model turns")
        return 0
    return asyncio.run(_run(args, cases, models))


if __name__ == "__main__":
    raise SystemExit(main())
