"""OpenRouter's alpha Decisions API, for decisions models such as Jev.

Jev (`typesafe/*`) is not a chat model: OpenRouter rejects `chat/completions`
for it and serves it on `POST /api/alpha/decisions`. The router asks this module
when `DECISION_MODEL` names a decisions model, and maps the native answers back
into the System One shape the rest of the service already expects.
"""
from __future__ import annotations

from typing import Any

import httpx

from eccho_ai.core.variables import AppVars
from eccho_ai.llm.usage import TokenUsage
from eccho_ai.modules.decision.models import DecisionQuestion


def is_decisions_model(model: str) -> bool:
    """True when OpenRouter serves `model` on the Decisions API, not chat.

    Only the TypeSafe/Jev family is routed natively today. `~` is OpenRouter's
    auto-router prefix, as on `~typesafe/jev-latest`.
    """
    return model.lstrip("~").startswith("typesafe/")


def decisions_url(base_url: str | None = None) -> str:
    """The Decisions endpoint for the configured gateway.

    `OPENROUTER_BASE_URL` points at the chat gateway (`.../api/v1`); the
    Decisions API lives one path up (`.../api/alpha/decisions`).
    """
    base = (base_url if base_url is not None else AppVars.OPENROUTER_BASE_URL).rstrip("/")
    if base.endswith("/v1"):
        base = base[: -len("/v1")]
    return f"{base}/alpha/decisions"


def build_request(
    model: str, state: str, questions: dict[str, DecisionQuestion]
) -> dict[str, Any]:
    """A Decisions API request for the typed questions it can answer.

    `choice` and `noul` map straight onto Decisions primitives. `text` does not:
    decisions models return probabilities, never generated prose, so the router
    answers text questions with a chat model instead.
    """
    mapped: dict[str, dict[str, Any]] = {}
    for qid, question in questions.items():
        if question.type == "choice":
            mapped[qid] = {
                "type": "choice",
                "instructions": question.instructions,
                "criteria": dict(question.criteria or {}),
            }
        elif question.type == "noul":
            mapped[qid] = {"type": "noul", "instructions": question.instructions}
    return {"model": model, "state": state, "questions": mapped}


async def request_decisions(payload: dict[str, Any]) -> dict[str, Any]:
    """POST a prepared request and return the decoded Decisions response."""
    api_key = AppVars.OPENROUTER_API_KEY.get_secret_value()
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY is not configured.")
    async with httpx.AsyncClient(timeout=AppVars.CHAT_MODEL_TIMEOUT_SECONDS) as client:
        response = await client.post(
            decisions_url(),
            json=payload,
            headers={"Authorization": f"Bearer {api_key}"},
        )
        response.raise_for_status()
        data = response.json()
    if not isinstance(data, dict):
        raise ValueError("unexpected Decisions API response")
    return data


def answers_from_decisions(
    response: dict[str, Any], questions: dict[str, DecisionQuestion]
) -> dict[str, dict[str, Any]]:
    """The response's answers as the System One answer shape.

    A question the provider refused or left out is omitted, exactly as a chat
    provider leaving a field out is.
    """
    raw = response.get("answers")
    if not isinstance(raw, dict):
        return {}
    answers: dict[str, dict[str, Any]] = {}
    for qid, question in questions.items():
        answer = raw.get(qid)
        if not isinstance(answer, dict):
            continue
        if question.type == "choice":
            choice = answer.get("choice")
            confidence = answer.get("confidence")
            if isinstance(choice, str) and _is_number(confidence):
                answers[qid] = {
                    "type": "choice",
                    "choice": choice,
                    "confidence": float(confidence),
                }
        elif question.type == "noul":
            noul = answer.get("noul")
            if _is_number(noul):
                answers[qid] = {"type": "noul", "noul": float(noul)}
    return answers


def usage_from_decisions(response: dict[str, Any]) -> TokenUsage | None:
    """The tokens a Decisions call spent, in the shape apps/api meters."""
    usage = response.get("usage")
    if not isinstance(usage, dict):
        return None
    input_tokens = int(usage.get("input_tokens") or 0)
    output_tokens = int(usage.get("output_tokens") or 0)
    return TokenUsage(
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        total_tokens=input_tokens + output_tokens,
    )


def _is_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)
