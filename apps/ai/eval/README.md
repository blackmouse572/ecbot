# eval/

LLM evaluation for the AI service.

```
eval/
  regression/  # prompt regression suite: runs every scenario live (below)
  scenarios/   # its scenarios, one YAML file per area; _agents.yaml holds the test businesses
  datasets/    # golden datasets (CSV): groundedness, escalation-continuity (not wired yet)
  runners/     # runner interface (base.py) for the datasets
```

## Prompt regression suite

Any change to `AGENT.md` or to the agent builder (`packages/agent-blueprint`,
`compilePrompt`) can fix one scenario and quietly break another. The suite
runs every known scenario against the change, on the models we ship, and
compares it with a baseline.

```bash
pnpm install                                         # once: the builder's node_modules
pnpm --filter ai eval -- --dry-run                   # list cases, count model turns, spend nothing
pnpm --filter ai eval -- --baseline origin/main      # your change vs main
pnpm --filter ai eval -- --only handover,booking/spa_nails --langs vi --samples 2
```

Needs `OPENROUTER_API_KEY` (from `apps/ai/.env`). No database, API or Redis.

**What runs is production code.** Each sample goes through the shared agent
graph and its middleware, `render_system_prompt`, `get_agent_input` (history,
reply-language note, customer context block, clock) and the real system tools.
The agent's `general_knowledge` and `followup_rules` come from the builder's
`compilePrompt` / `compileFollowupRules`, built from the working tree (and from
the baseline ref with `--baseline`). Only the edges are stubbed: apps/api
answers the tools' calls like it would (a handoff tag reports
`triggeredHandoff`), and the customer row comes from the scenario.

**Checks**, cheapest first. Rule checks: `handoff` (a tag marked handoff was
applied, or not), `tag` / `no_tag`, `tool` / `no_tool`, `reply_matches` /
`reply_not_matches` (regex), `max_words`. `judge` is a DeepEval GEval verdict
for what a rule can't express, scored by `--judge-model` (default Gemini 2.5
Flash); it only runs when the sample's rule checks passed. DeepEval is not an
app dependency: the `eval` script adds it with `uv run --with`, so it stays out
of `uv.lock` and the image.

**Reading the report.** Each row is a case, language and model, with passes
per arm. `FAIL`: below the case's `min_pass` (default 0.67). `REGRESSED`: more
than one run worse than the baseline. `known gap`: fails on the baseline too,
so it is not your change. Replies and check details for every sample are in
`eval/.cache/runs/<time>/`.

**Cost.** Each sample is one live turn (about $0.001 on DeepSeek V4.1 Flash,
$0.003 on Gemini 2.5 Flash). `--budget` (default $0.50, judge calls included)
stops starting samples once it is spent, and the report says how many were
skipped. Use `--dry-run` to count turns first, and `--only` / `--langs` /
`--samples` to stay small while iterating.

### Adding a scenario

Add a case to the area's YAML file (or a new file): an `id`, the customer's
`message` per language, optional `history` (`customer`, `bot`, `staff`,
`handled` entries, shaped like apps/api sends them), `customer` (name,
applied tags, saved fields), and `expect`. Write the check the bug report
describes, run just that case on main to see it fail, then on your branch.
When a fix lands, its scenario stays: that is what keeps it fixed.

## Datasets

`tests/test_eval_datasets.py` is a smoke test asserting the CSV datasets load
and are non-empty. They are not scored yet.
