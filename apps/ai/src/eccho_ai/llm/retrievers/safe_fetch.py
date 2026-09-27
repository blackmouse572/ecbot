"""SSRF-safe GET fetching for the knowledge-base web crawler.

Mirrors the egress rules apps/api enforces in `HelperEgressService`
(`apps/api/src/common/helper/services/helper.egress.service.ts` +
`apps/api/src/common/utils/egress-blocklist.util.ts`): only http/https,
DNS-resolved addresses are checked against the private/loopback/link-local/
reserved/multicast/unspecified/CGNAT ranges (plus a `.internal` hostname
suffix) before any connection is made, redirects are followed manually
(max `MAX_REDIRECTS` hops) with the target of *every* hop re-validated, and
the body is capped at `MAX_BODY_BYTES` while streaming.

Host parsing: this module validates `httpx.URL(...).raw_host` — the exact,
already-IDNA2008-encoded ASCII host httpx itself dials — not
`urllib.parse.urlparse(...).hostname`. The two disagree for some non-ASCII
hostnames (`urlparse` leaves the host as raw Unicode, which CPython's
`socket.getaddrinfo` then encodes with the *old* IDNA2003 codec; httpx
encodes it with IDNA2008 when it builds the request). For a hostname like
`aß.example.com`, IDNA2003 gives `ass.example.com` while IDNA2008 gives
`xn--a-qfa.example.com` — two different names. Validating the `urlparse`
host would check one name while httpx dials the other, letting an attacker
point the "checked" name at a public address and the "dialed" name at a
private one.

DNS-rebinding window: this module resolves the (already-correct) host with
`socket.getaddrinfo` and validates the returned addresses *before* handing
the URL to httpx, but it cannot pin the connection to the exact address it
validated — httpx (via the stdlib resolver under it) does its own
resolution when it actually opens the socket a moment later. If a
hostname's DNS record changes between our check and httpx's connection (a
"DNS rebinding" attack), the request could still land on a different,
disallowed address. Closing this fully would require a custom
transport/connector that connects to the pre-validated IP directly; that's
out of scope here (stdlib only, no new dependency), so the gap is accepted
and documented rather than silently ignored.
"""
from __future__ import annotations

import asyncio
import ipaddress
import socket

import httpx

MAX_REDIRECTS = 5
MAX_BODY_BYTES = 5 * 1024 * 1024  # 5 MB

_ALLOWED_SCHEMES = ("http", "https")

# Mirrors `isDisallowedHostname` in egress-blocklist.util.ts.
_DISALLOWED_HOSTNAME_SUFFIXES = (".internal",)

# RFC 6598 carrier-grade NAT space. Not "private" per stdlib `ipaddress`,
# but internal-only in practice — some cloud providers (e.g. Alibaba Cloud,
# 100.100.100.200) serve their instance-metadata endpoint from it.
_CGNAT_NETWORK = ipaddress.ip_network("100.64.0.0/10")

# Headers this module strips off a response before rebuilding it in `_drain`:
# `content-encoding` no longer applies (the body has already been rejected
# if it wasn't identity/absent), and `content-length`/`transfer-encoding`
# described the *original* transfer, not the freshly-constructed one.
_DROPPED_RESPONSE_HEADERS = {"content-encoding", "content-length", "transfer-encoding"}


class EgressBlockedError(Exception):
    """Raised when a fetch target (or a redirect hop) is not allowed."""


def _is_disallowed_ip(address: str) -> bool:
    """True if *address* must not be connected to.

    IPv4-mapped IPv6 addresses (``::ffff:x.x.x.x``) are unwrapped to their
    IPv4 form first — `ipaddress`'s own `is_private`/`is_loopback`/etc.
    already classify the mapped form correctly, but unwrapping makes the
    intent explicit and matches the TS reference's IPv4-mapped handling.
    """
    ip = ipaddress.ip_address(address)
    mapped = ip.ipv4_mapped if isinstance(ip, ipaddress.IPv6Address) else None
    if mapped is not None:
        ip = mapped
    if isinstance(ip, ipaddress.IPv4Address) and ip in _CGNAT_NETWORK:
        return True
    return (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_reserved
        or ip.is_multicast
        or ip.is_unspecified
    )


def _is_disallowed_hostname(hostname: str) -> bool:
    """True if *hostname* is off limits independent of what it resolves to."""
    lower = hostname.lower()
    return any(lower.endswith(suffix) for suffix in _DISALLOWED_HOSTNAME_SUFFIXES)


