"""Customer-aware system tools for the agent.

These tools are hardcoded into every agent (NOT operator-configurable, NOT in
the Phase 10 Tool Registry).

- Reads (`get_customer_field`, `list_customer_fields`) hit Postgres directly.
- Writes hit apps/api over HTTP so permissions live in one place. apps/api
  enforces the workspace boundary and emits domain events that #169 will
  consume for match detection.
"""

import logging
import time
from typing import Annotated, Any
from uuid import UUID

from langchain_core.tools import tool
from sqlalchemy import select
from sqlmodel import col

from eccho_ai.models.customer_tags import CustomerTags
from eccho_ai.models.customers import Customers
from eccho_ai.modules.chat.models.agent_models import AgentRequestContext
from eccho_ai.core.api_client import ApiClient, ApiClientError
from eccho_ai.core.postgres import PostgresRepo

logger = logging.getLogger("uvicorn.info")


def _get_customer_id() -> str | None:
    from langgraph.runtime import get_runtime

    try:
        runtime = get_runtime(AgentRequestContext)
        ctx = runtime.context
    except Exception:  # pragma: no cover — runtime missing outside agent
        return None
    if ctx is None:
        return None
    return getattr(ctx, "customer_id", None)


def _get_session_id() -> str | None:
    """Pull the active conversation id from LangGraph's thread_id config.

    The chat router seeds `thread_id` from `ChatRequest.chat_session_id`, which
    apps/api wires to `conversation.id`. That's exactly the conversation we
    want to escalate on `triggers_handoff` tags.
    """
    try:
        from langchain_core.runnables.config import ensure_config

        cfg = ensure_config()
        return cfg.get("configurable", {}).get("thread_id")
    except Exception:
        return None


def _get_followup_context() -> dict[str, Any] | None:
    """Full agent context needed to schedule/cancel a followup."""
    from langgraph.runtime import get_runtime

    try:
        runtime = get_runtime(AgentRequestContext)
        ctx = runtime.context
    except Exception:  # pragma: no cover — runtime missing outside agent
        return None
    if ctx is None:
        return None
    return {
        "conversation_id": getattr(ctx, "conversation_id", None),
        "chatbot_id": getattr(ctx, "chatbot_id", None),
        "user_id": getattr(ctx, "user_id", None),
        "provider_id": getattr(ctx, "provider_id", None),
        "customer_id": getattr(ctx, "customer_id", None),
        "contact_point_id": getattr(ctx, "contact_point_id", None),
        "trigger_message_id": getattr(ctx, "trigger_message_id", None),
    }


def _truncate(value: Any, n: int = 80) -> str:
    s = str(value)
    return s if len(s) <= n else s[: n - 1] + "…"


def _log_call(name: str, args_summary: str, status: str, duration_ms: float) -> None:
    logger.info(
        "system_tool name=%s args=%s status=%s duration_ms=%.1f",
        name,
        args_summary,
        status,
        duration_ms,
    )


async def _read_customer_metadata(customer_id: str) -> dict[str, Any] | None:
    repo = PostgresRepo.get_instance()
    async with repo.session_factory() as session:
        # col() wraps the model attributes so the type checker treats them as
        # column expressions (SQLModel types them as their field values).
        stmt = select(
            col(Customers.metadata_), col(Customers.merged_into_customer_id)
        ).where(
            col(Customers.id) == UUID(customer_id)  # asyncpg needs a UUID, not a str
        )
        row = (await session.exec(stmt)).first()  # type: ignore[attr-defined]
    if row is None:
        return None
    metadata, merged_into = row
    if merged_into is not None:
        return None
    return metadata or {}


# ─── Read tools ──────────────────────────────────────────────────────────────


@tool
async def get_customer_field(key: str) -> str | None:
    """Return the value stored under `key` in the customer's metadata, or null."""
    started = time.perf_counter()
    customer_id = _get_customer_id()
    if not customer_id:
        _log_call("get_customer_field", _truncate(key), "no_context", 0)
        return None
    try:
        metadata = await _read_customer_metadata(customer_id)
        if metadata is None:
            _log_call(
                "get_customer_field",
                _truncate(key),
                "missing",
                (time.perf_counter() - started) * 1000,
            )
            return None
        value = metadata.get(key)
        _log_call(
            "get_customer_field",
            _truncate(key),
            "ok",
            (time.perf_counter() - started) * 1000,
        )
        return None if value is None else str(value)
    except Exception as exc:
        _log_call(
            "get_customer_field",
            _truncate(key),
            f"error:{type(exc).__name__}",
            (time.perf_counter() - started) * 1000,
        )
        return None


