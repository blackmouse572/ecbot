"""Marketing signals from POST /api/customer/classify (#500).

The classifier also reports which product group the customer asked about,
whether they asked the price, said "later" to a group, or were hostile. The
endpoint keeps only signals it can trust: a customer message, a product group
from the shop's list, a known number of days.
"""

from __future__ import annotations

import unicodedata
from typing import Any

import pytest

from eccho_ai.modules.customer import routers as customer_router_module
from eccho_ai.modules.customer.models import (
    ClassifyRequest,
    ClassifyResponse,
    MarketingSignal,
)


class _FakeStructured:
    def __init__(self, returns: Any) -> None:
        self._returns = returns

    async def ainvoke(self, _messages: Any) -> Any:
        return self._returns


class _FakeLLM:
    def __init__(self, structured: _FakeStructured) -> None:
        self._structured = structured

    def with_structured_output(self, _schema: type) -> _FakeStructured:
        return self._structured


@pytest.fixture
def answer(monkeypatch):
    """The model answers with these signals."""

    def _apply(*signals: MarketingSignal) -> None:
        fake = _FakeLLM(
            _FakeStructured(ClassifyResponse(marketing_signals=list(signals)))
        )
        monkeypatch.setattr(
            customer_router_module, "build_chat_model", lambda *_a, **_kw: fake
        )

    return _apply


BODY = {
    "customer_id": "cust-1",
    "conversation_id": "conv-1",
    "recent_messages": [
        {"role": "user", "text": "serum giá bao nhiêu vậy shop", "ts": "2026-11-01T10:00:00Z"},
        {"role": "bot", "text": "Dạ serum 350k ạ", "ts": "2026-11-01T10:00:05Z"},
        {"role": "user", "text": "serum để sau nha", "ts": "2026-11-01T10:01:00Z"},
    ],
    "product_groups": [
        {"id": "pg-serum", "name": "Serum"},
        {"id": "pg-kem", "name": "Kem chống nắng"},
    ],
}


async def _signals(async_client) -> list[dict[str, Any]]:
    resp = await async_client.post("/api/customer/classify", json=BODY)
    assert resp.status_code == 200
    return resp.json()["data"]["marketing_signals"]


async def test_later_to_a_product_group_comes_back_with_its_id_and_60_days(
    async_client, answer
):
    # Acceptance (#500): "serum để sau nha" postpones Serum for 60 days.
    answer(
        MarketingSignal(
            kind="later",
            product_group="Serum",
            defer_days=60,
            message_index=2,
            quote="serum để sau nha",
        )
    )

    assert await _signals(async_client) == [
        {
            "kind": "later",
            "product_group": "Serum",
            "product_group_id": "pg-serum",
            "defer_days": 60,
            "message_index": 2,
            "quote": "serum để sau nha",
        }
    ]


async def test_later_without_a_known_product_group_is_dropped(async_client, answer):
    answer(
        MarketingSignal(kind="later", product_group="Son môi", message_index=2, quote="x"),
        MarketingSignal(kind="later", product_group="", message_index=2, quote="x"),
    )

    assert await _signals(async_client) == []


async def test_later_days_are_60_unless_the_model_says_longer(async_client, answer):
    answer(
        MarketingSignal(kind="later", product_group="Serum", defer_days=None, message_index=2, quote="a"),
        MarketingSignal(kind="later", product_group="Kem chống nắng", defer_days=120, message_index=2, quote="b"),
    )

    assert [s["defer_days"] for s in await _signals(async_client)] == [60, 90]


async def test_interest_and_price_keep_the_signal_without_a_known_group(
    async_client, answer
):
    # Asking the price moves the stage even when the product is not in the
    # shop's list; only the product group is left out.
    answer(
        MarketingSignal(kind="asked_price", product_group="Son môi", message_index=0, quote="giá?"),
        MarketingSignal(kind="interest", product_group="Serum", message_index=0, quote="serum"),
    )

    signals = await _signals(async_client)
    assert [(s["kind"], s["product_group"], s["product_group_id"]) for s in signals] == [
        ("asked_price", "", None),
        ("interest", "Serum", "pg-serum"),
    ]
    assert all(s["defer_days"] is None for s in signals)


