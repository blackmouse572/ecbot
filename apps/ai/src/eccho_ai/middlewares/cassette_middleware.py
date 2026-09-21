"""
Cassette middleware for vcrpy integration.
AI_CASSETTE_MODE: live (default/absent) | new_episodes | none
VCR_CASSETTE_DIR: path to cassette directory (default: e2e/cassettes relative to repo root)

Usage:
    with apply_cassette(cassette_name_for(message)):
        result = await agent.ainvoke(...)

Recording (run once, with a real provider key + the E2E stack up):
    Bring the stack up in record mode and drive the real chat flow — see
    e2e/cassettes/README.md. In short: start the stack with
    docker-compose.e2e.record.yml (AI_CASSETTE_MODE=new_episodes, cassettes
    mounted read-write), exercise the chat endpoint, commit the new .yaml files.

Replaying (CI / regression):
    AI_CASSETTE_MODE=none  (vcrpy record_mode="none" = replay only, error on new)
"""
from __future__ import annotations
import hashlib
import os
from pathlib import Path
from typing import TypedDict


class CassetteConfig(TypedDict):
    mode: str
    cassette_dir: str


def get_cassette_config() -> CassetteConfig | None:
    mode = os.environ.get("AI_CASSETTE_MODE")
    if not mode or mode == "live":
        return None
    return CassetteConfig(
        mode=mode,
        cassette_dir=os.environ.get(
            "VCR_CASSETTE_DIR",
            str(Path(__file__).resolve().parent.parent.parent.parent / "e2e" / "cassettes"),
        ),
    )


def cassette_name_for(message: str) -> str:
    """Stable cassette filename derived from the full message content."""
    digest = hashlib.md5(message.encode()).hexdigest()[:12]
    return f"chat-{digest}"


_SENSITIVE_HEADERS = {"authorization", "x-api-key", "api-key", "cookie"}


def _scrub_request(request):
    """Strip credential-bearing headers before a cassette is written to disk."""
    request.headers = {
        k: v for k, v in request.headers.items() if k.lower() not in _SENSITIVE_HEADERS
    }
    return request


def apply_cassette(cassette_name: str):
    """Sync context manager that intercepts httpx (and requests) calls for record/replay.

    Works inside async functions — use with `with`, not `async with`:
        with apply_cassette(cassette_name_for(msg)):
            result = await agent.ainvoke(...)
    """
    import contextlib
    import vcr  # type: ignore

    config = get_cassette_config()
    if config is None:
        return contextlib.nullcontext()

    cassette_path = Path(config["cassette_dir"]) / f"{cassette_name}.yaml"
    cassette_path.parent.mkdir(parents=True, exist_ok=True)

    return vcr.VCR(before_record_request=_scrub_request).use_cassette(
        str(cassette_path),
        record_mode=config["mode"],
        serializer="yaml",
        match_on=["method", "scheme", "host", "port", "path", "query"],
    )
