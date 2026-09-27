"""Analytical Customer-tag classifier endpoint (#170).

Called by apps/api at the "end" of a conversation — either when status flips
to RESOLVED or after 30 minutes of inbound silence. Returns the tags to apply
/ remove and a one-paragraph profile summary. Handoff-trigger tags are
filtered out on the apps/api side and never appear in `available_tags`.
"""
import logging

from fastapi import APIRouter, Depends

from eccho_ai.core.security import require_internal_token
from eccho_ai.core.variables import AppVars
from eccho_ai.models.app_models import AppResponse
from eccho_ai.modules.customer.models import (
    ClassifierMessage,
    ClassifierTagDef,
    ClassifyRequest,
    ClassifyResponse,
)
from eccho_ai.llm.providers.chat_model import build_chat_model


logger = logging.getLogger("uvicorn.info")
router = APIRouter(
    prefix="/customer",
    tags=["Customer"],
    dependencies=[Depends(require_internal_token)],
)


SYSTEM_PROMPT = """\
You are an analytical reviewer of a customer-support conversation. Your job is
to maintain the analytical tags + profile summary on a Customer record AFTER
the conversation has ended (resolved or gone quiet).

You will be given:
- The available analytical tags for this workspace (catalog) with descriptions.
- The tags currently assigned to this Customer.
- The most recent messages from the conversation, oldest first.

Your tasks:
1. Review the conversation as a whole.
2. From the catalog, choose which tags should be ADDED to better describe this
   customer. ONLY use exact tag names from the catalog. Never invent a tag.
3. From the currently-assigned list, choose which tags should be REMOVED
   because they no longer fit. Never remove a tag that is not in
   `current_tags`.
4. Write a ONE-PARAGRAPH profile summary (~50 tokens) describing who this
   customer is: their interests, tone, intent, anything an operator would want
   at a glance. Plain prose. No bullet points. No tags.

Rules:
- Do NOT include any tag whose name is not in the catalog.
- Do NOT touch tags that the catalog does not describe — treat them as out of
  scope.
- Be conservative: if a tag is borderline, leave it as it is.
- If the conversation is empty or uninformative, return empty arrays and a
  short, generic summary.
"""


def _format_catalog(catalog: list[ClassifierTagDef]) -> str:
    if not catalog:
        return "(empty catalog)"
    return "\n".join(
        f"- {t.name}{' ' + t.emoji if t.emoji else ''}: {t.description or '(no description)'}"
        for t in catalog
    )


def _format_messages(messages: list[ClassifierMessage]) -> str:
    if not messages:
        return "(no messages)"
    lines: list[str] = []
    for m in messages:
        text = m.text.strip() if m.text else "(empty)"
        lines.append(f"[{m.role}] {text}")
    return "\n".join(lines)


def _build_user_prompt(req: ClassifyRequest) -> str:
    return (
        f"Conversation id: {req.conversation_id}\n"
        f"Customer id: {req.customer_id}\n\n"
        f"Available tag catalog (use exact names):\n{_format_catalog(req.available_tags)}\n\n"
        f"Currently assigned tags: {', '.join(req.current_tags) if req.current_tags else '(none)'}\n\n"
        f"Conversation (oldest first):\n{_format_messages(req.recent_messages)}"
    )


@router.post(
    "/classify",
    response_model=AppResponse[ClassifyResponse],
)
async def classify(req: ClassifyRequest) -> AppResponse[ClassifyResponse]:
    llm = build_chat_model(
        model_text_name=AppVars.CLASSIFIER_MODEL,
        temperature=AppVars.CUSTOMER_CLASSIFIER_TEMPERATURE,
    )
    structured = llm.with_structured_output(ClassifyResponse)

    user_prompt = _build_user_prompt(req)
    try:
        result = await structured.ainvoke(
            [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ]
        )
    except Exception as exc:  # noqa: BLE001 — never crash the BullMQ job
        logger.warning(
            "customer.classify failed conv=%s customer=%s err=%s",
            req.conversation_id,
            req.customer_id,
            exc,
        )
        return AppResponse(data=ClassifyResponse())

    if not isinstance(result, ClassifyResponse):
        # Defensive — `with_structured_output` should already return the
        # bound schema, but some providers return a dict-like.
        try:
            result = ClassifyResponse.model_validate(result)
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "customer.classify parse failed conv=%s err=%s",
                req.conversation_id,
                exc,
            )
            return AppResponse(data=ClassifyResponse())

    # Defense-in-depth: trim to known catalog / current sets. apps/api also
    # filters but we don't want to hand back a tag the catalog doesn't define.
    available_names = {t.name for t in req.available_tags}
    current_names = set(req.current_tags)
    result.tags_to_add = [t for t in result.tags_to_add if t in available_names]
    result.tags_to_remove = [t for t in result.tags_to_remove if t in current_names]

    return AppResponse(data=result)
