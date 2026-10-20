from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator

from eccho_ai.llm.usage import TokenUsage


class DecisionQuestion(BaseModel):
    type: Literal["choice", "noul", "text"]
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
