"""Build langchain StructuredTools for a chatbot and execute them via the API callback."""

import re
import uuid
from typing import Any

import httpx
from langchain.tools import ToolRuntime
from langchain_core.tools import StructuredTool

from eccho_ai.core.app_logger import get_logger
from eccho_ai.core.variables import AppVars
from eccho_ai.models.chat import Chatbots, ChatbotTools
from eccho_ai.modules.chat.models.agent_models import (
    AgentRequestContext,
    ToolExecutionRequest,
    ToolExecutionResponse,
)

logger = get_logger(__name__)

_TOOL_NAME_INVALID = re.compile(r"[^a-zA-Z0-9_-]")


def sanitize_tool_name(name: str) -> str:
    """Coerce a name to match OpenAI's `^[a-zA-Z0-9_-]+$` constraint on function names."""
    return _TOOL_NAME_INVALID.sub("_", name)


def _auth_headers() -> dict[str, str]:
    api_key = AppVars.AI_SERVICE_API_KEY.get_secret_value()
    api_secret = AppVars.AI_SERVICE_API_SECRET.get_secret_value()
    return {"x-api-key": f"{api_key}:{api_secret}"}


def _resolve_enabled_actions(chatbot_tool: ChatbotTools) -> list[str]:
    """null enabled_actions = all discovered actions (matches the UI semantic)."""
    tool_actions = chatbot_tool.tool.discovered_actions or []
    if chatbot_tool.enabled_actions is None:
        return [a.get("name") for a in tool_actions if a.get("name")]
    return chatbot_tool.enabled_actions


def _make_executor(tool_id: uuid.UUID, action: str):
    async def __executor(
        runtime: ToolRuntime[AgentRequestContext], **kwargs: Any
    ) -> ToolExecutionResponse:
        payload = ToolExecutionRequest(
            toolId=tool_id.hex,
            actionName=action,
            args=kwargs,
            chatbotId=runtime.context.chatbot_id,
            conversationId=runtime.context.conversation_id,
            correlationId=runtime.context.request_id or str(uuid.uuid4()),
        )
        try:
            logger.info(
                "tool_execution_request",
                chatbot_id=runtime.context.chatbot_id,
                payload=payload,
            )
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(
                    AppVars.API_TOOL_EXECUTION_COMMAND_URL,
                    json=payload,
                    headers=_auth_headers(),
                )
                res.raise_for_status()
                response = res.json()
            logger.info(
                "tool_execution_response",
                chatbot_id=runtime.context.chatbot_id,
                response=response,
            )
        except Exception as e:
            logger.error(
                "tool_execution_error",
                chatbot_id=runtime.context.chatbot_id,
                error=str(e),
            )
            return ToolExecutionResponse(
                invocationId=payload.get("correlationId"),
                status="error",
                result=None,
                errorMessage=str(e),
                durationMs=0,
            )

        data = response.get("data", {})
        success = str(data.get("status", "")).lower() == "success"
        return ToolExecutionResponse(
            invocationId=payload.get("correlationId"),
            status="success" if success else "error",
            result=data.get("result") if success else None,
            errorMessage=None if success else data.get("errorMessage", "Unknown error"),
            durationMs=data.get("durationMs", 0),
        )

    return __executor


def build_tools(chatbot: Chatbots) -> list[StructuredTool]:
    tools: list[StructuredTool] = []
    for chatbot_tool in chatbot.chatbot_tools:
        if not chatbot_tool.enabled:
            continue

        tool_id = chatbot_tool.tool.id
        action_specs = {
            a["name"]: a
            for a in (chatbot_tool.tool.discovered_actions or [])
            if isinstance(a, dict) and a.get("name")
        }

        for action in _resolve_enabled_actions(chatbot_tool):
            spec = action_specs.get(action)
            if not spec:
                continue
            tools.append(
                StructuredTool.from_function(
                    # Keep the original `action` for the API callback; sanitize only the
                    # LLM-facing name to satisfy OpenAI's function-name regex.
                    coroutine=_make_executor(tool_id, action),
                    name=sanitize_tool_name(action),
                    description=spec.get("description", ""),
                    args_schema=spec.get("inputSchema", {}),
                )
            )
    return tools