@tool
async def list_customer_fields() -> list[str]:
    """List all metadata keys currently stored on the customer."""
    started = time.perf_counter()
    customer_id = _get_customer_id()
    if not customer_id:
        _log_call("list_customer_fields", "-", "no_context", 0)
        return []
    try:
        metadata = await _read_customer_metadata(customer_id)
        if metadata is None:
            _log_call(
                "list_customer_fields",
                "-",
                "missing",
                (time.perf_counter() - started) * 1000,
            )
            return []
        keys = sorted(metadata.keys())
        _log_call(
            "list_customer_fields",
            f"count={len(keys)}",
            "ok",
            (time.perf_counter() - started) * 1000,
        )
        return keys
    except Exception as exc:
        _log_call(
            "list_customer_fields",
            "-",
            f"error:{type(exc).__name__}",
            (time.perf_counter() - started) * 1000,
        )
        return []


# ─── Write tools (route through apps/api) ────────────────────────────────────


@tool
async def set_customer_field(key: str, value: str) -> dict[str, Any]:
    """Set a free-form field `key` to `value` on the customer's metadata."""
    started = time.perf_counter()
    customer_id = _get_customer_id()
    if not customer_id:
        _log_call("set_customer_field", _truncate(key), "no_context", 0)
        return {"error": "no customer context"}
    try:
        result = await ApiClient.get_instance().post(
            f"/system/customers/{customer_id}/fields",
            {"key": key, "value": value},
        )
        _log_call(
            "set_customer_field",
            _truncate(key),
            "ok",
            (time.perf_counter() - started) * 1000,
        )
        return result if isinstance(result, dict) else {"data": result}
    except ApiClientError as exc:
        _log_call(
            "set_customer_field",
            _truncate(key),
            "error",
            (time.perf_counter() - started) * 1000,
        )
        return {"error": str(exc)}


@tool
async def update_customer_profile(
    name: str | None = None,
    phone: str | None = None,
    email: str | None = None,
    language: str | None = None,
) -> dict[str, Any]:
    """Patch the customer's structured profile (name / phone / email / language)."""
    started = time.perf_counter()
    customer_id = _get_customer_id()
    if not customer_id:
        _log_call("update_customer_profile", "-", "no_context", 0)
        return {"error": "no customer context"}
    payload: dict[str, Any] = {}
    if name is not None:
        payload["name"] = name
    if phone is not None:
        payload["phone"] = phone
    if email is not None:
        payload["email"] = email
    if language is not None:
        payload["language"] = language
    if not payload:
        _log_call("update_customer_profile", "-", "noop", 0)
        return {"updated": False}
    try:
        result = await ApiClient.get_instance().post(
            f"/system/customers/{customer_id}/profile",
            payload,
        )
        _log_call(
            "update_customer_profile",
            _truncate(",".join(payload.keys())),
            "ok",
            (time.perf_counter() - started) * 1000,
        )
        return result if isinstance(result, dict) else {"data": result}
    except ApiClientError as exc:
        _log_call(
            "update_customer_profile",
            _truncate(",".join(payload.keys())),
            "error",
            (time.perf_counter() - started) * 1000,
        )
        return {"error": str(exc)}


@tool
async def apply_customer_tag(name: str) -> dict[str, Any]:
    """Apply a workspace tag (by name) to the customer. May fire a handoff."""
    started = time.perf_counter()
    customer_id = _get_customer_id()
    if not customer_id:
        _log_call("apply_customer_tag", _truncate(name), "no_context", 0)
        return {"error": "no customer context"}
    conversation_id = _get_session_id()
    payload: dict[str, Any] = {"tagName": name}
    if conversation_id:
        payload["conversationId"] = conversation_id
    try:
        result = await ApiClient.get_instance().post(
            f"/system/customers/{customer_id}/tags/apply",
            payload,
        )
        triggered = (
            bool(result.get("triggeredHandoff")) if isinstance(result, dict) else False
        )
        _log_call(
            "apply_customer_tag",
            _truncate(name),
            f"ok handoff={triggered}",
            (time.perf_counter() - started) * 1000,
        )
        return result if isinstance(result, dict) else {"data": result}
    except ApiClientError as exc:
        _log_call(
            "apply_customer_tag",
            _truncate(name),
            "error",
            (time.perf_counter() - started) * 1000,
        )
        return {"error": str(exc)}


