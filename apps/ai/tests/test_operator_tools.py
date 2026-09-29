"""Operator tools that change data carry a confirm-first note (#182)."""
import uuid
from types import SimpleNamespace

from eccho_ai.llm.tools.operator_tools import build_tools
from eccho_ai.utils.tool_utils import is_mutating_action


def _chatbot(*actions: str):
    tool = SimpleNamespace(
        id=uuid.uuid4(),
        discovered_actions=[
            {"name": a, "description": f"{a} description", "inputSchema": {"type": "object", "properties": {}}}
            for a in actions
        ],
    )
    return SimpleNamespace(chatbot_tools=[SimpleNamespace(enabled=True, enabled_actions=None, tool=tool)])


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
