"""System One-shaped decisions answered by an OpenRouter model.

apps/api sends typed questions (choice / noul, built by @repo/agent-blueprint)
and reads answers in the shape TypeSafe's System One API uses, so which model
decides is configuration (DECISION_MODEL), not code.
"""
import logging
from typing import Any, Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field, create_model

from eccho_ai.core.variables import AppVars
from eccho_ai.llm.providers.chat_model import build_chat_model
from eccho_ai.models.app_models import AppResponse
from eccho_ai.modules.decision.models import DecisionQuestion, DecisionRequest, DecisionResponse

logger = logging.getLogger("uvicorn.info")
router = APIRouter(prefix="/decision", tags=["Decision"])

SYSTEM_PROMPT = """\
You answer typed questions about a piece of state, like a calibrated classifier.
For a "choice" question, pick exactly one option id from its options and give
your confidence from 0 to 1 that it is the right option.
For a "noul" question, give the probability from 0 to 1 that the answer is yes.
Judge only from the state. Do not explain.
"""


def _output_model(questions: dict[str, DecisionQuestion]) -> type[BaseModel]:
    fields: dict[str, Any] = {}
    for index, (qid, q) in enumerate(questions.items()):
        if q.type == "choice":
            options = tuple((q.criteria or {}).keys())
            answer = create_model(
                f"ChoiceAnswer{index}",
                choice=(Literal[options], ...),  # type: ignore[valid-type]
                confidence=(float, Field(ge=0, le=1)),
            )
            fields[qid] = (answer, ...)
        else:
            fields[qid] = (float, Field(ge=0, le=1))
    return create_model("DecisionAnswers", **fields)


def _format_questions(questions: dict[str, DecisionQuestion]) -> str:
    lines: list[str] = []
    for qid, q in questions.items():
        if q.type == "choice":
            options = "\n".join(f"    - {key}: {text}" for key, text in (q.criteria or {}).items())
            lines.append(f"- {qid} (choice): {q.instructions}\n  options:\n{options}")
        else:
            lines.append(f"- {qid} (noul, probability of yes): {q.instructions}")
    return "\n".join(lines)


def _as_dict(value: Any) -> dict[str, Any]:
    return value.model_dump() if isinstance(value, BaseModel) else dict(value)


@router.post("/system-one", response_model=AppResponse[DecisionResponse])
async def system_one(req: DecisionRequest) -> AppResponse[DecisionResponse]:
    if not req.questions:
        return AppResponse(data=DecisionResponse())

    llm = build_chat_model(model_text_name=AppVars.DECISION_MODEL, temperature=0.0)
    structured = llm.with_structured_output(_output_model(req.questions))
    try:
        result = _as_dict(
            await structured.ainvoke(
                [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": f"State:\n{req.state}\n\nQuestions:\n{_format_questions(req.questions)}"},
                ]
            )
        )
    except Exception as exc:  # noqa: BLE001 - the builder must work without suggestions
        logger.warning("decision.system_one failed err=%s", exc)
        return AppResponse(data=DecisionResponse())

    answers: dict[str, dict[str, Any]] = {}
    for qid, q in req.questions.items():
        value = result.get(qid)
        if value is None:
            continue
        if q.type == "choice":
            v = _as_dict(value)
            answers[qid] = {"type": "choice", "choice": v.get("choice"), "confidence": v.get("confidence")}
        else:
            answers[qid] = {"type": "noul", "noul": value}
    return AppResponse(data=DecisionResponse(answers=answers))
