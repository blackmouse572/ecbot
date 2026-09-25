"""Image understanding for inbound customer images.

A vision model turns the customer's images into a short product-oriented
description, appended to the message text. Everything downstream (input
guardrail, RAG retrieval, the agent) then works on text — so the KB lookup
finds the matching product and any chatbot model can answer, vision-capable
or not.
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
    "A customer of an online shop sent these images. Describe what they show so the "
    "shop can look the item up in its product catalog: product type, colors, material, "
    "pattern, style, and any visible text, brand, logo, or label. Be factual and concise "
    "(at most 3 sentences). Do not guess prices. If it is not a product, say briefly what it is."
)
_UNREADABLE_NOTE = "[The customer sent an image that could not be viewed.]"


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


async def _describe(urls: list[str]) -> str:
    data_urls = [d for d in [await fetch_image_data_url(u) for u in urls] if d]
    if not data_urls:
        return ""
    content = [{"type": "text", "text": _DESCRIBE_PROMPT}] + [
        {"type": "image_url", "image_url": {"url": d}} for d in data_urls
    ]
    try:
        model = build_chat_model(AppVars.VISION_MODEL, temperature=0.0, max_tokens=300)
        reply = await model.ainvoke([HumanMessage(content=content)])
    except Exception as exc:
        logger.warning("image_describe_failed", error=str(exc))
        return ""
    return str(reply.content).strip()


async def with_image_description(chat_request: ChatRequest) -> ChatRequest:
    """Return the request with its image attachments described in `message`."""
    urls = [a.preview_url for a in chat_request.attachments or [] if a.preview_url]
    if not urls:
        return chat_request

    description = await _describe(urls[: AppVars.VISION_MAX_IMAGES])
    note = (
        f"[The customer sent {len(urls)} image(s). Image description: {description}]"
        if description
        else _UNREADABLE_NOTE
    )
    message = f"{chat_request.message}\n\n{note}" if chat_request.message else note
    return chat_request.model_copy(update={"message": message})
