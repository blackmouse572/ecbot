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
    assert await images.with_image_description(req) == (req, {})


async def test_image_description_is_appended_to_the_message():
    model = _vision_model("A white linen shirt with a mandarin collar.")
    with patch.object(images, "fetch_image_data_url", AsyncMock(return_value="data:image/jpeg;base64,AAA")), \
         patch.object(images, "build_chat_model", return_value=model):
        out, usage = await images.with_image_description(_req("how much is this?", ["https://cdn/x.jpg"]))

    assert out.message.startswith("how much is this?")
    assert "A white linen shirt with a mandarin collar." in out.message
    # All images go to the vision model together, inline as base64 data URLs.
    parts = model.ainvoke.call_args.args[0][0].content
    assert {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64,AAA"}} in parts
    assert usage == USAGE  # the vision call is billed with the turn


async def test_image_only_message_gets_a_description_as_its_text():
    model = _vision_model("A red dress.")
    with patch.object(images, "fetch_image_data_url", AsyncMock(return_value="data:image/png;base64,B")), \
         patch.object(images, "build_chat_model", return_value=model):
        out, _ = await images.with_image_description(_req(None, ["https://cdn/a.png", "https://cdn/b.png"]))

    assert "A red dress." in out.message
    parts = model.ainvoke.call_args.args[0][0].content
    assert sum(p["type"] == "image_url" for p in parts) == 2


async def test_unreadable_image_still_tells_the_agent_an_image_was_sent():
    with patch.object(images, "fetch_image_data_url", AsyncMock(return_value=None)):
        out, usage = await images.with_image_description(_req(None, ["https://cdn/gone.jpg"]))

    assert out.message
    assert "could not be viewed" in out.message
    assert usage == {}


async def test_vision_model_failure_falls_back_to_the_unreadable_note():
    model = MagicMock()
    model.ainvoke = AsyncMock(side_effect=RuntimeError("boom"))
    with patch.object(images, "fetch_image_data_url", AsyncMock(return_value="data:image/png;base64,B")), \
         patch.object(images, "build_chat_model", return_value=model):
        out, _ = await images.with_image_description(_req("?", ["https://cdn/a.png"]))

    assert "could not be viewed" in out.message


def test_system_prompt_image_guidance_is_business_neutral():
    """The platform explains images; what to do with them is the operator's call."""
    section = system_prompt_template()
    start, end = section.index("<images>"), section.index("</images>")
    rules = " ".join(section[start:end].lower().split())
    assert "image description" in rules
    assert "send_image" in rules
    assert "price" not in rules and "product" not in rules
