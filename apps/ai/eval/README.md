# eval/

LLM evaluation harness for the AI service.

```
eval/
  datasets/   # golden datasets (CSV) — groundedness, escalation-continuity, …
  cases/      # hand-authored case files / fixtures for targeted checks
  runners/    # runner interface (base.py); concrete backends added when wired
```

**Status: scaffold.** The runner interface (`runners/base.py`: `EvalCase`,
`EvalResult`, `EvalRunner`) is defined; no scoring backend is wired yet.
Wiring a concrete runner (Ragas or LangSmith) is tracked separately — keep this
directory dependency-free so importing it never pulls an eval framework into the
app runtime.

`tests/test_eval_datasets.py` is a smoke test asserting the datasets load and are
non-empty.
