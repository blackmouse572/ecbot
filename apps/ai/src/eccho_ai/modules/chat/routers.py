from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse

from eccho_ai.core.app_logger import get_logger
from eccho_ai.core.security import require_internal_token
from eccho_ai.llm.agents.agent import invalidate_chatbot
from eccho_ai.llm.guardrails.content import run_input_guardrail, run_output_guardrail
from eccho_ai.llm.guardrails.secrets import scan_output_for_secrets
from eccho_ai.middlewares.cassette_middleware import apply_cassette, cassette_name_for
from eccho_ai.models.app_models import AppResponse
from eccho_ai.modules.chat.models.chat_models import ChatRequest, ChatResponse
from eccho_ai.modules.chat.services import (
    append_source_attribution_if_missing,
    get_agent,
    get_agent_config,
    get_agent_context,
    get_agent_input,
    get_rag_retrieval,
)
from eccho_ai.modules.chat.stream_pipeline import events_to_ui_parts
from eccho_ai.modules.chat.ui_message_stream import STREAM_HEADER

logger = get_logger(__name__)


# ================================
# Define Routers & Workflows
# ================================

router = APIRouter(
    prefix="/chat", tags=["Chat"], dependencies=[Depends(require_internal_token)]
)


@router.post("/message")
async def chat_endpoint(chat_request: ChatRequest, request: Request):
    """Endpoint to handle chat messages from the user."""

    if not chat_request.message:
        return AppResponse(
            status=400,
            msg="Message is required",
        ).as_json_response()

    retrieval = await get_rag_retrieval(chat_request)
    source_attributions = (
        retrieval.source_attributions if retrieval and retrieval.has_context else []
    )

    try:
        ctx = await get_agent(chat_request.chatbot_id)

        # Input guardrail — the pipeline builds its own custom-tier model when needed.
        input_block = await run_input_guardrail(chat_request.message, ctx.chatbot)
        if input_block:
            return AppResponse(
                data=ChatResponse(
                    response="__GUARDRAIL_BLOCK__",
                    metadata={"guardrail_block": True, "reason": input_block},
                )
            )

        config = get_agent_config(chat_request, request)
        with apply_cassette(cassette_name_for(chat_request.message)):
            response = await ctx.agent.ainvoke(
                input=await get_agent_input(chat_request, retrieval=retrieval),
                context=get_agent_context(chat_request, request, ctx.chatbot),
                config=config,
                version="v2",
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("chat_invoke_error", error=str(e), chatbot_id=chat_request.chatbot_id)
        raise HTTPException(status_code=500, detail="Chat processing failed") from e

    response_text = ""
    messages = (response.value or {}).get("messages", [])
    last_msg = messages[-1] if messages else None
    if last_msg is None:
        raise HTTPException(status_code=500, detail="Agent returned no messages")

    if isinstance(last_msg.content, str):
        response_text = last_msg.content
    elif isinstance(last_msg.content, list):
        for block in last_msg.content:
            if isinstance(block, str):
                response_text += block
            elif isinstance(block, dict) and block.get("type") == "text":
                response_text += block.get("text", "")

    # Output guardrail — on the model's text, before we append our own sources.
    output_block = await run_output_guardrail(response_text, ctx.chatbot) if response_text.strip() else None
    if output_block:
        return AppResponse(
            data=ChatResponse(
                response="__GUARDRAIL_BLOCK__",
                metadata={"guardrail_block": True, "reason": output_block},
            )
        )

    response_text = append_source_attribution_if_missing(
        response_text,
        source_attributions,
    )

    # Heuristic tripwire — log only, never mutates the reply.
    secret_hits = scan_output_for_secrets(response_text)
    if secret_hits:
        logger.warning(
            "output_secret_scan_hit",
            patterns=secret_hits,
            chatbot_id=chat_request.chatbot_id,
        )

    usage = getattr(last_msg, "usage_metadata", {}) or {}
    return AppResponse(
        data=ChatResponse(
            response=response_text,
            metadata={
                "input_token_usage": usage.get("input_tokens", 0),
                "output_token_usage": usage.get("output_tokens", 0),
                "total_token_usage": usage.get("total_tokens", 0),
                "sources": source_attributions,
            },
        )
    )


@router.delete("/session/{session_id}")
async def delete_session(session_id: str):
    """No-op after the AsyncPostgresSaver checkpointer was reverted (#140 Phase A).

    The agent is stateless again — apps/api supplies full conversation history
    per request — so there is no persisted thread state left to delete. Kept
    as a no-op (rather than removed) because apps/api still calls this on
    handoff->bot resume and must not get a 404.
    """
    return AppResponse(data={"deleted": True})


@router.delete("/chatbot-cache/{chatbot_id}")
async def invalidate_chatbot_cache(chatbot_id: str):
    """Drop this chatbot's cached config.

    Called by apps/api whenever the chatbot's config, tools or skills change —
    apps/ai owns the cache but not the writes, so it cannot notice on its own.
    """
    invalidated = invalidate_chatbot(chatbot_id)
    logger.info("chatbot_cache_invalidated", chatbot_id=chatbot_id, hit=invalidated)
    return AppResponse(data={"invalidated": invalidated})


@router.post("/stream")
async def chat_stream_endpoint(chat_request: ChatRequest, request: Request):
    """Endpoint to handle streaming chat messages from the user.

    Emits AI SDK v5 UI Message Stream parts (see `stream_pipeline` +
    `ui_message_stream`). The astream_events -> parts mapping itself lives in
    `stream_pipeline.events_to_ui_parts`; this endpoint only wires up the
    agent, guardrails and RAG sources around it.
    """
    if not chat_request.message:
        raise HTTPException(status_code=400, detail="message is required")
    # Local binding so nested closures below see `str`, not `str | None`
    # (type narrowing on `chat_request.message` doesn't cross closure bounds).
    message = chat_request.message

    ctx = await get_agent(chat_request.chatbot_id)
    request_id = request.state.request_id

    # Input guardrail — before agent runs
    input_block = await run_input_guardrail(message, ctx.chatbot)
    if input_block:
        async def _no_events():
            if False:
                yield  # pragma: no cover - makes this an async generator

        return StreamingResponse(
            events_to_ui_parts(_no_events(), request_id=request_id, guardrail_reason=input_block),
            media_type="text/event-stream",
            headers=dict([STREAM_HEADER]),
        )

    # Populated by `_agent_events` once RAG retrieval resolves; read by
    # `events_to_ui_parts` after the loop, once populated, to emit source-url
    # parts + message-metadata. Mutated in place so both sides share it.
    source_attributions: list[dict[str, Any]] = []

    async def _agent_events():
        retrieval = await get_rag_retrieval(chat_request)
        source_attributions[:] = (
            retrieval.source_attributions if retrieval and retrieval.has_context else []
        )
        config = get_agent_config(chat_request, request)
        with apply_cassette(cassette_name_for(message)):
            async for event in ctx.agent.astream_events(
                input=await get_agent_input(chat_request, retrieval=retrieval),
                context=get_agent_context(chat_request, request, ctx.chatbot),
                config=config,
                version="v2",
            ):
                # Generation lease (candidate 2, Phase 2): when a newer message
                # supersedes this turn, the API aborts the request and the
                # connection drops; stop generating so we do not burn tokens.
                if await request.is_disconnected():
                    logger.info(
                        "chat_stream_client_disconnected",
                        conversation_id=chat_request.conversation_id,
                    )
                    break
                yield event

    async def _check_output_guardrail(output_text: str) -> str | None:
        """Output guardrail + secret-scan tripwire, run once the agent finishes."""
        if not output_text.strip():
            return None
        output_block = await run_output_guardrail(output_text, ctx.chatbot)
        if output_block:
            return output_block

        # Heuristic tripwire — log only, never mutates the reply.
        stream_secret_hits = scan_output_for_secrets(output_text)
        if stream_secret_hits:
            logger.warning(
                "output_secret_scan_hit",
                patterns=stream_secret_hits,
                chatbot_id=chat_request.chatbot_id,
            )
        return None

    return StreamingResponse(
        events_to_ui_parts(
            _agent_events(),
            request_id=request_id,
            output_guardrail=_check_output_guardrail,
            sources=source_attributions,
        ),
        media_type="text/event-stream",
        headers=dict([STREAM_HEADER]),
    )
