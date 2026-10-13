"""POST /api/chat/summarize: folds older messages into the conversation
summary. The LLM is faked through the router's `build_chat_model` binding."""
from __future__ import annotations

from typing import Any

from langchain_core.messages import AIMessage

from eccho_ai.core.variables import AppVars
from eccho_ai.modules.chat import summary as summary_module


class _FakeLLM:
    def __init__(self, reply: str | Exception) -> None:
        self.reply = reply
        self.calls: list[Any] = []

    async def ainvoke(self, messages: Any) -> AIMessage:
        self.calls.append(messages)
        if isinstance(self.reply, Exception):
            raise self.reply
        return AIMessage(content=self.reply)


BODY = {
    "previous_summary": "Asked about red shirts.",
    "messages": [
        {"role": "customer", "text": "2 cái size M nha"},
        {"role": "bot", "text": "Dạ, 2 áo đỏ size M ạ."},
    ],
}


async def test_returns_the_new_summary_and_model(async_client, monkeypatch):
    llm = _FakeLLM("  Wants 2 red shirts, size M.  ")
    monkeypatch.setattr(summary_module, "build_chat_model", lambda **_kw: llm)

    resp = await async_client.post("/api/chat/summarize", json=BODY)

    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["summary"] == "Wants 2 red shirts, size M."
    assert data["model"] == AppVars.CLASSIFIER_MODEL
    prompt = llm.calls[0][-1]["content"]
    assert "Asked about red shirts." in prompt
    assert "[customer] 2 cái size M nha" in prompt


async def test_a_failed_call_returns_no_summary(async_client, monkeypatch):
    monkeypatch.setattr(
        summary_module, "build_chat_model", lambda **_kw: _FakeLLM(RuntimeError("down"))
    )

    resp = await async_client.post("/api/chat/summarize", json=BODY)

    assert resp.status_code == 200
    assert resp.json()["data"]["summary"] == ""
