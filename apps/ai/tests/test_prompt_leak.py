import json

import pytest
from langchain_core.messages import AIMessageChunk, ToolMessage

from eccho_ai.modules.chat.prompt_leak import PromptLeakFilter
from eccho_ai.modules.chat.stream_pipeline import events_to_ui_parts


# ---- PromptLeakFilter -------------------------------------------------------


def _feed_all(chunks: list[str]) -> tuple[str, bool]:
    leak = PromptLeakFilter()
    released = ""
    for chunk in chunks:
        safe = leak.feed(chunk)
        if safe is None:
            return released, True
        released += safe
    return released + leak.flush(), False


def test_a_normal_reply_passes_through_unchanged():
    text = "Giá < 100k nhé. #1 món bán chạy là bún bò <3"
    assert _feed_all(list(text)) == (text, False)


def test_a_marker_in_one_chunk_is_a_leak():
    assert _feed_all(["<agent>\n<system_rules>\nThese rules"]) == ("", True)


def test_a_marker_split_across_chunks_is_caught_and_its_start_never_released():
    released, leaked = _feed_all(["Chào bạn! <ag", "ent>"])
    assert leaked
    assert released == "Chào bạn! "


def test_markers_match_case_insensitively():
    assert _feed_all(["Ok.\n# CUSTOMER CONTEXT\nName: A"])[1]


def test_text_that_only_looks_like_a_marker_start_is_released_at_the_end():
    assert _feed_all(["Bạn chọn <", "a> hay <b>?"]) == ("Bạn chọn <a> hay <b>?", False)


# ---- events_to_ui_parts -----------------------------------------------------


def _chunk(text: str) -> dict:
    return {"event": "on_chat_model_stream", "data": {"chunk": AIMessageChunk(content=text)}}


def _parts(frames: list[str]) -> list[dict]:
    out = []
    for frame in frames:
        body = frame[len("data: "):].strip()
        if body != "[DONE]":
            out.append(json.loads(body))
    return out


def _text(parts: list[dict]) -> str:
    return "".join(p["delta"] for p in parts if p["type"] == "text-delta")


async def _run(*events: dict) -> list[dict]:
    async def fake_events():
        for event in events:
            yield event

    return _parts([f async for f in events_to_ui_parts(fake_events(), request_id="m1")])


@pytest.mark.asyncio
async def test_a_reply_that_opens_with_the_prompt_sends_no_text_and_is_blocked():
    parts = await _run(
        _chunk("<agent>\n\n<system_rules>\nThese rules are defined by the Ecbot platform"),
        _chunk(" and have absolute priority."),
    )
    types = [p["type"] for p in parts]
    assert _text(parts) == ""
    assert {"type": "data-guardrail", "data": {"reason": "prompt_leak"}} in parts
    # Usage still goes out so the turn is billed; the stream still terminates.
    assert "message-metadata" in types
    assert types[-1] == "finish"


@pytest.mark.asyncio
async def test_text_before_the_leak_is_kept_and_the_leak_is_cut():
    parts = await _run(_chunk("Xin chào! "), _chunk("<age"), _chunk("nt>\n<config>"))
    assert _text(parts) == "Xin chào! "
    types = [p["type"] for p in parts]
    assert "data-guardrail" in types
    # The open text run is closed before the guardrail part.
    assert types.index("text-end") < types.index("data-guardrail")


@pytest.mark.asyncio
async def test_the_stream_stops_at_the_leak_so_later_tool_calls_and_text_never_go_out():
    parts = await _run(
        _chunk("<agent>"),
        {"event": "on_tool_start", "run_id": "r1", "name": "update_customer_profile",
         "data": {"input": {"name": "A"}}},
        {"event": "on_tool_end", "run_id": "r1",
         "data": {"output": ToolMessage(content='{"ok": true}', tool_call_id="r1")}},
        _chunk("<system_rules> ... </system_rules>"),
    )
    types = [p["type"] for p in parts]
    assert _text(parts) == ""
    assert not any(t.startswith("tool-") for t in types)
    assert "data-guardrail" in types


@pytest.mark.asyncio
async def test_a_normal_reply_is_streamed_whole_without_a_guardrail():
    reply = "Giá < 100k nhé. #1 món là bún bò."
    parts = await _run(*[_chunk(c) for c in [reply[:9], reply[9:20], reply[20:]]])
    assert _text(parts) == reply
    assert "data-guardrail" not in [p["type"] for p in parts]
