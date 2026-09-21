import json
from eccho_ai.modules.chat import ui_message_stream as ui


def _payload(frame: str) -> dict:
    assert frame.startswith("data: ")
    assert frame.endswith("\n\n")
    return json.loads(frame[len("data: "):].strip())


def test_text_delta_uses_delta_field():
    assert _payload(ui.text_delta("t1", "Hello")) == {
        "type": "text-delta", "id": "t1", "delta": "Hello"
    }


def test_tool_input_start_shape():
    assert _payload(ui.tool_input_start("inv1", "get_order")) == {
        "type": "tool-input-start", "toolCallId": "inv1", "toolName": "get_order",
    }


def test_tool_input_available_shape():
    assert _payload(ui.tool_input_available("inv1", "get_order", {"id": 7})) == {
        "type": "tool-input-available", "toolCallId": "inv1",
        "toolName": "get_order", "input": {"id": 7},
    }


def test_tool_output_available_shape():
    assert _payload(ui.tool_output_available("inv1", {"status": "ok"})) == {
        "type": "tool-output-available", "toolCallId": "inv1", "output": {"status": "ok"}
    }


def test_reasoning_delta_shape():
    assert _payload(ui.reasoning_delta("r1", "think")) == {
        "type": "reasoning-delta", "id": "r1", "delta": "think"
    }


def test_guardrail_is_a_data_part():
    assert _payload(ui.data_part("guardrail", {"reason": "blocked"})) == {
        "type": "data-guardrail", "data": {"reason": "blocked"}
    }


def test_error_shape():
    assert _payload(ui.error("boom")) == {"type": "error", "errorText": "boom"}


def test_message_metadata_shape():
    assert _payload(ui.message_metadata({"usage": {"total": 5}})) == {
        "type": "message-metadata", "messageMetadata": {"usage": {"total": 5}}
    }


def test_done_terminator():
    assert ui.done() == "data: [DONE]\n\n"


def test_start_and_lifecycle():
    assert _payload(ui.start("m1")) == {"type": "start", "messageId": "m1"}
    assert _payload(ui.start_step()) == {"type": "start-step"}
    assert _payload(ui.finish_step()) == {"type": "finish-step"}
    assert _payload(ui.finish()) == {"type": "finish"}
