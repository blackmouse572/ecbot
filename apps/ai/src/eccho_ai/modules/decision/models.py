from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator

from eccho_ai.llm.usage import TokenUsage


class DecisionQuestion(BaseModel):
    # Decisions models answer typed primitives only; `text` extraction has its
    # own endpoint (chat model) so `system-one` can always use the Decisions API.
    type: Literal["choice", "noul"]
    instructions: str = Field(min_length=1, max_length=2000)
    criteria: dict[str, str] | None = None

    @model_validator(mode="after")
    def _choice_needs_options(self) -> "DecisionQuestion":
        if self.type == "choice" and len(self.criteria or {}) < 2:
            raise ValueError("a choice question needs at least two criteria")
        return self


class DecisionRequest(BaseModel):
    state: str = Field(min_length=1, max_length=4000)
    questions: dict[str, DecisionQuestion] = Field(max_length=64)


class DecisionResponse(BaseModel):
    answers: dict[str, dict[str, Any]] = Field(default_factory=dict)
    # What the call spent, for apps/api to meter; None when no model ran.
    usage: TokenUsage | None = None
    model: str | None = None


class ExtractRequest(BaseModel):
    """Details to copy out of a state, keyed by id (context: /decision/extract)."""

    state: str = Field(min_length=1, max_length=4000)
    # id -> what the field should contain. Decisions models cannot write text,
    # so these run on a chat model instead of the Decisions API.
    fields: dict[str, str] = Field(min_length=1, max_length=64)


class ExtractResponse(BaseModel):
    # id -> the detail copied from the state; empty when the model failed.
    answers: dict[str, str] = Field(default_factory=dict)
    usage: TokenUsage | None = None
    model: str | None = None


class WriteRequest(BaseModel):
    """A short shop message to draft: what to write, and what it is about."""

    instructions: str = Field(min_length=1, max_length=4000)
    state: str = Field(min_length=1, max_length=4000)


class WriteResponse(BaseModel):
    # Empty when the model failed: the caller says so to the person.
    text: str = ""
    usage: TokenUsage | None = None
    model: str | None = None
