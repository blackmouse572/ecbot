"""Shared HTML readable-text extraction, used by both live crawling and file parsing.

Single source of truth for the skip-tag list so web_crawler.py and
text_processing.py can't silently diverge on what counts as noise.
"""

from selectolax.parser import HTMLParser

# Tags whose content is typically not readable prose.
SKIP_TAGS = frozenset(
    ["script", "style", "noscript", "svg", "head", "meta", "link", "button", "nav", "footer"]
)


def strip_noise_tags(tree: HTMLParser) -> None:
    for tag in SKIP_TAGS:
        for node in tree.css(tag):
            node.decompose()


def extract_readable_text(html: str) -> str:
    tree = HTMLParser(html)
    strip_noise_tags(tree)
    return tree.body.text(separator="\n") if tree.body else tree.text(separator="\n")
