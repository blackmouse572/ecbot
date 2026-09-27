"""Image understanding for inbound customer images.

When a Turn starts, apps/api asks for the burst's images to be described (one
vision call per burst, VISION_MODEL). Each image gets a neutral description
plus a verbatim transcription of its visible text, and a catalog match when
the operator instructions carry product images. apps/api keeps each
description on its image and sends it as text, so any chatbot model can
answer. What the business does with an image (a product photo, a flyer, a
receipt) is up to its own instructions, not the platform.
"""
from __future__ import annotations

import asyncio
import base64
import json
import re
from typing import Any

import httpx
from langchain_core.messages import HumanMessage

from eccho_ai.core.app_logger import get_logger
from eccho_ai.core.variables import AppVars
from eccho_ai.llm.guardrails.content import run_input_guardrail
from eccho_ai.llm.providers.chat_model import build_chat_model
from eccho_ai.modules.chat.models.chat_models import ImageToDescribe

logger = get_logger(__name__)

_DESCRIBE_PROMPT = (
    "A user sent these numbered images in a chat with a business. Describe what "
    "each shows, factually and concisely: the kind of image (photo, flyer, banner, "
    "screenshot, document), the main subjects and their distinguishing details. "
    "Then transcribe all visible text verbatim (names, dates, times, prices, "
    "addresses, codes). Do not guess anything that is not visible. Reply with JSON "
    'only: {"images": [{"image": <number>, "description": "<text>"}]}, one entry '
    "per user image."
)
_CATALOG_PROMPT = (
    "After the user's images come the business's own catalog images, each after "
    "its label. They are for comparison only: describe only the user's images. "
    "End each description with one line: 'Catalog match: <label>' when that image "
    "shows the same item as a catalog image, otherwise 'Catalog match: none'."
)
_CATALOG_IMAGE = re.compile(r"!\[([^\]\n]*)\]\((https?://[^)\s]+)\)")
# Some image hosts (Wikimedia, some shop CDNs) refuse library default agents.
_USER_AGENT = "eccho-ai/1.0 (image description)"
_TOKENS_PER_IMAGE = 300
_FENCE = re.compile(r"^```(?:json)?\s*|\s*```$")


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
    data_urls = await asyncio.gather(*(fetch_image_data_url(url) for _, url in found))
    parts: list[dict] = []
    for (label, url), data_url in zip(found, data_urls):
        if data_url:
            parts += [{"type": "text", "text": f"Catalog image: {label or url}"}, _image(data_url)]
    return parts


def _usage(reply: Any) -> dict[str, int]:
    usage = getattr(reply, "usage_metadata", None) or {}
    return {key: usage.get(key, 0) for key in ("input_tokens", "output_tokens", "total_tokens")}


def _parse(content: Any, count: int) -> list[str | None]:
    """The model's JSON reply as one description per numbered image."""
    try:
        entries = json.loads(_FENCE.sub("", str(content).strip()))["images"]
        by_number = {int(e["image"]): str(e["description"]).strip() for e in entries}
    except (ValueError, KeyError, TypeError) as exc:
        logger.warning("image_describe_unparsable", error=str(exc))
        return [None] * count
    return [by_number.get(n) or None for n in range(1, count + 1)]


async def _screen(description: str | None, chatbot: Any) -> str | None:
    """None when the input guardrail would block it: saved text is replayed in
    every later Turn's history, so it is screened once, here."""
    if description and await run_input_guardrail(description, chatbot):
        logger.warning("image_description_blocked")
        return None
    return description


async def describe_images(
    images: list[ImageToDescribe], chatbot: Any
) -> tuple[list[str | None], dict[str, int]]:
    """One description per image (None when it could not be fetched, read or
    passed screening), and the vision call's token usage."""
    wanted = images[: AppVars.VISION_MAX_IMAGES]
    data_urls = await asyncio.gather(*(fetch_image_data_url(i.url) for i in wanted))
    fetched = [(n, d) for n, d in enumerate(data_urls) if d]
    if not fetched:
        return [None] * len(images), {}

    catalog = await _catalog_parts(chatbot.general_knowledge)
    prompt = f"{_DESCRIBE_PROMPT} {_CATALOG_PROMPT}" if catalog else _DESCRIBE_PROMPT
    content: list[dict] = [{"type": "text", "text": prompt}]
    for number, (_, data_url) in enumerate(fetched, start=1):
        content += [{"type": "text", "text": f"Image {number}"}, _image(data_url)]
    content += catalog
    try:
        model = build_chat_model(
            AppVars.VISION_MODEL, temperature=0.0, max_tokens=_TOKENS_PER_IMAGE * len(fetched)
        )
        reply = await model.ainvoke([HumanMessage(content=content)])
    except Exception as exc:
        logger.warning("image_describe_failed", error=str(exc))
        return [None] * len(images), {}

    parsed = _parse(reply.content, len(fetched))
    screened = await asyncio.gather(*(_screen(d, chatbot) for d in parsed))
    described: list[str | None] = [None] * len(images)
    for (index, _), description in zip(fetched, screened):
        described[index] = description
    return described, _usage(reply)
