"""Web crawling repository using selectolax.

Crawls a starting URL up to a configurable depth, extracts readable text,
and tracks which URL each chunk of text originated from.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from urllib.parse import urljoin, urlparse

import httpx
from selectolax.parser import HTMLParser

from eccho_ai.core.variables import AppVars
from eccho_ai.llm.retrievers.html_text import strip_noise_tags

logger = logging.getLogger(__name__)

@dataclass
class CrawledPage:
    """Text and metadata from a single crawled URL."""

    url: str
    text: str


@dataclass
class WebCrawlResult:
    """Aggregated result from crawling a seed URL."""

    pages: list[CrawledPage] = field(default_factory=list)

    @property
    def full_text(self) -> str:
        """All page texts joined by double newlines."""
        return "\n\n".join(p.text for p in self.pages if p.text.strip())

    @property
    def preview_text(self) -> str:
        """First ~500 characters suitable for the knowledge item content preview."""
        text = self.full_text
        return text[:500].rstrip() + ("…" if len(text) > 500 else "")


class WebCrawlerRepo:
    """Asynchronous, breadth-first web crawler.

    Safety guardrails applied:
    * Maximum crawl depth respected.
    * Only same-domain links followed (by default).
    * Duplicate URLs deduplicated.
    * Content-type checked — only HTML pages are crawled.
    * Total page limit (_MAX_PAGES) prevents infinite crawls.
    """

    def __init__(
        self,
        same_domain_only: bool = True,
        request_timeout: float = 10.0,
        max_pages: int | None = None,
    ) -> None:
        self._same_domain_only = same_domain_only
        self._timeout = httpx.Timeout(request_timeout)
        self._max_pages = max_pages if max_pages is not None else AppVars.CRAWL_MAX_PAGES

    # ── Public API ────────────────────────────────────────────────────────

    async def crawl(
        self,
        seed_url: str,
        depth: int = 1,
    ) -> WebCrawlResult:
        """Crawl *seed_url* breadth-first up to *depth* levels deep.

        Properly extracts and follows links from each crawled page, respecting
        same-domain-only, depth, and page-count limits.

        Args:
            seed_url: The URL to start crawling from.
            depth: Maximum link-follow depth (0 = only the seed page).

        Returns:
            :class:`WebCrawlResult` with text from every visited page.
        """
        result = WebCrawlResult()
        visited: set[str] = set()
        seed_domain = urlparse(seed_url).netloc

        queue: list[tuple[str, int]] = [(seed_url, 0)]

        async with httpx.AsyncClient(timeout=self._timeout, follow_redirects=True) as client:
            while queue and len(visited) < self._max_pages:
                url, current_depth = queue.pop(0)

                if url in visited:
                    continue
                visited.add(url)

                page, links = await self._fetch_and_extract(client, url, seed_domain)
                if page is not None:
                    result.pages.append(page)

                if current_depth < depth:
                    for link in links:
                        if link not in visited:
                            queue.append((link, current_depth + 1))

        return result

    async def crawl_full(
        self,
        seed_url: str,
        depth: int = 1,
    ) -> WebCrawlResult:
        """Backward-compatible alias for full crawl behavior."""
        return await self.crawl(seed_url=seed_url, depth=depth)

    # ── Internals ─────────────────────────────────────────────────────────

    async def _fetch_and_extract(
        self,
        client: httpx.AsyncClient,
        url: str,
        seed_domain: str,
    ) -> tuple[CrawledPage | None, list[str]]:
        """Fetch *url*, extract readable text, and collect outbound links in one pass."""
        try:
            response = await client.get(url)
            response.raise_for_status()
        except Exception as exc:
            logger.warning(f"WebCrawlerRepo: could not fetch '{url}' — {exc}")
            return None, []

        content_type = response.headers.get("content-type", "")
        if "text/html" not in content_type:
            return None, []

        html = response.text
        tree = HTMLParser(html)

        # Collect outbound links before removing noisy tags
        links: list[str] = []
        for a in tree.css("a[href]"):
            href = a.attributes.get("href", "")
            if not href or href.startswith(("#", "mailto:", "tel:", "javascript:")):
                continue
            abs_url = urljoin(url, href)
            parsed = urlparse(abs_url)
            if parsed.scheme not in ("http", "https"):
                continue
            if self._same_domain_only and parsed.netloc != seed_domain:
                continue
            # Strip fragment
            links.append(abs_url.split("#")[0])

        # Remove noisy tags before text extraction
        strip_noise_tags(tree)

        raw = tree.body.text(separator="\n") if tree.body else tree.text(separator="\n")
        text = re.sub(r"\n{3,}", "\n\n", raw)
        text = re.sub(r"[ \t]{2,}", " ", text).strip()

        if not text:
            return None, links

        return CrawledPage(url=url, text=text), links
