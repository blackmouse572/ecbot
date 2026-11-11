"""Pydantic schemas for the analytical Customer-tag classifier (#170)."""
from typing import Literal

from pydantic import BaseModel, Field

from eccho_ai.llm.usage import TokenUsage


# ----- Request -----


class ClassifierMessage(BaseModel):
    role: Literal["user", "bot", "operator", "system"] = Field(
        ..., description="Who authored the message."
    )
    text: str = Field(..., description="Message text. May be empty for attachment-only messages.")
    ts: str = Field(..., description="ISO-8601 timestamp.")


class ClassifierTagDef(BaseModel):
    name: str = Field(..., description="Canonical tag name (catalog id).")
    emoji: str | None = Field(default=None, description="Optional decorative emoji.")
    description: str = Field(
        default="",
        description="Short explanation of when the tag applies. Used to ground the LLM.",
    )


class ClassifierProductGroup(BaseModel):
    id: str
    name: str


class ClassifyRequest(BaseModel):
    customer_id: str
    conversation_id: str
    recent_messages: list[ClassifierMessage] = Field(
        default_factory=list,
        description="Oldest-first slice of recent messages.",
    )
    available_tags: list[ClassifierTagDef] = Field(
        default_factory=list,
        description=(
            "The non-handoff analytical tag catalog for the workspace. "
            "Handoff-trigger tags are filtered out on the apps/api side and must "
            "never appear here."
        ),
    )
    current_tags: list[str] = Field(
        default_factory=list,
        description="Tag names currently assigned to the Customer.",
    )
    current_summary: str = Field(
        default="",
        description="The customer's profile summary before this conversation.",
    )
    conversation_summary: str = Field(
        default="",
        description=(
            "The rolling summary of this conversation's messages older than "
            "`recent_messages`."
        ),
    )
    product_groups: list[ClassifierProductGroup] = Field(
        default_factory=list,
        description="The shop's product groups, for the marketing signals.",
    )


# ----- Response -----


class MarketingSignal(BaseModel):
    """One thing the customer said that moves their marketing labels (#500)."""

    kind: Literal["interest", "asked_price", "later", "complaint", "hostile"] = Field(
        ...,
        description=(
            '"interest": asked about the shop or a product group. '
            '"asked_price": asked the price, shipping fee or how to order. '
            '"later": postponed a product group ("để sau"). '
            '"complaint": unhappy, without insults. '
            '"hostile": insulted or threatened people.'
        ),
    )
    product_group: str = Field(
        default="",
        description="Exact name from the product groups list, or empty.",
    )
    defer_days: int | None = Field(
        default=None,
        description='"later" only: 60, or 90 when the customer says a longer time.',
    )
    message_index: int = Field(
        ..., description="The #number of the customer message it comes from."
    )
    quote: str = Field(
        default="", description="The customer's own words, up to 200 characters."
    )


class ClassifyResponse(BaseModel):
    """Schema bound to LangChain's `with_structured_output` for the LLM."""

    tags_to_add: list[str] = Field(
        default_factory=list,
        description="Tag names from `available_tags` that should be applied.",
    )
    tags_to_remove: list[str] = Field(
        default_factory=list,
        description="Tag names from `current_tags` that no longer fit.",
    )
    profile_summary: str = Field(
        default="",
        description="One paragraph (~70 tokens) describing who this customer is and how staff talk to them.",
    )
    marketing_signals: list[MarketingSignal] = Field(
        default_factory=list,
        description="What the customer said that moves their marketing labels.",
    )


class MarketingSignalResult(MarketingSignal):
    """A checked signal, with the product group's id for apps/api."""

    product_group_id: str | None = None


class ClassifyResult(ClassifyResponse):
    """What the endpoint returns: the model's answer plus what it spent, for
    apps/api to meter. Kept off `ClassifyResponse` so the LLM never sees it."""

    marketing_signals: list[MarketingSignalResult] = Field(default_factory=list)
    usage: TokenUsage | None = None
    model: str | None = None
