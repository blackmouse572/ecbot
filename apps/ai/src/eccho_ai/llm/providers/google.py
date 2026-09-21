"""Google-model provider: image generation, routed through OpenRouter.

Text embeddings used to live here on a `google.genai` client; they now go through
OpenRouter too — see `llm/retrievers/embeddings.py`. Obtain the singleton via
`get_google_provider()`.
"""
from __future__ import annotations

import base64
import io
from functools import lru_cache
from typing import Any

import httpx
from PIL import Image

from eccho_ai.core.variables import AppVars


class GoogleProvider:
    """Image generation with Google's models via the OpenRouter gateway."""

    async def generate_image(
        self, prompt: str, image: Image.Image | None = None
    ) -> Image.Image | None:
        """Generate an image via the OpenRouter images endpoint.

        Docs: https://openrouter.ai/docs/features/multimodal/image-generation

        Note: `image` is accepted for signature compatibility but is NOT sent —
        OpenRouter's /images endpoint has no documented image-input field, so
        image-conditioned generation is not supported here yet.
        """
        headers = {
            "Authorization": f"Bearer {AppVars.OPENROUTER_API_KEY.get_secret_value()}",
            "Content-Type": "application/json",
        }
        payload: dict[str, Any] = {"model": AppVars.IMAGE_MODEL, "prompt": prompt}
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                f"{AppVars.OPENROUTER_BASE_URL}/images", json=payload, headers=headers
            )
            resp.raise_for_status()
            data = resp.json().get("data") or []
        if not data:
            return None
        return Image.open(io.BytesIO(base64.b64decode(data[0]["b64_json"])))


@lru_cache(maxsize=1)
def get_google_provider() -> GoogleProvider:
    return GoogleProvider()
