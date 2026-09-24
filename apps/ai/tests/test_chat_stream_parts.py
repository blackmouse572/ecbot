import json

import pytest
from langchain_core.messages import AIMessageChunk, ToolMessage

from eccho_ai.modules.chat.stream_pipeline import events_to_ui_parts  # extracted generator


def _text_chunk(text: str) -> AIMessageChunk:
    return AIMessageChunk(content=text)


def _tool_msg(content: str) -> ToolMessage:
    return ToolMessage(content=content, tool_call_id="r1")


def _types(frames):
    out = []
    for f in frames:
        body = f[len("data: "):].strip()
        out.append("[DONE]" if body == "[DONE]" else json.loads(body)["type"])
    return out


@pytest.mark.asyncio
async def test_text_then_tool_roundtrip_emits_ordered_parts():
    async def fake_events():
        yield {"event": "on_chat_model_stream", "data": {"chunk": _text_chunk("Hi ")}}
        yield {"event": "on_tool_start", "run_id": "r1",
               "name": "get_order", "data": {"input": {"id": 7}}}
        yield {"event": "on_tool_end", "run_id": "r1",
               "data": {"output": _tool_msg('{"status":"ok"}')}}
        yield {"event": "on_chat_model_stream", "data": {"chunk": _text_chunk("done")}}

    frames = [f async for f in events_to_ui_parts(fake_events(), request_id="m1")]
    assert _types(frames)[0] == "start"
    assert _types(frames)[-1] == "[DONE]"
    assert _types(frames)[-2] == "finish"
    seq = _types(frames)
    assert "tool-input-available" in seq and "tool-output-available" in seq
    assert seq.index("tool-input-available") < seq.index("tool-output-available")
    assert seq.index("text-start") < seq.index("tool-input-available")
    # tool-input-start is the delimiter apps/api uses to split reply segments
    # at a tool call; it must land after the preceding text run closes and
    # before the tool-input-available part.
    assert "tool-input-start" in seq
    assert seq.index("text-end") < seq.index("tool-input-start")
    assert seq.index("tool-input-start") < seq.index("tool-input-available")


@pytest.mark.asyncio
async def test_guardrail_emits_data_guardrail_then_finish():
    async def fake_events():
        if False:
            yield  # empty agent stream
    frames = [f async for f in events_to_ui_parts(
        fake_events(), request_id="m1", guardrail_reason="blocked")]
    assert "data-guardrail" in _types(frames)
    assert _types(frames)[-1] == "[DONE]"


@pytest.mark.asyncio
async def test_output_guardrail_callback_blocks_after_text():
    async def fake_events():
        yield {"event": "on_chat_model_stream", "data": {"chunk": _text_chunk("leak")}}

    async def _blocked(_text: str) -> str:
        return "blocked"

    frames = [f async for f in events_to_ui_parts(
        fake_events(), request_id="m1",
        output_guardrail=_blocked)]
    seq = _types(frames)
    assert "data-guardrail" in seq
    # A block short-circuits the metadata path.
    assert "message-metadata" not in seq
    assert seq[-1] == "[DONE]"
    assert seq[-2] == "finish"


@pytest.mark.asyncio
async def test_sources_and_metadata_emitted_before_finish():
    chunk = AIMessageChunk(content="hello")
    chunk.usage_metadata = {"input_tokens": 3, "output_tokens": 5, "total_tokens": 8}

    async def fake_events():
        yield {"event": "on_chat_model_stream", "data": {"chunk": chunk}}

    sources = [{"id": "KB-1", "source_url": "https://kb/a", "filename": "a.pdf"}]
    frames = [f async for f in events_to_ui_parts(
        fake_events(), request_id="m1", sources=sources)]
    seq = _types(frames)
    assert "source-url" in seq
    assert "message-metadata" in seq
    assert seq.index("source-url") < seq.index("finish")
    assert seq.index("message-metadata") < seq.index("finish")


@pytest.mark.asyncio
async def test_open_text_run_is_closed_before_error_on_raise():
    async def fake_events():
        yield {"event": "on_chat_model_stream", "data": {"chunk": _text_chunk("partial")}}
        raise RuntimeError("boom")

    frames = [f async for f in events_to_ui_parts(fake_events(), request_id="m1")]
    seq = _types(frames)
    assert "text-start" in seq and "text-end" in seq and "error" in seq
    # The open text run must be closed before the error part.
    assert seq.index("text-end") < seq.index("error")
    assert seq[-1] == "[DONE]"
    assert seq[-2] == "finish"


@pytest.mark.asyncio
async def test_stream_error_does_not_leak_exception_text():
    """Task 16: the client-facing error part must be a fixed generic message,
    never the raw exception text (which can contain internals, secrets, or a
    stack-trace-derived string such as a GraphRecursionError detail)."""

    async def fake_events():
        if False:
            yield  # pragma: no cover - makes this an async generator
        raise RuntimeError("db password is hunter2, table users leaked")

    frames = [f async for f in events_to_ui_parts(fake_events(), request_id="m1")]
    error_frames = [
        f for f in frames if f[len("data: "):].strip() != "[DONE]"
        and json.loads(f[len("data: "):].strip()).get("type") == "error"
    ]
    assert len(error_frames) == 1
    error_body = json.loads(error_frames[0][len("data: "):].strip())
    assert "hunter2" not in error_body["errorText"]
    assert "db password" not in error_body["errorText"]


@pytest.mark.asyncio
async def test_recursion_limit_error_yields_same_generic_message():
    """GraphRecursionError (langgraph.errors, a RecursionError subclass) is what
    the agent raises when it hits `recursion_limit` — it must surface through
    the same generic error path as any other exception, not a stack trace."""
    from langgraph.errors import GraphRecursionError

    async def fake_events():
        if False:
            yield  # pragma: no cover - makes this an async generator
        raise GraphRecursionError("Recursion limit of 21 reached without hitting a stop condition.")

    frames = [f async for f in events_to_ui_parts(fake_events(), request_id="m1")]
    seq = _types(frames)
    assert "error" in seq
    error_frame = next(
        f for f in frames
        if f[len("data: "):].strip() != "[DONE]"
        and json.loads(f[len("data: "):].strip()).get("type") == "error"
    )
    error_body = json.loads(error_frame[len("data: "):].strip())
    assert "Recursion limit" not in error_body["errorText"]
