"""Functional tests for the apps/api back-channel client (#174).

Uses `httpx.MockTransport` to intercept outbound POSTs without spinning up a
real server. The cached `ApiClient.get_instance()` reads its SYSTEM api key
from `AppVars.AI_SERVICE_API_KEY` / `AI_SERVICE_API_SECRET` at startup; tests
instantiate ApiClient directly to control the credentials and base URL per-case.
"""
from __future__ import annotations

import httpx
import pytest

from eccho_ai.core.api_client import ApiClient, ApiClientError


def _client(
    transport: httpx.MockTransport,
    api_key: str = "ai-key",
    api_secret: str = "ai-secret",
) -> ApiClient:
    # Inject the mock transport via a subclass; the production class creates its
    # own AsyncClient inside `post`, so we override `post` to use our transport.
    class _TestApiClient(ApiClient):
        async def post(self, path, json):
            url = self._base_url + (path if path.startswith("/") else "/" + path)
            async with httpx.AsyncClient(transport=transport, timeout=self._timeout) as client:
                try:
                    resp = await client.post(url, json=json, headers=self._headers())
                except httpx.HTTPError as exc:
                    raise ApiClientError(
                        f"POST {url} transport error: {exc}"
                    ) from exc
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

    return _TestApiClient(
        base_url="http://api.test", api_key=api_key, api_secret=api_secret
    )


async def test_post_sends_x_api_key_header():
    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["x_api_key"] = request.headers.get("x-api-key")
        captured["content_type"] = request.headers.get("content-type")
        return httpx.Response(200, json={"ok": True})

    transport = httpx.MockTransport(handler)
    client = _client(transport, api_key="ai-key", api_secret="ai-secret")

    result = await client.post("/system/customers/cust-1/fields", {"key": "k", "value": "v"})

    assert result == {"ok": True}
    # SYSTEM api-key scheme: "<key>:<secret>" in the x-api-key header.
    assert captured["x_api_key"] == "ai-key:ai-secret"
    assert captured["content_type"] == "application/json"


async def test_post_returns_json_body_on_2xx():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"ok": True, "triggeredHandoff": True})

    transport = httpx.MockTransport(handler)
    client = _client(transport)

    result = await client.post("/system/customers/cust-1/tags/apply", {"tagName": "VIP"})

    assert result == {"ok": True, "triggeredHandoff": True}


async def test_post_raises_clean_api_client_error_on_4xx():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(404, json={"message": "customer.error.notFound"})

    transport = httpx.MockTransport(handler)
    client = _client(transport)

    with pytest.raises(ApiClientError) as exc_info:
        await client.post("/system/customers/cust-1/tags/apply", {"tagName": "ghost"})

    # The error wraps the status — callers can match without parsing httpx internals.
    assert "404" in str(exc_info.value)
    # Not a generic httpx error class:
    assert not isinstance(exc_info.value, httpx.HTTPError)


async def test_post_raises_clean_api_client_error_on_transport_failure():
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection refused")

    transport = httpx.MockTransport(handler)
    client = _client(transport)

    with pytest.raises(ApiClientError):
        await client.post("/system/customers/cust-1/fields", {"key": "k", "value": "v"})


def _client_with_transport(
    transport: httpx.MockTransport,
    api_key: str = "ai-key",
    api_secret: str = "ai-secret",
) -> ApiClient:
    # Construct a real ApiClient and swap its internal AsyncClient for one
    # bound to the mock transport, so `get`/`delete` run unmodified — this
    # exercises the production code path, not a re-implementation of it.
    client = ApiClient(base_url="http://api.test", api_key=api_key, api_secret=api_secret)
    client._client = httpx.AsyncClient(transport=transport, timeout=client._timeout)
    return client


async def test_get_sends_x_api_key_and_params_and_returns_json():
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "GET"
        assert request.headers.get("x-api-key") == "ai-key:ai-secret"
        assert request.url.params.get("conversationId") == "conv-1"
        return httpx.Response(200, json=[{"followupId": "f1"}])

    transport = httpx.MockTransport(handler)
    client = _client_with_transport(transport)

    result = await client.get("/system/followups", {"conversationId": "conv-1"})

    assert result == [{"followupId": "f1"}]


async def test_delete_sends_x_api_key_and_returns_json():
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "DELETE"
        assert request.headers.get("x-api-key") == "k:s"
        return httpx.Response(200, json={"cancelled": True})

    transport = httpx.MockTransport(handler)
    client = _client_with_transport(transport, api_key="k", api_secret="s")

    result = await client.delete("/system/followups/f1")

    assert result == {"cancelled": True}


async def test_get_raises_clean_api_client_error_on_4xx():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(404, json={"message": "followup.error.notFound"})

    transport = httpx.MockTransport(handler)
    client = _client_with_transport(transport)

    with pytest.raises(ApiClientError) as exc_info:
        await client.get("/system/followups", {"conversationId": "conv-1"})

    assert "404" in str(exc_info.value)
    assert not isinstance(exc_info.value, httpx.HTTPError)


async def test_delete_raises_clean_api_client_error_on_4xx():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(404, json={"message": "followup.error.notFound"})

    transport = httpx.MockTransport(handler)
    client = _client_with_transport(transport)

    with pytest.raises(ApiClientError) as exc_info:
        await client.delete("/system/followups/f1")

    assert "404" in str(exc_info.value)
    assert not isinstance(exc_info.value, httpx.HTTPError)
