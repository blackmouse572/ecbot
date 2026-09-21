"""Pydantic schemas for the analytical Customer-tag classifier (#170)."""
from typing import Literal

from pydantic import BaseModel, Field


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


# ----- Response -----


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
        description="One paragraph (~50 tokens) describing who this customer is.",
    )