@tool
async def remove_customer_tag(name: str) -> dict[str, Any]:
    """Remove a workspace tag (by name) from the customer."""
    started = time.perf_counter()
    customer_id = _get_customer_id()
    if not customer_id:
        _log_call("remove_customer_tag", _truncate(name), "no_context", 0)
        return {"error": "no customer context"}
    try:
        result = await ApiClient.get_instance().post(
            f"/system/customers/{customer_id}/tags/remove",
            {"tagName": name},
        )
        _log_call(
            "remove_customer_tag",
            _truncate(name),
            "ok",
            (time.perf_counter() - started) * 1000,
        )
        return result if isinstance(result, dict) else {"data": result}
    except ApiClientError as exc:
        _log_call(
            "remove_customer_tag",
            _truncate(name),
            "error",
            (time.perf_counter() - started) * 1000,
        )
        return {"error": str(exc)}


@tool
async def schedule_followup(delay_minutes: int, prompt: str, reason: str) -> dict[str, Any]:
    """Schedule a proactive follow-up message to the user after `delay_minutes`.

    Use when the follow-up rules warrant a check-in (e.g. confirm a payment 30
    minutes later, or a delivery in 3 days). `prompt` is the instruction for
    what to say/do when it fires; `reason` is a short slug used to identify and
    cancel this follow-up later (e.g. `payment_check`).
    """
    started = time.perf_counter()
    ctx = _get_followup_context()
    if not ctx or not ctx.get("conversation_id"):
        _log_call("schedule_followup", _truncate(reason), "no_context", 0)
        return {"error": "no conversation context"}
    try:
        result = await ApiClient.get_instance().post(
            "/system/followups",
            {
                "conversationId": ctx["conversation_id"],
                "chatbotId": ctx["chatbot_id"],
                "userId": ctx["user_id"],
                "providerId": ctx["provider_id"],
                "customerId": ctx["customer_id"],
                "contactPointId": ctx["contact_point_id"],
                "delayMinutes": delay_minutes,
                "prompt": prompt,
                "reason": reason,
                "triggerMessageId": ctx.get("trigger_message_id"),
            },
        )
        _log_call("schedule_followup", _truncate(reason), "ok",
                  (time.perf_counter() - started) * 1000)
        return result if isinstance(result, dict) else {"data": result}
    except ApiClientError as exc:
        _log_call("schedule_followup", _truncate(reason), "error",
                  (time.perf_counter() - started) * 1000)
        return {"error": str(exc)}


@tool
async def list_pending_followups() -> list[dict[str, Any]]:
    """List this conversation's pending follow-ups so you can cancel one whose
    need has already been met. Returns [{followup_id, reason, fires_in_minutes}]."""
    ctx = _get_followup_context()
    if not ctx or not ctx.get("conversation_id"):
        _log_call("list_pending_followups", "-", "no_context", 0)
        return []
    try:
        result = await ApiClient.get_instance().get(
            "/system/followups", {"conversationId": ctx["conversation_id"]}
        )
        items = result if isinstance(result, list) else []
        return [
            {
                "followup_id": i.get("followupId"),
                "reason": i.get("reason"),
                "fires_in_minutes": i.get("firesInMinutes"),
            }
            for i in items
        ]
    except ApiClientError:
        _log_call("list_pending_followups", "-", "error", 0)
        return []


@tool
async def cancel_followup(followup_id: str) -> dict[str, Any]:
    """Cancel a pending follow-up by its id (from list_pending_followups) once
    its need has been met, so it does not disturb the user."""
    ctx = _get_followup_context()
    if not ctx:
        _log_call("cancel_followup", _truncate(followup_id), "no_context", 0)
        return {"error": "no conversation context"}
    try:
        result = await ApiClient.get_instance().delete(f"/system/followups/{followup_id}")
        return result if isinstance(result, dict) else {"cancelled": True}
    except ApiClientError as exc:
        return {"error": str(exc)}


SYSTEM_TOOLS: list[Any] = [
    get_customer_field,
    list_customer_fields,
    set_customer_field,
    update_customer_profile,
    apply_customer_tag,
    remove_customer_tag,
    schedule_followup,
    list_pending_followups,
    cancel_followup,
]


# Annotated kept exported so static analyzers don't flag the import as unused if
# the file is refactored to pull state via Annotated[InjectedState, ...] later.
__all__ = ["SYSTEM_TOOLS", "Annotated"]
