"""System One-shaped decisions, plus the text extraction they cannot do.

`system-one` always calls OpenRouter's Decisions API with `DECISION_MODEL`, so
any decisions model (Jev, Gemini Decision, Liquid, ...) works by configuration
alone. Decisions models answer typed primitives only, so `text` fields live on
`/decision/extract`, which asks a chat model.
"""
import logging
from typing import Any

from fastapi import APIRouter, Depends
from httpx import HTTPStatusError
from langchain_core.callbacks import get_usage_metadata_callback
from pydantic import BaseModel, Field, create_model

from eccho_ai.core.security import require_internal_token
from eccho_ai.core.variables import AppVars
from eccho_ai.llm.providers.chat_model import build_chat_model
from eccho_ai.llm.usage import sum_usage
from eccho_ai.models.app_models import AppResponse
from eccho_ai.modules.decision.constants import (
    EXTRACT_SYSTEM_PROMPT,
    TEXT_ANSWER_MAX,
    WRITE_MAX_TOKENS,
    WRITE_SYSTEM_PROMPT,
    WRITE_TEMPERATURE,
    WRITE_TEXT_MAX,
)
from eccho_ai.modules.decision.decisions import (
    answers_from_decisions,
    build_request,
    request_decisions,
    usage_from_decisions,
)
from eccho_ai.modules.decision.models import (
    DecisionQuestion,
    DecisionRequest,
    DecisionResponse,
    ExtractRequest,
    ExtractResponse,
    WriteRequest,
    WriteResponse,
)

logger = logging.getLogger("uvicorn.info")
router = APIRouter(
    prefix="/decision", tags=["Decision"], dependencies=[Depends(require_internal_token)]
)


def _field_model(fields: dict[str, str]) -> type[BaseModel]:
    # Field names are positional (q0, q1, ...), never the field id itself: an
    # id can be anything the caller likes, including a pydantic reserved name
    # like "model_config", which would break `create_model` if used directly.
    schema: dict[str, Any] = {}
    for index in range(len(fields)):
        # Optional: a field the state never gives must not void the others.
        schema[f"q{index}"] = (str, Field(default="", max_length=TEXT_ANSWER_MAX))
    return create_model("ExtractedFields", **schema)


def _format_fields(fields: dict[str, str]) -> str:
    return "\n".join(
        f"- q{index} ({fid}, empty if not stated): {instructions}"
        for index, (fid, instructions) in enumerate(fields.items())
    )


def _as_dict(value: Any) -> dict[str, Any]:
    return value.model_dump() if isinstance(value, BaseModel) else dict(value)


@router.post("/system-one", response_model=AppResponse[DecisionResponse])
async def system_one(req: DecisionRequest) -> AppResponse[DecisionResponse]:
    if not req.questions:
        return AppResponse(data=DecisionResponse())

    # `DECISION_MODEL` must be a decisions model: they all use the native
    # endpoint, and none accept chat/completions. Any failure (request,
    # provider, answer assembly) degrades to empty answers with HTTP 200
    # rather than bubbling up as a 400/500 through main.py's global handlers:
    # the builder must work without suggestions.
    try:
        response = await request_decisions(
            build_request(AppVars.DECISION_MODEL, req.state, req.questions)
        )
        answers = answers_from_decisions(response, req.questions)
        usage = usage_from_decisions(response)
    except HTTPStatusError as exc:
        # The body names the rejected question shape or model; `%s` on the
        # exception alone only prints the status line and URL.
        logger.warning(
            "decision.system_one failed status=%s body=%s",
            exc.response.status_code,
            exc.response.text,
        )
        answers, usage = {}, None
    except Exception as exc:  # noqa: BLE001 - the builder must work without suggestions
        logger.warning("decision.system_one failed err=%s", exc)
        answers, usage = {}, None

    return AppResponse(
        data=DecisionResponse(answers=answers, usage=usage, model=AppVars.DECISION_MODEL)
    )


@router.post("/extract", response_model=AppResponse[ExtractResponse])
async def extract(req: ExtractRequest) -> AppResponse[ExtractResponse]:
    """Copies stated details out of a state with EXTRACT_MODEL (a chat model).

    Decisions models answer typed primitives only, so text answers cannot come
    from `system-one`; this is the separate chat call for them (#623).
    """
    if not req.fields:
        return AppResponse(data=ExtractResponse())

    with get_usage_metadata_callback() as usage_cb:
        try:
            llm = build_chat_model(model_text_name=AppVars.EXTRACT_MODEL, temperature=0.0)
            structured = llm.with_structured_output(_field_model(req.fields))
            result = _as_dict(
                await structured.ainvoke(
                    [
                        {"role": "system", "content": EXTRACT_SYSTEM_PROMPT},
                        {"role": "user", "content": f"State:\n{req.state}\n\nFields:\n{_format_fields(req.fields)}"},
                    ]
                )
            )
            answers: dict[str, str] = {}
            for index, field_id in enumerate(req.fields):
                value = result.get(f"q{index}")
                if isinstance(value, str):
                    answers[field_id] = value
        except Exception as exc:  # noqa: BLE001 - the caller can prefill by hand
            logger.warning("decision.extract failed err=%s", exc)
            answers = {}

    return AppResponse(
        data=ExtractResponse(
            answers=answers,
            usage=sum_usage(usage_cb.usage_metadata),
            model=AppVars.EXTRACT_MODEL,
        )
    )


@router.post("/write", response_model=AppResponse[WriteResponse])
async def write(req: WriteRequest) -> AppResponse[WriteResponse]:
    """Drafts a short shop message (#506: a marketing offer) with WRITE_MODEL."""
    # As with system-one, a failure answers 200 with an empty text: the shop
    # can still write the message itself. Usage is reported either way.
    with get_usage_metadata_callback() as usage_cb:
        try:
            llm = build_chat_model(
                model_text_name=AppVars.WRITE_MODEL,
                temperature=WRITE_TEMPERATURE,
                max_tokens=WRITE_MAX_TOKENS,
            )
            reply = await llm.ainvoke(
                [
                    {"role": "system", "content": WRITE_SYSTEM_PROMPT},
                    {"role": "user", "content": f"Instructions:\n{req.instructions}\n\nState:\n{req.state}"},
                ]
            )
            text = str(reply.content).strip().strip('"').strip()[:WRITE_TEXT_MAX]
        except Exception as exc:  # noqa: BLE001 - the shop can write it by hand
            logger.warning("decision.write failed err=%s", exc)
            text = ""

    return AppResponse(
        data=WriteResponse(text=text, usage=sum_usage(usage_cb.usage_metadata), model=AppVars.WRITE_MODEL)
    )
