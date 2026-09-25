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
import re

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
_CATALOG_PROMPT = (
    "After the user's images come the business's own catalog images, each after "
    "its label. They are for comparison only: describe only the user's images. "
    "End with one line: 'Catalog match: <label>' when a user image shows the same "
    "item as a catalog image, otherwise 'Catalog match: none'."
)
_CATALOG_IMAGE = re.compile(r"!\[([^\]\n]*)\]\((https?://[^)\s]+)\)")
_NO_USAGE: dict[str, int] = {}
_UNREADABLE_NOTE = "[The user sent an image that could not be viewed.]"
# Some image hosts (Wikimedia, some shop CDNs) refuse library default agents.
_USER_AGENT = "eccho-ai/1.0 (image description)"


async def fetch_image_data_url(url: str) -> str | None:
    """Download an image into memory as a base64 data URL; None if unusable.

    Redirects are not followed (the URL is ours or the platform's, never a
    hop to somewhere else), and the size cap holds while streaming, so an
    oversized or endless body is never buffered whole.
    """
    cap = AppVars.VISION_MAX_IMAGE_BYTES
    try:
        async with httpx.AsyncClient(
            timeout=10, follow_redirects=False, headers={"User-Agent": _USER_AGENT}
        ) as client:
            async with client.stream("GET", url) as res:
                if res.status_code != 200:
                    return None
                mime = res.headers.get("content-type", "").split(";")[0].strip()
                if not mime.startswith("image/") or int(res.headers.get("content-length") or 0) > cap:
                    return None
                body = bytearray()
                async for chunk in res.aiter_bytes():
                    body.extend(chunk)
                    if len(body) > cap:
                        return None
    except httpx.HTTPError as exc:
        logger.warning("image_fetch_failed", error=str(exc))
        return None
    return f"data:{mime};base64,{base64.b64encode(body).decode()}"


def _image(data_url: str) -> dict:
    return {"type": "image_url", "image_url": {"url": data_url}}


async def _catalog_parts(instructions: str | None) -> list[dict]:
    """Markdown images in the operator instructions, each after its label."""
    found = _CATALOG_IMAGE.findall(instructions or "")[: AppVars.VISION_MAX_CATALOG_IMAGES]
    parts: list[dict] = []
    for label, url in found:
        data_url = await fetch_image_data_url(url)
        if data_url:
            parts += [{"type": "text", "text": f"Catalog image: {label or url}"}, _image(data_url)]
    return parts


async def _describe(urls: list[str], instructions: str | None) -> tuple[str, dict[str, int]]:
    data_urls = [d for d in [await fetch_image_data_url(u) for u in urls] if d]
    if not data_urls:
        return "", _NO_USAGE
    catalog = await _catalog_parts(instructions)
    prompt = f"{_DESCRIBE_PROMPT} {_CATALOG_PROMPT}" if catalog else _DESCRIBE_PROMPT
    content = [{"type": "text", "text": prompt}, *map(_image, data_urls), *catalog]
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
    instructions: str | None = None,
) -> tuple[ChatRequest, dict[str, int], dict[str, str] | None]:
    """Return the request with its images described in `message`, the token
    usage of the vision call (billed with the turn), and — when there is a
    description — `{messageId, description}` for apps/api to keep, so later
    turns remember what the images showed. Catalog images in `instructions`
    (the chatbot's operator instructions) are shown to the vision model too."""
    attachments = [a for a in chat_request.attachments or [] if a.preview_url]
    if not attachments:
        return chat_request, _NO_USAGE, None

    urls = [a.preview_url for a in attachments]
    description, usage = await _describe(urls[: AppVars.VISION_MAX_IMAGES], instructions)
    note = (
        f"[The user sent {len(urls)} image(s). Image description: {description}]"
        if description
        else _UNREADABLE_NOTE
    )
    message = f"{chat_request.message}\n\n{note}" if chat_request.message else note
    described = (
        {"messageId": attachments[-1].attachment_id, "description": description}
        if description
        else None
    )
    return chat_request.model_copy(update={"message": message}), usage, described
