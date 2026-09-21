from typing import Any, TypedDict

from langchain_core.tools import StructuredTool
from pydantic import BaseModel, Field, SkipValidation

from eccho_ai.models.chat import Chatbots


class AgentRequestContext(BaseModel):
    """
    Represents the per-request context injected into the LangChain agent graph.
    """
    model_config = {"arbitrary_types_allowed": True}

    # The resolved chatbot config, read by ChatbotConfigMiddleware to swap the
    # model / tools / system prompt per request. Held by reference (langgraph
    # does not copy the context). SkipValidation: it's a runtime-injected object,
    # not data to validate — pydantic must not build a nested SQLModel schema or
    # revalidate/copy the instance.
    chatbot: SkipValidation[Chatbots | None] = Field(default=None, repr=False)
    # The per-request dynamic toolset (operator tools + skills), resolved once
    # when the chatbot is loaded; both middleware hooks read this same list.
    tools: SkipValidation[list[StructuredTool] | None] = Field(default=None, repr=False)
    request_id: str | None = Field(default=None)
    chatbot_id: str = Field(default=...)
    conversation_id: str | None = Field(default=None)
    user_id: str | None = Field(default=None)
    provider_id: str | None = Field(default=None)
    # Customer-aware fields injected by apps/api when resolving the inbound
    # message. Optional for backward compatibility with non-platform callers.
    customer_id: str | None = Field(default=None)
    contact_point_id: str | None = Field(default=None)
    trigger_message_id: str | None = Field(default=None)


class ToolExecutionRequest(TypedDict):
    '''
    Request to execute a tool
    Synced from apps/api/src/modules/tool/services/tool-execution.service.ts
    '''
    toolId: str
    actionName: str | None
    args: dict[str, Any]
    chatbotId: str | None
    conversationId: str | None
    correlationId: str


class ToolExecutionResponse(TypedDict):
    '''
    Response of a tool execution
    Synced from apps/api/src/modules/tool/services/http-tool-executor.service.ts
    '''
    invocationId: str
    status: str  # "success" | "error" | "timeout"
    result: dict[str, Any] | None
    errorMessage: str | None
    durationMs: int
