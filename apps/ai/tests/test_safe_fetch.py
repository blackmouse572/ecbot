"""Tests for SSRF-safe fetching (`llm/retrievers/safe_fetch.py`).

Uses `httpx.MockTransport` to intercept the HTTP layer and monkeypatches
`socket.getaddrinfo` to control what a hostname "resolves" to, without
needing real network/DNS access. Handlers that must never be reached (a
request blocked before it leaves the process) raise `AssertionError` if
called, so a bug that lets a blocked request through fails loudly.
"""
from __future__ import annotations

import gzip
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


# ── Fix round 1 ──────────────────────────────────────────────────────────
#
# CRITICAL: urlparse().hostname decodes IDNA2003-Unicode, but httpx dials the
# IDNA2008-punycode host — for some hostnames those two encodings disagree,
# so checking the urlparse() host doesn't check the host httpx actually
# connects to.


def _fake_getaddrinfo_idna_aware(addresses: dict[str, list[str]]):
    """Like `_fake_getaddrinfo`, but first runs the queried host through the
    same (IDNA2003) encoding CPython's real `socket.getaddrinfo` applies to
    a non-ASCII hostname internally. A plain `_fake_getaddrinfo` bypasses
    that C-level auto-encoding entirely (it receives whatever string the
    code under test passed, verbatim), which would hide the exact bug this
    test targets: it needs a fake that reacts the same way real DNS
    resolution would to whichever (possibly wrong) host string is passed in.
    """

    def _getaddrinfo(host, port, *args, **kwargs):
        key = host.encode("idna").decode("ascii") if not host.isascii() else host
        try:
            resolved = addresses[key]
        except KeyError:
            raise socket.gaierror(f"no mock address configured for {key!r}")
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


async def test_idna_encoding_mismatch_does_not_bypass_the_check(monkeypatch):
    """'aß.example.com' must be checked, resolved and dialed as ONE host.

    httpx.URL('http://aß.example.com/').raw_host is the IDNA2008 punycode
    form b'xn--a-qfa.example.com' — that's what httpx actually dials.
    'aß.example.com'.encode('idna') (stdlib IDNA2003) is the DIFFERENT
    string 'ass.example.com'. A validator that resolves/checks the
    urlparse()/IDNA2003 host but lets httpx dial the IDNA2008 host would
    approve the request against the "safe-looking" IDNA2003 host (which
    resolves to a public address here) while the real, IDNA2008 host httpx
    dials resolves to the metadata address — a deterministic bypass. Using
    `_unreachable_handler` (not just `pytest.raises`) catches that
    concretely: on the buggy code path the mistakenly-approved request
    actually reaches the transport (as 'xn--a-qfa.example.com') and blows
    up there with `AssertionError`, not the expected `EgressBlockedError`.
    """
    monkeypatch.setattr(
        socket,
        "getaddrinfo",
        _fake_getaddrinfo_idna_aware(
            {
                "ass.example.com": ["93.184.216.34"],  # IDNA2003 form: public
                "xn--a-qfa.example.com": ["169.254.169.254"],  # IDNA2008 form: metadata
            }
        ),
    )

    client = httpx.AsyncClient(transport=httpx.MockTransport(_unreachable_handler))
    try:
        with pytest.raises(EgressBlockedError):
            await safe_get(client, "http://aß.example.com/")
    finally:
        await client.aclose()


# IMPORTANT: capping the *decoded* body let a small compressed response
# balloon in memory before the cap ever fired.


async def test_compressed_response_is_rejected_before_decoding(monkeypatch):
    """A gzip body must be rejected on its `content-encoding` alone, even
    when its *decoded* size is well under `MAX_BODY_BYTES`.

    Deliberately decodes to only ~1 MB (under the 5 MB cap) so this test
    can't pass "by accident" via a decode-then-check-size cap — the old
    `_drain` (which capped `aiter_bytes()`, i.e. decoded bytes) would let a
    1 MB decoded body straight through. Only a check that rejects
    non-identity `content-encoding` up front blocks this. (A real bomb
    would additionally decode to something far larger — e.g. a ~20 KB gzip
    body can decode to ~20 MB — which is the actual DoS this guards
    against; the small size here isolates the encoding check from the size
    cap so the two guardrails are each tested for what they actually do.)

    The server advertises `content-encoding: gzip` regardless of what this
    module asks for via `Accept-Encoding` (a malicious/misconfigured origin
    won't necessarily honor that header).
    """
    monkeypatch.setattr(
        socket, "getaddrinfo", _fake_getaddrinfo({"bomb.example.com": ["93.184.216.34"]})
    )

    compressed = gzip.compress(b"0" * 1024 * 1024)  # decodes to 1 MB, well under the cap

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            headers={"content-type": "text/html", "content-encoding": "gzip"},
            content=compressed,
        )

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    try:
        with pytest.raises(EgressBlockedError):
            await safe_get(client, "http://bomb.example.com/")
    finally:
        await client.aclose()


