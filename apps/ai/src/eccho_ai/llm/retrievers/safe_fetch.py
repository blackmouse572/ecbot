"""SSRF-safe GET fetching for the knowledge-base web crawler.

Mirrors the egress rules apps/api enforces in `HelperEgressService`
(`apps/api/src/common/helper/services/helper.egress.service.ts` +
`apps/api/src/common/utils/egress-blocklist.util.ts`): only http/https,
DNS-resolved addresses are checked against the private/loopback/link-local/
reserved/multicast/unspecified ranges before any connection is made,
redirects are followed manually (max `MAX_REDIRECTS` hops) with the target
of *every* hop re-validated, and the body is capped at `MAX_BODY_BYTES`
while streaming.

DNS-rebinding window: this module resolves the host with `socket.getaddrinfo`
and validates the returned addresses *before* handing the URL to httpx, but
it cannot pin the connection to the exact address it validated — httpx (via
the stdlib resolver under it) does its own resolution when it actually opens
the socket a moment later. If a hostname's DNS record changes between our
check and httpx's connection (a "DNS rebinding" attack), the request could
still land on a different, disallowed address. Closing this fully would
require a custom transport/connector that connects to the pre-validated IP
directly; that's out of scope here (stdlib only, no new dependency), so the
gap is accepted and documented rather than silently ignored.
"""
from __future__ import annotations

import asyncio
import ipaddress
import socket
from urllib.parse import urljoin, urlparse

import httpx

MAX_REDIRECTS = 5
MAX_BODY_BYTES = 5 * 1024 * 1024  # 5 MB

_ALLOWED_SCHEMES = ("http", "https")


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
    return (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_reserved
        or ip.is_multicast
        or ip.is_unspecified
    )


async def _assert_host_allowed(hostname: str) -> None:
    """Resolve *hostname* off the event loop and reject it if any resolved
    address is disallowed."""
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


async def _assert_url_allowed(url: str) -> None:
    """Validate *url*'s scheme and resolved host."""
    parsed = urlparse(url)
    if parsed.scheme not in _ALLOWED_SCHEMES:
        raise EgressBlockedError(f"Egress blocked: scheme '{parsed.scheme}' is not allowed")
    if not parsed.hostname:
        raise EgressBlockedError("Egress blocked: URL has no hostname")
    await _assert_host_allowed(parsed.hostname)


async def _drain(response: httpx.Response) -> httpx.Response:
    """Read the streamed body, aborting once it exceeds MAX_BODY_BYTES.

    Sets `response._content` directly — the same thing `httpx.Response.aread`
    does internally — so callers can use `.text` / `.content` / `.json()`
    normally afterwards.
    """
    body = bytearray()
    async for chunk in response.aiter_bytes():
        body.extend(chunk)
        if len(body) > MAX_BODY_BYTES:
            raise EgressBlockedError(
                f"Egress blocked: response body exceeded {MAX_BODY_BYTES} bytes"
            )
    response._content = bytes(body)
    return response


async def safe_get(client: httpx.AsyncClient, url: str) -> httpx.Response:
    """GET *url* with SSRF guardrails.

    Validates scheme + resolved address before every request, follows
    redirects manually (re-validating each hop, relative Locations resolved
    against the current URL, max `MAX_REDIRECTS` hops), and streams the body
    with a `MAX_BODY_BYTES` cap. Raises `EgressBlockedError` on any
    violation.
    """
    current_url = url
    redirects_followed = 0

    while True:
        await _assert_url_allowed(current_url)

        async with client.stream("GET", current_url, follow_redirects=False) as response:
            location = response.headers.get("location") if response.is_redirect else None
            if location is None:
                return await _drain(response)

            if redirects_followed >= MAX_REDIRECTS:
                raise EgressBlockedError(
                    f"Egress blocked: too many redirects fetching '{url}'"
                )
            redirects_followed += 1
            current_url = urljoin(current_url, location)
