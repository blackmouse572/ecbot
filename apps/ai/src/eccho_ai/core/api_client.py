"""Thin httpx client for the apps/api system back-channel.

Used by the agent's system tools to perform writes (set field, update profile,
apply / remove tag). Permissions live on the apps/api side; this client just
ferries the call and authenticates with the AI service's SYSTEM api key
(``x-api-key: <key>:<secret>``) — the same scheme the tool-execution callback
uses.
"""
from typing import Any
from functools import lru_cache

import httpx

from eccho_ai.core.variables import AppVars


class ApiClientError(RuntimeError):
    """Raised when the back-channel call to apps/api fails."""


class ApiClient:
    def __init__(
        self, base_url: str, api_key: str, api_secret: str, timeout: float = 10.0
    ):
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key
        self._api_secret = api_secret
        self._timeout = timeout
        # Reused across calls so the singleton keeps a warm connection pool
        # instead of opening a fresh socket (and TLS handshake) per request.
        self._client = httpx.AsyncClient(timeout=timeout)

    def _headers(self) -> dict[str, str]:
        return {
            "Content-Type": "application/json",
            "x-api-key": f"{self._api_key}:{self._api_secret}",
        }

    async def post(self, path: str, json: dict[str, Any]) -> dict[str, Any]:
        url = self._base_url + (path if path.startswith("/") else "/" + path)
        try:
            resp = await self._client.post(url, json=json, headers=self._headers())
        except httpx.HTTPError as exc:
            raise ApiClientError(f"POST {url} transport error: {exc}") from exc
        if resp.status_code >= 400:
            raise ApiClientError(
                f"POST {url} failed: {resp.status_code} {resp.text[:200]}"
            )
        if not resp.content:
            return {}
        try:
            return resp.json()
        except ValueError:
            return {"raw": resp.text}

    async def get(self, path: str, params: dict[str, Any] | None = None) -> Any:
        url = self._base_url + (path if path.startswith("/") else "/" + path)
        try:
            resp = await self._client.get(
                url, params=params, headers=self._headers()
            )
        except httpx.HTTPError as exc:
            raise ApiClientError(f"GET {url} transport error: {exc}") from exc
        if resp.status_code >= 400:
            raise ApiClientError(
                f"GET {url} failed: {resp.status_code} {resp.text[:200]}"
            )
        if not resp.content:
            return {}
        try:
            return resp.json()
        except ValueError:
            return {"raw": resp.text}

    async def delete(self, path: str, params: dict[str, Any] | None = None) -> Any:
        url = self._base_url + (path if path.startswith("/") else "/" + path)
        try:
            resp = await self._client.delete(
                url, params=params, headers=self._headers()
            )
        except httpx.HTTPError as exc:
            raise ApiClientError(f"DELETE {url} transport error: {exc}") from exc
        if resp.status_code >= 400:
            raise ApiClientError(
                f"DELETE {url} failed: {resp.status_code} {resp.text[:200]}"
            )
        if not resp.content:
            return {}
        try:
            return resp.json()
        except ValueError:
            return {"raw": resp.text}

    @staticmethod
    @lru_cache(maxsize=1)
    def get_instance() -> "ApiClient":
        return ApiClient(
            base_url=AppVars.API_BASE_URL,
            api_key=AppVars.AI_SERVICE_API_KEY.get_secret_value(),
            api_secret=AppVars.AI_SERVICE_API_SECRET.get_secret_value(),
        )
