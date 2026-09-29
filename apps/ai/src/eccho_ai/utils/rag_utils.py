from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from eccho_ai.llm.retrievers.retrieval import RetrievedChunk


def public_source_url(chunk: RetrievedChunk) -> str | None:
    """The web page a chunk came from, or None. Never the chunk's `source`:
    for uploaded files and text items that is the storage file name / title."""
    return chunk.metadata.get("document", {}).get("source_url") or None
