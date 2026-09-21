import base64
import io

import pytest
from PIL import Image
from pydantic import SecretStr

import eccho_ai.core.variables as cv
from eccho_ai.llm.providers.google import get_google_provider


@pytest.mark.asyncio
async def test_generate_image_decodes_openrouter_b64(monkeypatch):
    buf = io.BytesIO()
    Image.new("RGB", (2, 2), "red").save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode()

    class _Resp:
        def raise_for_status(self): ...
        def json(self):
            return {"data": [{"b64_json": b64, "media_type": "image/png"}]}

    class _Client:
        def __init__(self):
            self.last_url = None
            self.last_json = None
            self.last_headers = None

        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            ...

        async def post(self, url, *, json=None, headers=None):
            self.last_url = url
            self.last_json = json
            self.last_headers = headers
            return _Resp()

    captured = _Client()

    monkeypatch.setattr("eccho_ai.llm.providers.google.httpx.AsyncClient", lambda *a, **k: captured)
    monkeypatch.setattr(
        "eccho_ai.core.variables.AppVars.OPENROUTER_API_KEY", SecretStr("sk-test")
    )

    img = await get_google_provider().generate_image("a red square")

    # Decode path yields a PIL image.
    assert isinstance(img, Image.Image)

    # Request is shaped for the OpenRouter images endpoint.
    assert captured.last_url == f"{cv.AppVars.OPENROUTER_BASE_URL}/images"
    assert captured.last_json == {
        "model": cv.AppVars.IMAGE_MODEL,
        "prompt": "a red square",
    }
    assert captured.last_headers["Authorization"].startswith("Bearer ")