# MINOR: CGNAT range + `.internal` hostnames, mirroring
# apps/api/src/common/utils/egress-blocklist.util.ts.


async def test_cgnat_address_is_blocked(monkeypatch):
    """100.64.0.0/10 (RFC 6598 CGNAT) — covers Alibaba's 100.100.100.200 metadata."""
    monkeypatch.setattr(
        socket,
        "getaddrinfo",
        _fake_getaddrinfo({"alibaba-metadata.example.com": ["100.100.100.200"]}),
    )
    client = httpx.AsyncClient(transport=httpx.MockTransport(_unreachable_handler))
    try:
        with pytest.raises(EgressBlockedError):
            await safe_get(client, "http://alibaba-metadata.example.com/")
    finally:
        await client.aclose()


async def test_internal_suffix_hostname_is_blocked_even_if_publicly_resolved(monkeypatch):
    """A `.internal` hostname is blocked on the name alone (mirrors
    `isDisallowedHostname` in egress-blocklist.util.ts) — even if it
    (implausibly) resolves to a public address, it must still be blocked."""
    monkeypatch.setattr(
        socket,
        "getaddrinfo",
        _fake_getaddrinfo({"service.internal": ["93.184.216.34"]}),
    )
    client = httpx.AsyncClient(transport=httpx.MockTransport(_unreachable_handler))
    try:
        with pytest.raises(EgressBlockedError):
            await safe_get(client, "http://service.internal/")
    finally:
        await client.aclose()


# MINOR: redirect edge cases.


async def test_exactly_five_redirects_succeeds(monkeypatch):
    monkeypatch.setattr(
        socket,
        "getaddrinfo",
        _fake_getaddrinfo({f"hop{i}.example.com": ["93.184.216.34"] for i in range(6)}),
    )

    def handler(request: httpx.Request) -> httpx.Response:
        n = int(request.url.host.removeprefix("hop").split(".")[0])
        if n < 5:
            return httpx.Response(
                302, headers={"location": f"http://hop{n + 1}.example.com/"}
            )
        return httpx.Response(200, headers={"content-type": "text/html"}, text="done")

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    try:
        response = await safe_get(client, "http://hop0.example.com/")
        assert response.status_code == 200
        assert response.text == "done"
    finally:
        await client.aclose()


async def test_relative_redirect_location_is_resolved_against_current_url(monkeypatch):
    """A path-only Location (e.g. `/next`) has no host of its own — it must
    resolve against the *current* URL, not fail or be misread as relative to
    the original seed URL."""
    monkeypatch.setattr(
        socket, "getaddrinfo", _fake_getaddrinfo({"public.example.com": ["93.184.216.34"]})
    )

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/start":
            return httpx.Response(302, headers={"location": "/next"})
        assert request.url.path == "/next"
        return httpx.Response(200, headers={"content-type": "text/html"}, text="ok")

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    try:
        response = await safe_get(client, "http://public.example.com/start")
        assert response.status_code == 200
        assert response.text == "ok"
    finally:
        await client.aclose()


async def test_relative_network_path_redirect_to_private_host_is_blocked(monkeypatch):
    """A network-path Location (`//host/path`, no scheme) still carries a
    host — resolving it must pick that host up and re-validate it, not treat
    the whole thing as a same-host relative path."""
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
            return httpx.Response(302, headers={"location": "//internal.example.com/secret"})
        raise AssertionError(f"transport should not reach {request.url}")

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    try:
        with pytest.raises(EgressBlockedError):
            await safe_get(client, "http://public.example.com/")
    finally:
        await client.aclose()


async def test_redirect_to_non_http_scheme_is_blocked(monkeypatch):
    monkeypatch.setattr(
        socket, "getaddrinfo", _fake_getaddrinfo({"public.example.com": ["93.184.216.34"]})
    )

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(302, headers={"location": "ftp://public.example.com/x"})

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    try:
        with pytest.raises(EgressBlockedError):
            await safe_get(client, "http://public.example.com/")
    finally:
        await client.aclose()
