"""#250: one-shot AI calls report the tokens they spent, so apps/api can meter
the tag classifier, the agent-builder decision and knowledge ingest."""

from __future__ import annotations

import json
from types import SimpleNamespace
from typing import Any

from langchain_core.language_models.fake_chat_models import GenericFakeChatModel
from langchain_core.messages import AIMessage
from langchain_core.runnables import RunnableLambda

from eccho_ai.core.variables import AppVars
from eccho_ai.llm.retrievers.embeddings import aembed_documents_with_usage
from eccho_ai.llm.usage import sum_usage
from eccho_ai.modules.customer import routers as customer_router_module
from eccho_ai.modules.customer.models import ClassifyResponse
from eccho_ai.modules.decision import routers as decision_router_module

USAGE = {"input_tokens": 120, "output_tokens": 30, "total_tokens": 150}


class _FakeLLM:
    """A real chat model run, so the usage callback sees it, parsed as JSON."""

    def __init__(self, answer: dict[str, Any], parse=lambda value: value):
        self._answer = answer
        self._parse = parse

    def with_structured_output(self, _schema: type):
        model = GenericFakeChatModel(
            messages=iter([
                # ChatOpenAI names the model; the usage callback keys on it.
                AIMessage(
                    content=json.dumps(self._answer),
                    usage_metadata=USAGE,
                    response_metadata={"model_name": "m"},
                )
            ])
        )
        return model | RunnableLambda(lambda msg: self._parse(json.loads(msg.content)))


async def test_system_one_reports_usage_and_model(async_client, monkeypatch):
    fake = _FakeLLM({"q0": 0.8})
    monkeypatch.setattr(decision_router_module, "build_chat_model", lambda *_a, **_k: fake)

    resp = await async_client.post(
        "/api/decision/system-one",
        json={"state": "x", "questions": {"a": {"type": "noul", "instructions": "?"}}},
    )

    data = resp.json()["data"]
    assert data["answers"] == {"a": {"type": "noul", "noul": 0.8}}
    assert data["usage"] == USAGE
    assert data["model"] == AppVars.DECISION_MODEL


async def test_system_one_reports_usage_when_the_answer_is_unreadable(async_client, monkeypatch):
    # The tokens were spent even though the answers are thrown away.
    fake = _FakeLLM({"q0": "not a number"}, parse=lambda _v: 42)
    monkeypatch.setattr(decision_router_module, "build_chat_model", lambda *_a, **_k: fake)

    resp = await async_client.post(
        "/api/decision/system-one",
        json={"state": "x", "questions": {"a": {"type": "noul", "instructions": "?"}}},
    )

    data = resp.json()["data"]
    assert data["answers"] == {}
    assert data["usage"] == USAGE


async def test_classify_reports_usage_and_model(async_client, monkeypatch):
    fake = _FakeLLM(
        {"tags_to_add": ["VIP"], "tags_to_remove": [], "profile_summary": "Buyer."},
        parse=ClassifyResponse.model_validate,
    )
    monkeypatch.setattr(customer_router_module, "build_chat_model", lambda *_a, **_k: fake)

    resp = await async_client.post(
        "/api/customer/classify",
        json={
            "customer_id": "c",
            "conversation_id": "v",
            "recent_messages": [],
            "available_tags": [{"name": "VIP", "emoji": None, "description": ""}],
            "current_tags": [],
        },
    )

    data = resp.json()["data"]
    assert data["tags_to_add"] == ["VIP"]
    assert data["usage"] == USAGE
    assert data["model"] == AppVars.CLASSIFIER_MODEL


def test_sum_usage_is_none_when_no_model_ran():
    assert sum_usage({}) is None


def test_sum_usage_adds_every_model():
    total = sum_usage({"a": USAGE, "b": {"input_tokens": 1, "output_tokens": 2, "total_tokens": 3}})
    assert total.model_dump() == {"input_tokens": 121, "output_tokens": 32, "total_tokens": 153}


async def test_embedding_usage_is_summed_over_batches():
    calls: list[list[str]] = []

    async def create(*, input, **_params):
        calls.append(input)
        return SimpleNamespace(
            data=[SimpleNamespace(embedding=[0.1]) for _ in input],
            usage=SimpleNamespace(prompt_tokens=10 * len(input), total_tokens=10 * len(input)),
        )

    client = SimpleNamespace(
        chunk_size=2, _invocation_params={"model": "m"}, async_client=SimpleNamespace(create=create)
    )

    vectors, usage = await aembed_documents_with_usage(client, ["a", "b", "c"])

    assert calls == [["a", "b"], ["c"]]
    assert vectors == [[0.1], [0.1], [0.1]]
    assert usage.model_dump() == {"input_tokens": 30, "output_tokens": 0, "total_tokens": 30}


async def test_embedding_usage_is_none_when_the_provider_reports_none():
    async def create(*, input, **_params):
        return SimpleNamespace(data=[SimpleNamespace(embedding=[0.1]) for _ in input], usage=None)

    client = SimpleNamespace(
        chunk_size=8, _invocation_params={}, async_client=SimpleNamespace(create=create)
    )

    _, usage = await aembed_documents_with_usage(client, ["a"])

    assert usage is None
