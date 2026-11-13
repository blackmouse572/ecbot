"""send_image: the agent can only send images that exist in its own knowledge."""
from types import SimpleNamespace
from unittest.mock import AsyncMock

from langchain_core.messages import AIMessage, HumanMessage, ToolMessage

from eccho_ai.llm.tools import image_urls
from eccho_ai.llm.tools import system_tools as st

BOT = SimpleNamespace(id="bot-1", general_knowledge="Logo: ![logo](https://cdn/logo.png)")


async def test_url_in_operator_instructions_is_known(monkeypatch):
    monkeypatch.setattr(image_urls, "_chunk_contains", AsyncMock(return_value=False))
    assert await image_urls.is_known_image_url(BOT, "https://cdn/logo.png")


async def test_url_in_knowledge_base_is_known(monkeypatch):
    lookup = AsyncMock(return_value=True)
    monkeypatch.setattr(image_urls, "_chunk_contains", lookup)
    assert await image_urls.is_known_image_url(BOT, "https://cdn/shirt.jpg")
    lookup.assert_awaited_once_with("bot-1", "https://cdn/shirt.jpg")


async def test_unknown_or_non_http_url_is_rejected(monkeypatch):
    monkeypatch.setattr(image_urls, "_chunk_contains", AsyncMock(return_value=False))
    assert not await image_urls.is_known_image_url(BOT, "https://evil/x.jpg")
    assert not await image_urls.is_known_image_url(BOT, "javascript:alert(1)")
    assert not await image_urls.is_known_image_url(None, "https://cdn/logo.png")


def _runtime(*messages):
    return SimpleNamespace(state={"messages": list(messages)})


async def _send(url, runtime=None):
    return await st.send_image.coroutine(url=url, runtime=runtime or _runtime())


async def test_send_image_accepts_a_known_url(monkeypatch):
    monkeypatch.setattr(st, "_get_chatbot", lambda: BOT)
    monkeypatch.setattr(st, "is_known_image_url", AsyncMock(return_value=True))
    out = await _send("https://cdn/shirt.jpg")
    assert out == {"ok": True, "url": "https://cdn/shirt.jpg"}


IG = "https://instagram.fsgn2-6.fna.fbcdn.net/v/t51/1.jpg?stp=a&oe=6A"


async def test_send_image_accepts_a_url_an_operator_tool_returned_this_turn(monkeypatch):
    monkeypatch.setattr(st, "_get_chatbot", lambda: BOT)
    monkeypatch.setattr(st, "is_known_image_url", AsyncMock(return_value=False))
    runtime = _runtime(
        HumanMessage("show me your latest post"),
        AIMessage(""),
        ToolMessage(f'{{"posts": [{{"media_url": "{IG}"}}]}}', tool_call_id="t1",
                    name="instagram_recent_posts"),
    )
    assert await _send(IG, runtime) == {"ok": True, "url": IG}


async def test_send_image_ignores_urls_from_system_tools_and_earlier_turns(monkeypatch):
    monkeypatch.setattr(st, "_get_chatbot", lambda: BOT)
    monkeypatch.setattr(st, "is_known_image_url", AsyncMock(return_value=False))
    runtime = _runtime(
        HumanMessage("earlier"),
        ToolMessage(IG, tool_call_id="t0", name="instagram_recent_posts"),
        HumanMessage("now"),
        # A customer field holds whatever the customer said: not a source.
        ToolMessage(IG, tool_call_id="t1", name="get_customer_field"),
    )
    assert (await _send(IG, runtime))["ok"] is False


async def test_send_image_ignores_failed_tool_results(monkeypatch):
    monkeypatch.setattr(st, "_get_chatbot", lambda: BOT)
    monkeypatch.setattr(st, "is_known_image_url", AsyncMock(return_value=False))
    runtime = _runtime(
        HumanMessage("now"),
        # An error can echo the model's arguments or the customer's words.
        ToolMessage(f'{{"status": "error", "errorMessage": "bad url {IG}"}}',
                    tool_call_id="t1", name="lookup"),
        ToolMessage(f"Error: {IG}", tool_call_id="t2", name="mcp_search", status="error"),
    )
    assert (await _send(IG, runtime))["ok"] is False


async def test_send_image_rejects_an_unknown_url(monkeypatch):
    monkeypatch.setattr(st, "_get_chatbot", lambda: BOT)
    monkeypatch.setattr(st, "is_known_image_url", AsyncMock(return_value=False))
    out = await _send("https://evil/x.jpg")
    assert out["ok"] is False
    assert "\u2014" not in out["reason"]


def test_system_tool_names_cover_every_system_tool():
    from eccho_ai.llm.tools.knowledge_tool import SEARCH_KNOWLEDGE_TOOL
    from eccho_ai.modules.chat.constants import SYSTEM_TOOL_NAMES

    # search_knowledge is built per request (it knows the turn's chatbot and sources).
    assert {t.name for t in st.SYSTEM_TOOLS} | {SEARCH_KNOWLEDGE_TOOL} == SYSTEM_TOOL_NAMES