async def test_a_signal_must_point_at_a_customer_message(async_client, answer):
    # Message 1 is the bot's; message 9 does not exist.
    answer(
        MarketingSignal(kind="interest", product_group="Serum", message_index=1, quote="x"),
        MarketingSignal(kind="interest", product_group="Serum", message_index=9, quote="x"),
        MarketingSignal(kind="hostile", message_index=-1, quote="x"),
    )

    assert await _signals(async_client) == []


async def test_hostile_carries_no_product_group(async_client, answer):
    answer(
        MarketingSignal(kind="hostile", product_group="Serum", defer_days=60, message_index=2, quote="x")
    )

    [signal] = await _signals(async_client)
    assert (signal["product_group"], signal["product_group_id"], signal["defer_days"]) == ("", None, None)


async def test_product_group_matches_in_another_unicode_form(async_client, answer):
    decomposed = unicodedata.normalize("NFD", "Kem chống nắng")
    answer(MarketingSignal(kind="interest", product_group=decomposed, message_index=0, quote="x"))

    [signal] = await _signals(async_client)
    assert signal["product_group"] == "Kem chống nắng"
    assert signal["product_group_id"] == "pg-kem"


async def test_product_group_matches_ignoring_case_and_spaces(async_client, answer):
    answer(MarketingSignal(kind="interest", product_group="  serum ", message_index=0, quote="x"))

    [signal] = await _signals(async_client)
    assert signal["product_group_id"] == "pg-serum"


async def test_quote_falls_back_to_the_message_and_is_capped(async_client, answer):
    answer(
        MarketingSignal(kind="interest", product_group="Serum", message_index=0, quote="  "),
        MarketingSignal(kind="asked_price", product_group="Serum", message_index=0, quote="q" * 500),
    )

    quotes = [s["quote"] for s in await _signals(async_client)]
    assert quotes[0] == "serum giá bao nhiêu vậy shop"
    assert quotes[1] == "q" * 200


async def test_repeated_signals_come_back_once(async_client, answer):
    signal = MarketingSignal(kind="interest", product_group="Serum", message_index=0, quote="x")
    answer(signal, signal)

    assert len(await _signals(async_client)) == 1


async def test_a_complaint_changes_no_label(async_client, answer):
    # "complaint" only gives the model a place for anger that is not hostile.
    answer(MarketingSignal(kind="complaint", message_index=0, quote="tức quá"))

    assert await _signals(async_client) == []


async def test_no_signals_when_the_model_returns_none(async_client, answer):
    answer()

    assert await _signals(async_client) == []


# ---------- prompt ----------


def test_prompt_numbers_messages_and_lists_product_groups():
    prompt = customer_router_module._build_user_prompt(ClassifyRequest.model_validate(BODY))

    assert "#0 [user] serum giá bao nhiêu vậy shop" in prompt
    assert "#2 [user] serum để sau nha" in prompt
    assert "Product groups (use exact names):\n- Serum\n- Kem chống nắng" in prompt


def test_prompt_says_when_the_shop_has_no_product_groups():
    prompt = customer_router_module._build_user_prompt(
        ClassifyRequest.model_validate({**BODY, "product_groups": []})
    )

    assert "Product groups (use exact names):\n(none)" in prompt


def test_system_prompt_names_the_exact_fields():
    # Follow-up rules lesson: the model fills a field only when the prompt
    # names it exactly.
    rules = customer_router_module.SYSTEM_PROMPT
    for field in ("marketing_signals", "kind", "product_group", "defer_days", "message_index", "quote"):
        assert f"`{field}`" in rules
    for kind in ("interest", "asked_price", "later", "complaint", "hostile"):
        assert f'"{kind}"' in rules


def test_request_defaults_to_no_product_groups():
    req = ClassifyRequest(customer_id="c", conversation_id="v")
    assert req.product_groups == []
