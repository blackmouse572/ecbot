"""AI SDK v5 UI Message Stream serializer.

Single owner of the wire format. Each helper returns one SSE frame
(`data: {json}\n\n`); `done()` returns the `[DONE]` terminator.
See docs/superpowers/specs/2026-07-24-agent-response-ui-message-stream-design.md
"""
import json
from typing import Any

STREAM_HEADER = ("x-vercel-ai-ui-message-stream", "v1")


def _frame(part: dict) -> str:
    return f"data: {json.dumps(part, ensure_ascii=False, separators=(',', ':'))}\n\n"


def start(message_id: str) -> str:
    return _frame({"type": "start", "messageId": message_id})


def start_step() -> str:
    return _frame({"type": "start-step"})


def finish_step() -> str:
    return _frame({"type": "finish-step"})


def finish() -> str:
    return _frame({"type": "finish"})


def text_start(id: str) -> str:
    return _frame({"type": "text-start", "id": id})


def text_delta(id: str, delta: str) -> str:
    return _frame({"type": "text-delta", "id": id, "delta": delta})


def text_end(id: str) -> str:
    return _frame({"type": "text-end", "id": id})


def reasoning_start(id: str) -> str:
    return _frame({"type": "reasoning-start", "id": id})


def reasoning_delta(id: str, delta: str) -> str:
    return _frame({"type": "reasoning-delta", "id": id, "delta": delta})


def reasoning_end(id: str) -> str:
    return _frame({"type": "reasoning-end", "id": id})


def tool_input_start(tool_call_id: str, tool_name: str) -> str:
    return _frame({
        "type": "tool-input-start",
        "toolCallId": tool_call_id, "toolName": tool_name,
    })


def tool_input_available(tool_call_id: str, tool_name: str, input: dict) -> str:
    return _frame({
        "type": "tool-input-available",
        "toolCallId": tool_call_id, "toolName": tool_name, "input": input,
    })


def tool_output_available(tool_call_id: str, output: Any) -> str:
    return _frame({"type": "tool-output-available", "toolCallId": tool_call_id, "output": output})


def source_url(source_id: str, url: str, title: str | None = None) -> str:
    part: dict = {"type": "source-url", "sourceId": source_id, "url": url}
    if title is not None:
        part["title"] = title
    return _frame(part)


def file(url: str, media_type: str) -> str:
    return _frame({"type": "file", "url": url, "mediaType": media_type})


def message_metadata(metadata: dict) -> str:
    return _frame({"type": "message-metadata", "messageMetadata": metadata})


def error(error_text: str) -> str:
    return _frame({"type": "error", "errorText": error_text})


def data_part(name: str, data: dict) -> str:
    return _frame({"type": f"data-{name}", "data": data})


def done() -> str:
    return "data: [DONE]\n\n"
