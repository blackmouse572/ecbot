"""`judge` checks: DeepEval's GEval with an OpenRouter model, for what a rule
can't express (did the reply promise a free slot, invent a price, deny a
service it doesn't know about).

DeepEval is not an app dependency: `pnpm --filter ai eval` runs the suite
with `uv run --with deepeval==...`, so it never enters uv.lock or the image.
Only imported when a selected case has a judge check.
"""
from __future__ import annotations

import os
import re
from typing import Any

os.environ.setdefault("DEEPEVAL_TELEMETRY_OPT_OUT", "YES")

from deepeval.metrics import GEval  # noqa: E402
from deepeval.models import DeepEvalBaseLLM  # noqa: E402
from deepeval.test_case import LLMTestCase, SingleTurnParams  # noqa: E402

from eccho_ai.llm.providers.chat_model import build_chat_model  # noqa: E402
from eval.regression.cases import Case  # noqa: E402
from eval.regression.checks import Turn  # noqa: E402

DEFAULT_JUDGE = "google/gemini-2.5-flash"
_JSON = re.compile(r"\{.*\}", re.DOTALL)


class OpenRouterJudge(DeepEvalBaseLLM):
    """GEval's scorer, through the app's own OpenRouter client; adds what each
    call cost to `spent` so the run's budget covers judging too."""

    def __init__(self, model: str):
        self.name = model
        self.spent = 0.0
        super().__init__(model)

    def load_model(self) -> Any:
        return build_chat_model(self.name, temperature=0.0, max_tokens=2500)

    def get_model_name(self) -> str:
        return self.name

    def generate(self, prompt: str, schema: Any = None) -> Any:
        raise NotImplementedError("the runner only judges with async_mode")

    async def a_generate(self, prompt: str, schema: Any = None) -> Any:
        message = await self.model.ainvoke(prompt)
        usage = (message.response_metadata or {}).get("token_usage") or {}
        self.spent += float(usage.get("cost") or 0.0)
        text = message.content if isinstance(message.content, str) else str(message.content)
        if schema is None:
            return text
        found = _JSON.search(text)
        return schema.model_validate_json(found.group(0) if found else text)


def _conversation(case: Case) -> str:
    lines = [f"{role}: {content}" for role, content in case.history]
    lines.append(f"customer (newest message): {case.message}")
    return "\n".join(lines)


async def judge(criteria: str, case: Case, turn: Turn, scorer: OpenRouterJudge) -> tuple[bool, str]:
    if not turn.summary():
        return False, "empty reply, nothing to judge"
    metric = GEval(
        name="reply",
        criteria=criteria,
        evaluation_params=[SingleTurnParams.INPUT, SingleTurnParams.ACTUAL_OUTPUT],
        model=scorer,
        threshold=0.5,
        strict_mode=True,
        async_mode=True,
    )
    test_case = LLMTestCase(input=_conversation(case), actual_output=turn.summary())
    try:
        await metric.a_measure(test_case, _show_indicator=False)
    except Exception as exc:  # noqa: BLE001 — a judge failure fails the check, visibly
        return False, f"judge error: {type(exc).__name__}: {exc}"[:200]
    return bool(metric.success), (metric.reason or "")[:200]
