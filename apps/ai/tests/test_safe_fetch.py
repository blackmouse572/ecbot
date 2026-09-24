"""Tests for SSRF-safe fetching (`llm/retrievers/safe_fetch.py`).

Uses `httpx.MockTransport` to intercept the HTTP layer and monkeypatches
`socket.getaddrinfo` to control what a hostname "resolves" to, without
needing real network/DNS access. Handlers that must never be reached (a
request blocked before it leaves the process) raise `AssertionError` if
called, so a bug that lets a blocked request through fails loudly.
"""
from __future__ import annotations

import socket

import httpx
import pytest

from eccho_ai.llm.retrievers.safe_fetch import EgressBlockedError, safe_get


def _fake_getaddrinfo(addresses: dict[str, list[str]]):
    """Build a `socket.getaddrinfo` stand-in keyed by hostname."""

    def _getaddrinfo(host, port, *args, **kwargs):
        try:
            resolved = addresses[host]
        except KeyError:
            raise socket.gaierror(f"no mock address configured for {host!r}")
        return [
            (
                socket.AF_INET6 if ":" in addr else socket.AF_INET,
                socket.SOCK_STREAM,
                6,
                "",
                (addr, 0),
            )
            for addr in resolved
        ]

    return _getaddrinfo


def _unreachable_handler(request: httpx.Request) -> httpx.Response:
    raise AssertionError(f"transport should not be reached for {request.url}")


async def test_non_http_scheme_is_blocked():
    client = httpx.AsyncClient(transport=httpx.MockTransport(_unreachable_handler))
    try:
        with pytest.raises(EgressBlockedError):
            await safe_get(client, "file:///etc/passwd")
    finally:
        await client.aclose()


async def test_literal_loopback_address_is_blocked():
    client = httpx.AsyncClient(transport=httpx.MockTransport(_unreachable_handler))
    try:
        with pytest.raises(EgressBlockedError):
            await safe_get(client, "http://127.0.0.1/")
    finally:
        await client.aclose()


async def test_literal_private_10_range_is_blocked():
    client = httpx.AsyncClient(transport=httpx.MockTransport(_unreachable_handler))
    try:
        with pytest.raises(EgressBlockedError):
            await safe_get(client, "http://10.1.2.3/")
    finally:
        await client.aclose()


async def test_cloud_metadata_address_is_blocked():
    client = httpx.AsyncClient(transport=httpx.MockTransport(_unreachable_handler))
    try:
        with pytest.raises(EgressBlockedError):
            await safe_get(client, "http://169.254.169.254/latest/meta-data/")
    finally:
        await client.aclose()


async def test_ipv4_mapped_ipv6_loopback_is_blocked():
    """::ffff:127.0.0.1 must be rejected the same as 127.0.0.1."""
    client = httpx.AsyncClient(transport=httpx.MockTransport(_unreachable_handler))
    try:
        with pytest.raises(EgressBlockedError):
            await safe_get(client, "http://[::ffff:127.0.0.1]/")
    finally:
        await client.aclose()


async def test_hostname_resolving_to_private_address_is_blocked(monkeypatch):
    monkeypatch.setattr(
        socket, "getaddrinfo", _fake_getaddrinfo({"evil.example.com": ["10.0.0.5"]})
    )
    client = httpx.AsyncClient(transport=httpx.MockTransport(_unreachable_handler))
    try:
        with pytest.raises(EgressBlockedError):
            await safe_get(client, "http://evil.example.com/")
    finally:
        await client.aclose()


async def test_public_host_is_allowed(monkeypatch):
    monkeypatch.setattr(
        socket, "getaddrinfo", _fake_getaddrinfo({"example.com": ["93.184.216.34"]})
    )

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200, headers={"content-type": "text/html"}, text="<html>ok</html>"
        )

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    try:
        response = await safe_get(client, "http://example.com/")
        assert response.status_code == 200
        assert response.text == "<html>ok</html>"
    finally:
        await client.aclose()


async def test_redirect_to_private_address_is_blocked_at_that_hop(monkeypatch):
    monkeypatch.setattr(
        socket,
        "getaddrinfo",
        _fake_getaddrinfo(
            {
                "public.example.com": ["93.184.216.34"],
                "internal.example.com": ["10.0.0.9"],
            }
        ),
    )

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.host == "public.example.com":
            return httpx.Response(
                302, headers={"location": "http://internal.example.com/secret"}
            )
        raise AssertionError(f"transport should not reach {request.url}")

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    try:
        with pytest.raises(EgressBlockedError):
            await safe_get(client, "http://public.example.com/")
    finally:
        await client.aclose()


async def test_too_many_redirects_is_blocked(monkeypatch):
    monkeypatch.setattr(
        socket,
        "getaddrinfo",
        _fake_getaddrinfo({f"hop{i}.example.com": ["93.184.216.34"] for i in range(10)}),
    )

    def handler(request: httpx.Request) -> httpx.Response:
        n = int(request.url.host.removeprefix("hop").split(".")[0])
        return httpx.Response(
            302, headers={"location": f"http://hop{n + 1}.example.com/"}
        )

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    try:
        with pytest.raises(EgressBlockedError):
            await safe_get(client, "http://hop0.example.com/")
    finally:
        await client.aclose()


async def test_oversize_body_is_blocked(monkeypatch):
    monkeypatch.setattr(
        socket, "getaddrinfo", _fake_getaddrinfo({"big.example.com": ["93.184.216.34"]})
    )

    oversized = b"x" * (5 * 1024 * 1024 + 1)

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200, headers={"content-type": "text/html"}, content=oversized
        )

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    try:
        with pytest.raises(EgressBlockedError):
            await safe_get(client, "http://big.example.com/")
    finally:
        await client.aclose()