async def _assert_host_allowed(hostname: str) -> None:
    """Resolve *hostname* off the event loop and reject it if any resolved
    address is disallowed."""
    if _is_disallowed_hostname(hostname):
        raise EgressBlockedError(f"Egress blocked: host '{hostname}' is not allowed")

    loop = asyncio.get_running_loop()
    try:
        infos = await loop.run_in_executor(None, socket.getaddrinfo, hostname, None)
    except socket.gaierror as exc:
        raise EgressBlockedError(
            f"Egress blocked: could not resolve host '{hostname}': {exc}"
        ) from exc

    if not infos:
        raise EgressBlockedError(
            f"Egress blocked: host '{hostname}' resolved to no addresses"
        )

    for info in infos:
        address = info[4][0]
        if _is_disallowed_ip(address):
            raise EgressBlockedError(
                f"Egress blocked: '{hostname}' resolved to disallowed address '{address}'"
            )


async def _assert_url_allowed(url: httpx.URL) -> None:
    """Validate *url*'s scheme and resolved host.

    *url* must be an `httpx.URL` — the same parser httpx itself uses to
    decide what to dial, so this checks exactly what will be connected to
    (see the module docstring's note on `raw_host` vs `urlparse().hostname`).
    """
    if url.scheme not in _ALLOWED_SCHEMES:
        raise EgressBlockedError(f"Egress blocked: scheme '{url.scheme}' is not allowed")
    host = url.raw_host.decode("ascii") if url.raw_host else ""
    if not host:
        raise EgressBlockedError("Egress blocked: URL has no hostname")
    await _assert_host_allowed(host)


async def _drain(response: httpx.Response) -> httpx.Response:
    """Read the response body, aborting once it exceeds MAX_BODY_BYTES, and
    return a fresh `httpx.Response` built through the public constructor.

    Uses `aiter_bytes()` (decoded content) rather than `aiter_raw()` (wire
    bytes) — but only *after* the caller has already rejected any response
    whose `content-encoding` isn't identity/absent (see `safe_get`), so by
    the time this runs, decoded and wire bytes are the same thing and no
    decompression amplification is possible either way. This sidesteps
    `aiter_raw()`'s requirement that the underlying transport stream not
    already have been read once (some transports — e.g. `httpx.MockTransport`
    built from `content=...`/`text=...` — populate the response eagerly),
    while giving the identical safety property for the only bodies that
    reach here.
    """
    body = bytearray()
    async for chunk in response.aiter_bytes():
        body.extend(chunk)
        if len(body) > MAX_BODY_BYTES:
            raise EgressBlockedError(
                f"Egress blocked: response body exceeded {MAX_BODY_BYTES} bytes"
            )
    headers = [
        (name, value)
        for name, value in response.headers.multi_items()
        if name not in _DROPPED_RESPONSE_HEADERS
    ]
    return httpx.Response(
        response.status_code,
        headers=headers,
        content=bytes(body),
        request=response.request,
    )


async def safe_get(client: httpx.AsyncClient, url: str) -> httpx.Response:
    """GET *url* with SSRF guardrails.

    Validates scheme + resolved address before every request, follows
    redirects manually (re-validating each hop, relative Locations resolved
    against the current URL, max `MAX_REDIRECTS` hops), rejects a
    non-identity-encoded response body outright, and streams the (identity)
    body with a `MAX_BODY_BYTES` cap. Raises `EgressBlockedError` on any
    violation.
    """
    current_url = httpx.URL(url)
    redirects_followed = 0

    while True:
        await _assert_url_allowed(current_url)

        async with client.stream(
            "GET",
            current_url,
            follow_redirects=False,
            headers={"Accept-Encoding": "identity"},
        ) as response:
            location = response.headers.get("location") if response.is_redirect else None
            if location is not None:
                if redirects_followed >= MAX_REDIRECTS:
                    raise EgressBlockedError(
                        f"Egress blocked: too many redirects fetching '{url}'"
                    )
                redirects_followed += 1
                current_url = current_url.join(location)
                continue

            content_encoding = response.headers.get("content-encoding", "")
            if content_encoding and content_encoding.lower() != "identity":
                raise EgressBlockedError(
                    f"Egress blocked: response content-encoding "
                    f"'{content_encoding}' is not allowed"
                )
            return await _drain(response)
