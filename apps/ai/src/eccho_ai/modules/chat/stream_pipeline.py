"""Maps LangChain `astream_events` (v2) events to AI SDK v5 UI Message Stream parts.

Pure event→part mapping — no FastAPI/HTTP coupling, no guardrail/model logic.
`chat_stream_endpoint` (routers.py) supplies the async event iterator plus the
already-decided pieces (input guardrail reason, an output-guardrail check
callback, collected RAG sources) and streams the returned frames.
"""
import json
from collections.abc import AsyncIterator, Awaitable, Callable
from typing import Any

from eccho_ai.core.app_logger import get_logger
from eccho_ai.modules.chat import ui_message_stream as ui
from eccho_ai.modules.chat.image_markdown import Image, ImageMarkdownFilter, Piece
from eccho_ai.modules.chat.prompt_leak import PROMPT_LEAK_REASON, PromptLeakFilter

logger = get_logger(__name__)

SEND_IMAGE_TOOL = "send_image"


async def events_to_ui_parts(
    events: AsyncIterator[dict],
    *,
    request_id: str,
    guardrail_reason: str | None = None,
    output_guardrail: Callable[[str], Awaitable[str | None]] | None = None,
    sources: list[dict[str, Any]] | None = None,
    image_url_allowed: Callable[[str], Awaitable[bool]] | None = None,
) -> AsyncIterator[str]:
    """Yield UI Message Stream SSE frames for one agent turn.

    Order: start -> (guardrail data-part) | (text/reasoning/tool parts ->
    optional data-guardrail | source-url*+message-metadata) -> finish -> done.

    `image_url_allowed` screens markdown images in the text (allowed ones
    leave it as `file` parts, like `send_image`).
    """
    yield ui.start(request_id)
    # Open-run trackers live outside the try so the `except` handler can close
    # any unterminated text/reasoning/tool bracket before emitting `error`.
    text_id: str | None = None
    reasoning_id: str | None = None
    step_open = False
    try:
        if guardrail_reason is not None:
            yield ui.data_part("guardrail", {"reason": guardrail_reason})
            return

        text_run = 0
        reasoning_run = 0
        output_text = ""
        usage = {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0}
        images = ImageMarkdownFilter(image_url_allowed) if image_url_allowed else None
        leak = PromptLeakFilter()
        leaked = False
        tool_names: dict[str, str] = {}

        async def screen(text: str) -> list[Piece]:
            nonlocal leaked
            safe = leak.feed(text)
            if safe is None:
                leaked = True
                return []
            return await images.feed(safe) if images else [safe]

        async def flush_screens() -> list[Piece]:
            held = leak.flush()
            pieces = (await images.feed(held) if images else [held]) if held else []
            return pieces + (await images.flush() if images else [])

        def emit(pieces: list[Piece]):
            """Frames for screened pieces: text into the open text run (opened
            on demand), allowed images as file parts."""
            nonlocal text_id, text_run, output_text
            for piece in pieces:
                if isinstance(piece, Image):
                    yield ui.file(piece.url, "image/*")
                elif piece:
                    output_text += piece
                    if text_id is None:
                        text_run += 1
                        text_id = f"text-{text_run}"
                        yield ui.text_start(text_id)
                    yield ui.text_delta(text_id, piece)

        async for event in events:
            evt_type = event.get("event")
            data = event.get("data", {})

            if evt_type == "on_chat_model_stream":
                chunk = data.get("chunk")

                # DeepSeek-style: reasoning lives in additional_kwargs.reasoning_content
                reasoning_kw = (getattr(chunk, "additional_kwargs", None) or {}).get(
                    "reasoning_content"
                )
                if reasoning_kw:
                    if reasoning_id is None:
                        reasoning_run += 1
                        reasoning_id = f"reasoning-{reasoning_run}"
                        yield ui.reasoning_start(reasoning_id)
                    yield ui.reasoning_delta(reasoning_id, reasoning_kw)

                # Content may be a plain string (DeepSeek, OpenAI) or a list of
                # typed blocks (Anthropic, Bedrock).
                content = getattr(chunk, "content", None)
                if isinstance(content, str):
                    for frame in emit(await screen(content)):
                        yield frame
                elif isinstance(content, list):
                    for block in content:
                        if not isinstance(block, dict):
                            continue
                        btype = block.get("type")
                        if btype == "reasoning":
                            reasoning_chunk = block.get("reasoning")
                            if reasoning_chunk:
                                if reasoning_id is None:
                                    reasoning_run += 1
                                    reasoning_id = f"reasoning-{reasoning_run}"
                                    yield ui.reasoning_start(reasoning_id)
                                yield ui.reasoning_delta(reasoning_id, reasoning_chunk)
                        elif btype == "text":
                            text_chunk = block.get("text", "")
                            if text_chunk:
                                for frame in emit(await screen(text_chunk)):
                                    yield frame

                usage_metadata = getattr(chunk, "usage_metadata", None)
                if usage_metadata:
                    usage["input_tokens"] += usage_metadata.get("input_tokens", 0)
                    usage["output_tokens"] += usage_metadata.get("output_tokens", 0)
                    usage["total_tokens"] += usage_metadata.get("total_tokens", 0)

                if leaked:
                    break

            elif evt_type == "on_tool_start":
                for frame in emit(await flush_screens()):
                    yield frame
                if text_id is not None:
                    yield ui.text_end(text_id)
                    text_id = None
                if reasoning_id is not None:
                    yield ui.reasoning_end(reasoning_id)
                    reasoning_id = None

                tool_call_id: str = event.get("run_id") or "unknown"
                tool_name: str = event.get("name", "")
                tool_names[tool_call_id] = tool_name
                yield ui.start_step()
                step_open = True
                yield ui.tool_input_start(tool_call_id, tool_name)
                yield ui.tool_input_available(
                    tool_call_id, tool_name, data.get("input", {})
                )

            elif evt_type == "on_tool_end":
                tool_call_id: str = event.get("run_id") or "unknown"
                msg = data.get("output")
                output = getattr(msg, "content", msg)
                if isinstance(output, str):
                    try:
                        output = json.loads(output)
                    except json.JSONDecodeError:
                        pass
                yield ui.tool_output_available(tool_call_id, output)
                if (
                    tool_names.get(tool_call_id) == SEND_IMAGE_TOOL
                    and isinstance(output, dict)
                    and output.get("ok")
                ):
                    yield ui.file(output["url"], "image/*")
                yield ui.finish_step()
                step_open = False

        if leaked:
            # Stop the agent run: nothing it produces from here can be sent.
            aclose = getattr(events, "aclose", None)
            if aclose is not None:
                await aclose()
        else:
            for frame in emit(await flush_screens()):
                yield frame
        if text_id is not None:
            yield ui.text_end(text_id)
            text_id = None
        if reasoning_id is not None:
            yield ui.reasoning_end(reasoning_id)
            reasoning_id = None

        # A reply that starts reproducing the system prompt is cut at the first
        # marker (see prompt_leak.py). apps/api answers a `data-guardrail` with
        # the chatbot's fallback message. Usage goes first: apps/api stops
        # reading at the guardrail part, and the turn must still be billed.
        if leaked:
            logger.warning(
                "Prompt leak blocked request_id=%s output_chars=%d",
                request_id,
                len(output_text),
            )
            yield ui.message_metadata({"usage": usage, "sources": []})
            yield ui.data_part("guardrail", {"reason": PROMPT_LEAK_REASON})
            return

        # The output guardrail runs after text has already been yielded. On the
        # platform (customer) path apps/api buffers all segments and discards
        # them on `data-guardrail`, so a block DOES prevent customer delivery.
        # On the live operator preview the text may already be on screen — there
        # it is detect/log, not prevent.
        if output_guardrail is not None:
            output_block = await output_guardrail(output_text)
            if output_block:
                yield ui.data_part("guardrail", {"reason": output_block})
                return

        for source in sources or []:
            source_url = source.get("source_url")
            if source_url:
                yield ui.source_url(source["id"], source_url, source.get("filename"))
        yield ui.message_metadata({"usage": usage, "sources": sources or []})

    except Exception as e:
        # Close any bracket left open when the stream raised mid-run, so the
        # client never sees a dangling text-start/reasoning-start/start-step.
        if text_id is not None:
            yield ui.text_end(text_id)
        if reasoning_id is not None:
            yield ui.reasoning_end(reasoning_id)
        if step_open:
            yield ui.finish_step()
        yield ui.error(f"[agent error: {e}]")
    finally:
        yield ui.finish()
        yield ui.done()
