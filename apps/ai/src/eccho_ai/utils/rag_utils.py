from __future__ import annotations

import re
from pathlib import PurePath
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from eccho_ai.llm.retrievers.retrieval import RetrievedChunk


def public_source_url(chunk: RetrievedChunk) -> str | None:
    """The web page a chunk came from, or None. Never the chunk's `source`:
    for uploaded files and text items that is the storage file name / title."""
    return chunk.metadata.get("document", {}).get("source_url") or None


# apps/api stores uploads as "<epoch ms>-<slug>.<ext>".
_STORAGE_PREFIX = re.compile(r"^\d{10,}-")


def source_title(chunk: RetrievedChunk) -> str:
    """A name an operator recognises for the source: the knowledge item's
    title, else the web page's title, else the file name without apps/api's
    storage prefix and extension (documents ingested before titles were kept)."""
    title = chunk.metadata.get("document", {}).get("title") or chunk.metadata.get("chunk", {}).get("title")
    if title:
        return str(title)
    return _STORAGE_PREFIX.sub("", PurePath(chunk.filename or "").stem)
