"""Image understanding: customer images become a text description the agent and RAG can use."""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

from langchain_core.messages import AIMessage

from eccho_ai.llm.prompts.loader import system_prompt_template
from eccho_ai.modules.chat import images
from eccho_ai.modules.chat.models.chat_models import AttachmentData, ChatRequest


def _req(message: str | None, urls: list[str]) -> ChatRequest:
    return ChatRequest(
        chatbot_id="bot-1",
        message=message,
        attachments=[AttachmentData(attachment_id=f"a{i}", preview_url=u) for i, u in enumerate(urls)],
    )


USAGE = {"input_tokens": 1200, "output_tokens": 40, "total_tokens": 1240}


def _vision_model(reply: str) -> MagicMock:
    model = MagicMock()
    model.ainvoke = AsyncMock(return_value=AIMessage(content=reply, usage_metadata=USAGE))
    return model


async def test_no_attachments_leaves_request_untouched():
    req = ChatRequest(chatbot_id="bot-1", message="hi")
    assert await images.with_image_description(req) == (req, {}, None)


async def test_image_description_is_appended_to_the_message():
    model = _vision_model("A white linen shirt with a mandarin collar.")
    with patch.object(images, "fetch_image_data_url", AsyncMock(return_value="data:image/jpeg;base64,AAA")), \
         patch.object(images, "build_chat_model", return_value=model):
        out, usage, described = await images.with_image_description(_req("how much is this?", ["https://cdn/x.jpg"]))

    assert out.message.startswith("how much is this?")
    assert "A white linen shirt with a mandarin collar." in out.message
    # All images go to the vision model together, inline as base64 data URLs.
    parts = model.ainvoke.call_args.args[0][0].content
    assert {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64,AAA"}} in parts
    assert usage == USAGE  # the vision call is billed with the turn
    # Reported back so apps/api can keep it for later turns (on the last image's message).
    assert described == {"messageId": "a0", "description": "A white linen shirt with a mandarin collar."}


async def test_image_only_message_gets_a_description_as_its_text():
    model = _vision_model("A red dress.")
    with patch.object(images, "fetch_image_data_url", AsyncMock(return_value="data:image/png;base64,B")), \
         patch.object(images, "build_chat_model", return_value=model):
        out, _, _ = await images.with_image_description(_req(None, ["https://cdn/a.png", "https://cdn/b.png"]))

    assert "A red dress." in out.message
    parts = model.ainvoke.call_args.args[0][0].content
    assert sum(p["type"] == "image_url" for p in parts) == 2


async def test_unreadable_image_still_tells_the_agent_an_image_was_sent():
    with patch.object(images, "fetch_image_data_url", AsyncMock(return_value=None)):
        out, usage, described = await images.with_image_description(_req(None, ["https://cdn/gone.jpg"]))

    assert out.message
    assert "could not be viewed" in out.message
    assert usage == {}
    assert described is None


async def test_vision_model_failure_falls_back_to_the_unreadable_note():
    model = MagicMock()
    model.ainvoke = AsyncMock(side_effect=RuntimeError("boom"))
    with patch.object(images, "fetch_image_data_url", AsyncMock(return_value="data:image/png;base64,B")), \
         patch.object(images, "build_chat_model", return_value=model):
        out, _, _ = await images.with_image_description(_req("?", ["https://cdn/a.png"]))

    assert "could not be viewed" in out.message


def test_system_prompt_image_guidance_is_business_neutral():
    """The platform explains images; what to do with them is the operator's call."""
    section = system_prompt_template()
    start, end = section.index("<images>"), section.index("</images>")
    rules = " ".join(section[start:end].lower().split())
    assert "image description" in rules
    assert "send_image" in rules
    assert "price" not in rules and "product" not in rules
    # Sending back the catalog photo of what the user just showed is noise.
    assert "already shows" in rules
    assert "\u2014" not in section[start:end]


# ---- fetch_image_data_url: bounded, no redirects --------------------------

import httpx  # noqa: E402

_RealClient = httpx.AsyncClient


def _serve(handler):
    """Patch the module's AsyncClient to answer from `handler` (keeps kwargs)."""
    return patch.object(
        images.httpx,
        "AsyncClient",
        lambda **kw: _RealClient(transport=httpx.MockTransport(handler), **kw),
    )


async def test_fetch_returns_a_data_url_for_a_small_image():
    with _serve(lambda req: httpx.Response(200, headers={"content-type": "image/png"}, content=b"PNG")):
        assert await images.fetch_image_data_url("https://s3/a.png") == "data:image/png;base64,UE5H"


async def test_fetch_names_itself_in_the_user_agent():
    # Some image hosts (Wikimedia, some shop CDNs) refuse library default agents.
    def handler(req):
        if req.headers["user-agent"].startswith("python-httpx"):
            return httpx.Response(403)
        return httpx.Response(200, headers={"content-type": "image/png"}, content=b"PNG")

    with _serve(handler):
        assert await images.fetch_image_data_url("https://kb/a.png") == "data:image/png;base64,UE5H"


async def test_fetch_does_not_follow_redirects():
    def handler(req):
        if req.url.host == "s3":
            return httpx.Response(302, headers={"location": "http://169.254.169.254/latest"})
        raise AssertionError("redirect was followed")

    with _serve(handler):
        assert await images.fetch_image_data_url("https://s3/a.png") is None


async def test_fetch_gives_up_on_an_oversized_body_while_streaming():
    chunk = b"x" * 65536
    sent = 0

    class Endless(httpx.AsyncByteStream):
        async def __aiter__(self):
            nonlocal sent
            while True:  # no content-length and no end: only a streaming cap stops this
                sent += len(chunk)
                yield chunk

    def handler(req):
        return httpx.Response(200, headers={"content-type": "image/jpeg"}, stream=Endless())

    with _serve(handler):
        assert await images.fetch_image_data_url("https://s3/endless.jpg") is None
    assert sent <= images.AppVars.VISION_MAX_IMAGE_BYTES + 2 * len(chunk)


async def test_catalog_images_from_the_instructions_go_to_the_vision_model_labelled():
    # The agent only sees a text description, so the vision model is the one
    # place that can tell a customer photo is one of the shop's own products.
    model = _vision_model("A photo of the catalog item 'White linen shirt'.")
    catalog = (
        "White linen shirt, 350.000đ\n"
        "![White linen shirt](https://kb/shirt.jpg)\n"
        "![Blue dress](https://kb/dress.jpg)"
    )
    fetch = AsyncMock(side_effect=lambda url: f"data:image/jpeg;base64,{url.rsplit('/', 1)[-1]}")
    with patch.object(images, "fetch_image_data_url", fetch), \
         patch.object(images, "build_chat_model", return_value=model):
        await images.with_image_description(_req("do you have this?", ["https://s3/u.jpg"]), catalog)

    parts = model.ainvoke.call_args.args[0][0].content
    texts = [p["text"] for p in parts if p["type"] == "text"]
    assert "Catalog image: White linen shirt" in texts
    assert "Catalog image: Blue dress" in texts
    urls = [p["image_url"]["url"] for p in parts if p["type"] == "image_url"]
    assert urls == [
        "data:image/jpeg;base64,u.jpg",
        "data:image/jpeg;base64,shirt.jpg",
        "data:image/jpeg;base64,dress.jpg",
    ]
