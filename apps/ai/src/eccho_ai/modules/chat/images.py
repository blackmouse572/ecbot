"""Image understanding for inbound user images.

A vision model (VISION_MODEL) turns the user's images into a neutral
description plus a verbatim transcription of any visible text, appended to the
message. Everything downstream (input guardrail, RAG retrieval, the agent)
then works on text, so any chatbot model can answer — and what the business
does with the image (a product photo, a flyer, a receipt…) is up to its own
instructions, not the platform.
"""
from __future__ import annotations

import base64

import httpx
from langchain_core.messages import HumanMessage

from eccho_ai.core.app_logger import get_logger
from eccho_ai.core.variables import AppVars
from eccho_ai.llm.providers.chat_model import build_chat_model
from eccho_ai.modules.chat.models.chat_models import ChatRequest

logger = get_logger(__name__)

_DESCRIBE_PROMPT = (
    "A user sent these images in a chat with a business. Describe what they show, "
    "factually and concisely: the kind of image (photo, flyer, banner, screenshot, "
    "document…), the main subjects and their distinguishing details. Then transcribe "
    "all visible text verbatim (names, dates, times, prices, addresses, codes). "
    "Do not guess anything that is not visible."
)
_NO_USAGE: dict[str, int] = {}
_UNREADABLE_NOTE = "[The user sent an image that could not be viewed.]"


async def fetch_image_data_url(url: str) -> str | None:
    """Download an image into memory as a base64 data URL; None if unusable."""
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
            res = await client.get(url)
        res.raise_for_status()
    except httpx.HTTPError as exc:
        logger.warning("image_fetch_failed", error=str(exc))
        return None
    mime = res.headers.get("content-type", "").split(";")[0].strip()
    if not mime.startswith("image/") or len(res.content) > AppVars.VISION_MAX_IMAGE_BYTES:
        return None
    return f"data:{mime};base64,{base64.b64encode(res.content).decode()}"


async def _describe(urls: list[str]) -> tuple[str, dict[str, int]]:
    data_urls = [d for d in [await fetch_image_data_url(u) for u in urls] if d]
    if not data_urls:
        return "", _NO_USAGE
    content = [{"type": "text", "text": _DESCRIBE_PROMPT}] + [
        {"type": "image_url", "image_url": {"url": d}} for d in data_urls
    ]
    try:
        model = build_chat_model(AppVars.VISION_MODEL, temperature=0.0, max_tokens=500)
        reply = await model.ainvoke([HumanMessage(content=content)])
    except Exception as exc:
        logger.warning("image_describe_failed", error=str(exc))
        return "", _NO_USAGE
    usage = reply.usage_metadata or {}
    return str(reply.content).strip(), {
        key: usage.get(key, 0) for key in ("input_tokens", "output_tokens", "total_tokens")
    }


async def with_image_description(
    chat_request: ChatRequest,
) -> tuple[ChatRequest, dict[str, int]]:
    """Return the request with its images described in `message`, plus the
    token usage of the vision call (billed with the turn)."""
    urls = [a.preview_url for a in chat_request.attachments or [] if a.preview_url]
    if not urls:
        return chat_request, _NO_USAGE

    description, usage = await _describe(urls[: AppVars.VISION_MAX_IMAGES])
    note = (
        f"[The user sent {len(urls)} image(s). Image description: {description}]"
        if description
        else _UNREADABLE_NOTE
    )
    message = f"{chat_request.message}\n\n{note}" if chat_request.message else note
    return chat_request.model_copy(update={"message": message}), usage
