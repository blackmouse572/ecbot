"""Shared-secret guard for inbound apps/api -> apps/ai calls.

Every route apps/api drives (chat/customer/rag) requires a matching
`X-Internal-Token` header. `/health` is intentionally left unguarded.
"""
import secrets

from fastapi import Header, HTTPException

from eccho_ai.core.app_logger import get_logger
from eccho_ai.core.variables import AppVars

logger = get_logger(__name__)


def log_if_internal_token_missing() -> None:
    """Boot-time signal: an unset token makes every guarded route answer 503."""
    if not AppVars.API_INTERNAL_TOKEN.get_secret_value():
        logger.error(
            "internal_token_not_configured",
            detail="API_INTERNAL_TOKEN is empty; apps/api calls will get 503",
        )


async def require_internal_token(x_internal_token: str | None = Header(None)) -> None:
    configured_token = AppVars.API_INTERNAL_TOKEN.get_secret_value()
    if not configured_token:
        raise HTTPException(status_code=503, detail="Internal token not configured")
    if not x_internal_token or not secrets.compare_digest(
        x_internal_token, configured_token
    ):
        raise HTTPException(status_code=401, detail="Invalid internal token")
