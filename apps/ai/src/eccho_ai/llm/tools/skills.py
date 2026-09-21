"""Progressive-disclosure `load_skill` tool for a chatbot.

Skills are procedural instructions stored on S3. Discovery uses DB metadata
(name/description, cheap); the full instructions body is fetched from S3 lazily
only when the model calls `load_skill`, then memoized process-wide (module-level
cache, see `_skill_body_cache`) so repeated turns/requests don't re-hit S3.
"""
from __future__ import annotations

import asyncio

from langchain_core.tools import StructuredTool

from eccho_ai.core.app_logger import get_logger
from eccho_ai.core.variables import AppVars
from eccho_ai.models.chat import Chatbots

logger = get_logger(__name__)

_S3_TIMEOUT_SECONDS = 10.0
# Mirrors SKILL_INSTRUCTIONS_MAX_LENGTH on the api side — bounds what a single
# `load_skill` call can stream into the model context.
_S3_MAX_BYTES = 64_000
_SKILL_ACTIVE = "ACTIVE"
# Explicit region avoids minio-py's slow GetBucketLocation probe (works for R2 + MinIO).
_S3_REGION = "us-east-1"

# Module-level (per-process) memoization of skill bodies, shared across requests —
# build_skills() is called fresh on every chat turn, so a closure-local memo dict
# would re-hit S3 every turn. Keyed by (bucket, key, updated_at): a content change
# bumps updated_at and naturally busts the cache, no separate invalidation needed.
_skill_body_cache: dict[tuple[str, str, str], str] = {}


def _download_from_s3(bucket: str, key: str) -> bytes:
    """Download an object from MinIO / S3 synchronously (run in executor)."""
    # Deferred: minio is only needed here, not at import time / process boot.
    from minio import Minio

    # Minio() wants a host without scheme; derive `secure` from the endpoint when present.
    endpoint = AppVars.MINIO_ENDPOINT
    secure = AppVars.MINIO_SECURE
    if endpoint.startswith("https://"):
        endpoint, secure = endpoint[len("https://"):], True
    elif endpoint.startswith("http://"):
        endpoint, secure = endpoint[len("http://"):], False
    client = Minio(
        endpoint=endpoint,
        access_key=AppVars.MINIO_ACCESS_KEY.get_secret_value(),
        secret_key=AppVars.MINIO_SECRET_KEY.get_secret_value(),
        secure=secure,
        region=_S3_REGION,
    )
    response = client.get_object(bucket, key)
    try:
        # Read one byte past the cap so we can detect (and truncate) an
        # oversized object without buffering the whole thing.
        return response.read(_S3_MAX_BYTES + 1)
    finally:
        response.close()
        response.release_conn()


async def _download_text(bucket: str, key: str) -> str:
    loop = asyncio.get_event_loop()
    data = await asyncio.wait_for(
        loop.run_in_executor(None, _download_from_s3, bucket, key),
        timeout=_S3_TIMEOUT_SECONDS,
    )
    if len(data) > _S3_MAX_BYTES:
        logger.warning("skill_body_truncated", bucket=bucket, key=key, max_bytes=_S3_MAX_BYTES)
        data = data[:_S3_MAX_BYTES]
    return data.decode("utf-8", errors="ignore")


def build_skills(chatbot: Chatbots) -> list[StructuredTool]:
    """Return a single `load_skill` tool if the chatbot has enabled skills, else []."""
    # Discovery catalog from DB metadata only — no S3 hit at build time.
    catalog: dict[str, dict[str, str]] = {}
    for cs in chatbot.chatbot_skills:
        if not cs.enabled:
            continue
        skill = cs.skill
        if skill is None or skill.status != _SKILL_ACTIVE:
            continue
        if not skill.s3_bucket or not skill.s3_key:
            continue
        catalog[skill.slug] = {
            "bucket": skill.s3_bucket,
            "key": skill.s3_key,
            "description": skill.description or "",
            "updated_at": str(skill.updated_at),
        }

    if not catalog:
        return []

    listing = "\n".join(f"- {slug}: {meta['description']}" for slug, meta in catalog.items())
    description = (
        "Load the full instructions for a skill when the user's request matches one. "
        "Call this BEFORE answering if a skill applies, then follow its instructions.\n"
        f"Available skills:\n{listing}"
    )

    async def load_skill(slug: str) -> str:
        if slug not in catalog:
            available = ", ".join(catalog.keys())
            return f"Unknown skill '{slug}'. Available skills: {available}."
        meta = catalog[slug]
        cache_key = (meta["bucket"], meta["key"], meta["updated_at"])
        if cache_key in _skill_body_cache:
            return _skill_body_cache[cache_key]
        try:
            text = await _download_text(meta["bucket"], meta["key"])
        except Exception as e:  # graceful degrade — never break the turn
            logger.error(
                "skill_load_error",
                chatbot_id=str(chatbot.id),
                slug=slug,
                error=str(e),
            )
            return f"Skill '{slug}' is temporarily unavailable. Proceed without it."
        _skill_body_cache[cache_key] = text
        return text

    return [
        StructuredTool.from_function(
            coroutine=load_skill,
            name="load_skill",
            description=description,
        )
    ]
