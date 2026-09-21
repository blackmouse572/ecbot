import time
import uuid
import structlog

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

from eccho_ai.core.app_logger import get_logger
from eccho_ai.core.postgres import PostgresRepo


logger = get_logger(__name__)

# Chat request bodies carry the full prompt + history and are huge; log a
# bounded preview so request logs stay readable instead of drowning context.
_MAX_LOGGED_BODY_CHARS = 1000


class RequestLogicMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        structlog.contextvars.clear_contextvars()
        db = PostgresRepo.get_instance()
        request_id = request.headers.get("X-Request-ID", None)
        if not request_id:
            request_id = str(uuid.uuid4())

        # Define a unique request ID for correlation, either from header or generated
        structlog.contextvars.bind_contextvars(
            request_id=request_id,
        )
        request.state.request_id = request_id

        # Log the request details. Bodies (full prompt + history) can be tens of
        # KB, so log a bounded preview + the true size rather than the whole thing.
        raw_body = await request.body()
        body_text = raw_body.decode("utf-8", "replace")
        logger.info(
            "request",
            method=request.method,
            path=request.url.path,
            params=request.query_params._dict,
            body=body_text[:_MAX_LOGGED_BODY_CHARS],
            body_bytes=len(raw_body),
            body_truncated=len(body_text) > _MAX_LOGGED_BODY_CHARS,
        )
        
        # Execute the request
        st = time.perf_counter()
        try:
            response = await call_next(request)
            logger.info(
                "response",
                status_code=response.status_code,
                duration_ms=(time.perf_counter() - st) * 1000,
            )
            return response
        except Exception as exc:
            logger.error(
                "request_error",
                error=str(exc),
                duration_ms=(time.perf_counter() - st) * 1000,
            )
            raise
        finally:
            # Always clean up the task-local DB session to prevent leaks
            await db.clean_session()