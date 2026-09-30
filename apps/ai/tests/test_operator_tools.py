"""Operator tools that change data carry a confirm-first note (#182)."""
import json
import uuid
from types import SimpleNamespace

import httpx

from eccho_ai.llm.tools import operator_tools
from eccho_ai.llm.tools.operator_tools import build_tools
from eccho_ai.utils.tool_utils import is_mutating_action


def _chatbot(*actions: str):
    tool = SimpleNamespace(
        id=uuid.uuid4(),
        kind="MCP",
        discovered_actions=[
            {"name": a, "description": f"{a} description", "inputSchema": {"type": "object", "properties": {}}}
            for a in actions
        ],
    )
    return SimpleNamespace(chatbot_tools=[SimpleNamespace(enabled=True, enabled_actions=None, tool=tool)])


SEARCH_SCHEMA = {
    "type": "object",
    "properties": {"q": {"type": "string", "description": "What to search for"}},
    "required": ["q"],
}


def _http_chatbot(**overrides):
    # Mirrors a row from POST /tool/http: no discovered_actions, the schema lives on the tool.
    tool = SimpleNamespace(
        **{
            "id": uuid.uuid4(),
            "kind": "HTTP",
            "slug": "search-products",
            "description": "Search the product catalog.",
            "http_input_schema": SEARCH_SCHEMA,
            "discovered_actions": None,
            **overrides,
        }
    )
    return tool, SimpleNamespace(chatbot_tools=[SimpleNamespace(enabled=True, enabled_actions=None, tool=tool)])


def test_detects_actions_that_change_data():
    for name in [
        "create_order", "cancelOrder", "delete-all-orders", "book_slot", "update_customer", "place_order",
        # Review of #197: other verbs, and names where the verb is not first.
        "confirm_order", "checkout", "process_payment", "schedule_appointment", "save_address",
        "register_member", "apply_coupon", "transfer_funds", "order_create", "shopify_create_order",
    ]:
        assert is_mutating_action(name), name
    for name in ["get_order_status", "list_orders", "get_menu", "check_availability", "search_products"]:
        assert not is_mutating_action(name), name


def test_mutating_tool_description_requires_a_clear_yes_first():
    tools = {t.name: t for t in build_tools(_chatbot("create_order", "get_menu"))}
    assert tools["create_order"].description.startswith("create_order description")
    assert "clearly said yes" in tools["create_order"].description
    assert tools["get_menu"].description == "get_menu description"


def test_http_tool_is_offered_to_the_agent_with_its_input_schema():
    _, chatbot = _http_chatbot()
    tools = build_tools(chatbot)
    assert [t.name for t in tools] == ["search-products"]
    assert tools[0].description == "Search the product catalog."
    assert tools[0].args_schema == SEARCH_SCHEMA


def test_http_tool_without_a_schema_takes_no_arguments():
    _, chatbot = _http_chatbot(http_input_schema=None)
    (tool,) = build_tools(chatbot)
    assert tool.args_schema == {"type": "object", "properties": {}}


def test_disabled_http_tool_is_not_offered():
    _, chatbot = _http_chatbot()
    chatbot.chatbot_tools[0].enabled = False
    assert build_tools(chatbot) == []


async def test_http_tool_call_runs_the_tool_without_an_action_name(monkeypatch):
    sent = {}

    def handler(request: httpx.Request) -> httpx.Response:
        sent.update(json.loads(request.content))
        return httpx.Response(200, json={"data": {"status": "success", "result": {"total": 1}}})

    real_client = httpx.AsyncClient
    monkeypatch.setattr(
        operator_tools.httpx,
        "AsyncClient",
        lambda **kwargs: real_client(transport=httpx.MockTransport(handler), **kwargs),
    )
    tool_row, chatbot = _http_chatbot()
    (tool,) = build_tools(chatbot)
    runtime = SimpleNamespace(
        context=SimpleNamespace(chatbot_id="bot-1", conversation_id="conv-1", request_id="req-1")
    )

    response = await tool.coroutine(runtime=runtime, q="vanilla")

    assert sent["toolId"] == tool_row.id.hex
    assert sent["actionName"] is None
    assert sent["args"] == {"q": "vanilla"}
    assert response["status"] == "success"
    assert response["result"] == {"total": 1}
