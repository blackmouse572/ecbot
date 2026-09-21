"""
Entry point for the application
"""
import asyncio
import os
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException

from eccho_ai.core.app_configs import SWAGGER_CONFIG
from eccho_ai.core.app_logger import configure_logging, get_logger
from eccho_ai.core.postgres import PostgresRepo
from eccho_ai.core.variables import (
    AppVars,  # noqa: F401. Import to load environment variables
)
from eccho_ai.llm.prompts.loader import system_prompt_template
from eccho_ai.middlewares.app_middleware import RequestLogicMiddleware
from eccho_ai.models.app_models import AppResponse

_DB_CONNECT_RETRIES = 5
_DB_CONNECT_BACKOFF_BASE = 2  # seconds; wait = base ** attempt


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    boot_started_at = time.perf_counter()
    configure_logging(AppVars.LOG_LEVEL)

    # Fail fast on a bad AGENT_PROMPT_PATH instead of at the first chat request.
    system_prompt_template()
    logger.info(
        "system_prompt_loaded",
        source="AGENT_PROMPT_PATH" if AppVars.AGENT_PROMPT_PATH else "bundled",
    )

    db = PostgresRepo.get_instance()

    for attempt in range(1, _DB_CONNECT_RETRIES + 1):
        try:
            await db.connect()
            logger.info("db_connected")
            break
        except Exception as exc:
            if attempt == _DB_CONNECT_RETRIES:
                logger.error("db_connect_failed", error=str(exc), attempts=attempt)
                raise
            wait = _DB_CONNECT_BACKOFF_BASE ** attempt
            logger.warning("db_connect_retry", attempt=attempt, wait_seconds=wait, error=str(exc))
            await asyncio.sleep(wait)

    from eccho_ai.llm.retrievers.vector_store import PgVectorStore, get_pool
    await get_pool()
    await PgVectorStore(embedding_dimension=AppVars.RAG_EMBEDDING_DIMENSION).ensure_schema()
    logger.info("rag_schema_ready")

    # In-process background jobs (folded from the standalone jobs worker) —
    # runs the DB-polling heartbeat as a background task so no separate worker
    # service is needed. Disable with ENABLE_INPROCESS_JOBS=false.
    jobs_task = None
    if os.getenv("ENABLE_INPROCESS_JOBS", "true").lower() == "true":
        from eccho_ai.jobs.constants import DEFAULT_HEARTBEAT_INTERVAL
        from eccho_ai.jobs.logic.chunking import ChunkingJob
        from eccho_ai.jobs.main import heartbeat

        jobs_task = asyncio.create_task(
            heartbeat([ChunkingJob()], interval=DEFAULT_HEARTBEAT_INTERVAL)
        )
        logger.info("inprocess_jobs_started")

    logger.info("boot_completed", elapsed_seconds=round(time.perf_counter() - boot_started_at, 3))

    yield

    # Cleanup
    if jobs_task is not None:
        jobs_task.cancel()
        try:
            await jobs_task
        except asyncio.CancelledError:
            pass
    await db.close()


logger = get_logger(__name__)
app = FastAPI(**SWAGGER_CONFIG)

app.add_middleware(RequestLogicMiddleware)

# ====================================
# Register modules
# ====================================
from eccho_ai.modules.chat.routers import router as chat_router
from eccho_ai.modules.customer.routers import router as customer_router
from eccho_ai.modules.rag.routers import router as rag_router

app.include_router(chat_router, prefix="/api")
app.include_router(customer_router, prefix="/api")
app.include_router(rag_router, prefix="/api")


# ====================================
# Helpers Routes
# ====================================

# Health check route — verifies DB reachability so orchestrators get a real signal
@app.get("/health", tags=["Utils"])
async def health_check():
    try:
        await PostgresRepo.get_instance().ping()
    except Exception as exc:
        logger.error("health_check_db_error", error=str(exc))
        raise HTTPException(status_code=503, detail="Database unavailable")
    return AppResponse(data={"db": "ok"})


# General error handler
@app.exception_handler(Exception)
async def global_exception_handler(_, exc):
    logger.error("exception_500", error=str(exc))
    return AppResponse(
        status=500,
        msg="Internal Server Error",
        error=str(exc) if app.debug else None
    ).as_json_response()


# HTTPException handler
@app.exception_handler(HTTPException)
async def http_exception_handler(_, exc: HTTPException):
    logger.error(f"exception_{exc.status_code}", error=exc.detail)
    return AppResponse(status=exc.status_code, msg=exc.detail).as_json_response()


# Console entry point (`eccho-ai`) — see [project.scripts].
def run() -> None:
    import uvicorn

    uvicorn.run("eccho_ai.main:app", host="0.0.0.0", port=8000)
