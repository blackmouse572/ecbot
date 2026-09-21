"""Functional tests for the Pydantic schemas backing /api/customer/classify (#176)."""
from __future__ import annotations

import pytest
from pydantic import ValidationError

from eccho_ai.modules.customer.models import (
    ClassifierMessage,
    ClassifierTagDef,
    ClassifyRequest,
    ClassifyResponse,
)


# ---------- ClassifyRequest ----------


def test_classify_request_accepts_the_documented_shape() -> None:
    req = ClassifyRequest(
        customer_id="cust-1",
        conversation_id="conv-1",
        recent_messages=[
            {"role": "user", "text": "hi", "ts": "2026-06-15T12:00:00Z"},
            {"role": "bot", "text": "hello", "ts": "2026-06-15T12:00:05Z"},
        ],
        available_tags=[
            {"name": "VIP", "emoji": "⭐", "description": "big spender"},
            {"name": "Hot lead", "description": "ready to buy"},
        ],
        current_tags=["VIP"],
    )

    assert req.customer_id == "cust-1"
    assert req.conversation_id == "conv-1"
    assert len(req.recent_messages) == 2
    assert isinstance(req.recent_messages[0], ClassifierMessage)
    assert req.available_tags[0].emoji == "⭐"
    # `emoji` is optional; default is None.
    assert req.available_tags[1].emoji is None
    assert req.current_tags == ["VIP"]


def test_classify_request_defaults_collections_when_absent() -> None:
    # The classifier should still parse even for a brand-new customer with no
    # tags / no messages yet.
    req = ClassifyRequest(customer_id="cust-1", conversation_id="conv-1")

    assert req.recent_messages == []
    assert req.available_tags == []
    assert req.current_tags == []


def test_classify_request_rejects_invalid_message_role() -> None:
    with pytest.raises(ValidationError):
        ClassifyRequest(
            customer_id="cust-1",
            conversation_id="conv-1",
            recent_messages=[
                {"role": "manager", "text": "x", "ts": "2026-06-15T12:00:00Z"},
            ],
        )


def test_classify_request_requires_both_ids() -> None:
    with pytest.raises(ValidationError):
        ClassifyRequest(conversation_id="conv-1")
    with pytest.raises(ValidationError):
        ClassifyRequest(customer_id="cust-1")


def test_classifier_tag_def_description_defaults_to_empty_string() -> None:
    tag = ClassifierTagDef(name="VIP")
    assert tag.description == ""
    assert tag.emoji is None


# ---------- ClassifyResponse ----------


def test_classify_response_defaults_are_safe_for_partial_llm_output() -> None:
    # When the LLM only returns a profile_summary, defaults must hold so the
    # processor doesn't see `None` arrays.
    resp = ClassifyResponse(profile_summary="A returning buyer.")

    assert resp.tags_to_add == []
    assert resp.tags_to_remove == []
    assert resp.profile_summary == "A returning buyer."


def test_classify_response_fully_default_construction_yields_empty_payload() -> None:
    # The endpoint returns AppResponse(data=ClassifyResponse()) on parse failure;
    # this construction must succeed and produce empty arrays + empty summary.
    resp = ClassifyResponse()

    assert resp.tags_to_add == []
    assert resp.tags_to_remove == []
    assert resp.profile_summary == ""


def test_classify_response_accepts_string_lists_round_trip() -> None:
    resp = ClassifyResponse(
        tags_to_add=["VIP"],
        tags_to_remove=["Cold lead"],
        profile_summary="Engaged.",
    )

    dumped = resp.model_dump()
    assert dumped == {
        "tags_to_add": ["VIP"],
        "tags_to_remove": ["Cold lead"],
        "profile_summary": "Engaged.",
    }
