"""Media items: images and PDFs a business uploads for its agent to send.

Each item is one row in `rag.rag_media`, embedded from its title and a short
description, and searched on its own: media never takes one of the knowledge
chunks' places in retrieval. The description is the owner's when they wrote
one, otherwise the vision model's (images) or the start of the text (PDFs).
"""
from __future__ import annotations

import asyncio
import base64
import re
import tempfile
from collections.abc import Awaitable, Callable
from pathlib import Path

from langchain_core.messages import HumanMessage
from pydantic import BaseModel

from eccho_ai.core.app_logger import get_logger
from eccho_ai.core.variables import AppVars
from eccho_ai.llm.providers.chat_model import build_chat_model
from eccho_ai.llm.retrievers.embeddings import (
    aembed_documents_with_usage,
    get_embeddings_client,
)
from eccho_ai.llm.retrievers.text_processing import load_document
from eccho_ai.llm.retrievers.vector_store import PgVectorStore
from eccho_ai.llm.usage import TokenUsage

logger = get_logger(__name__)

MEDIA_IMAGE_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
MEDIA_PDF_TYPE = "application/pdf"
MEDIA_DESCRIPTION_MAX_CHARS = 1000
_PAGE_MARKER = re.compile(r"^\[Page \d+\]\n?", re.MULTILINE)

_DESCRIBE_PROMPT = (
    "This image belongs to a business that will send it to customers in chat. "
    "Write a short description that lets someone find it by search: what it "
    "shows (product, dish, service, banner, menu, place), its distinguishing "
    "details (colors, style, size), and all visible text verbatim (names, "
    "prices, dates, codes). Write in the language of the visible text, or "
    "Vietnamese when there is none. Plain text, at most 80 words. Do not guess "
    "anything that is not visible."
)


class MediaIngestResponse(BaseModel):
    description: str
    embedding_model: str
    usage: TokenUsage | None = None


def _add(a: TokenUsage | None, b: TokenUsage | None) -> TokenUsage | None:
    if a is None or b is None:
        return a or b
    return TokenUsage(
        input_tokens=a.input_tokens + b.input_tokens,
        output_tokens=a.output_tokens + b.output_tokens,
        total_tokens=a.total_tokens + b.total_tokens,
    )


async def describe_media_image(
    content: bytes, mime_type: str, title: str
) -> tuple[str | None, TokenUsage | None]:
    """The vision model's description of one image; None when it fails."""
    data_url = f"data:{mime_type};base64,{base64.b64encode(content).decode()}"
    message = HumanMessage(content=[
        {"type": "text", "text": f"{_DESCRIBE_PROMPT}\nThe owner named it: {title}"},
        {"type": "image_url", "image_url": {"url": data_url}},
    ])
    try:
        model = build_chat_model(AppVars.VISION_MODEL, temperature=0.0, max_tokens=300)
        reply = await model.ainvoke([message])
    except Exception as exc:  # noqa: BLE001 (any provider error: index by title alone)
        logger.warning("media_describe_failed", error=str(exc))
        return None, None
    usage = getattr(reply, "usage_metadata", None) or {}
    text = str(reply.content or "").strip()
    return text or None, TokenUsage(
        input_tokens=usage.get("input_tokens", 0),
        output_tokens=usage.get("output_tokens", 0),
        total_tokens=usage.get("total_tokens", 0),
    )


def _pdf_text(content: bytes) -> str:
    with tempfile.TemporaryDirectory() as folder:
        path = Path(folder) / "media.pdf"
        path.write_bytes(content)
        text = load_document(path, source_filename=path.name, mime_type=MEDIA_PDF_TYPE).page_content
    # The page markers help chunk citations, not a short description.
    return _PAGE_MARKER.sub("", text).strip()


class MediaIngestService:
    def __init__(
        self,
        store: PgVectorStore | None = None,
        embed: Callable[[list[str]], Awaitable[tuple[list[list[float]], TokenUsage | None]]] | None = None,
    ):
        self.embedding_dimension = AppVars.RAG_EMBEDDING_DIMENSION
        self.embedding_model = AppVars.RAG_EMBEDDING_MODEL
        self.store = store or PgVectorStore(embedding_dimension=self.embedding_dimension)
        self._embed = embed or (lambda texts: aembed_documents_with_usage(get_embeddings_client(), texts))

    async def ingest(
        self,
        *,
        content: bytes,
        mime_type: str,
        knowledge_item_id: str,
        chatbot_ids: list[str],
        title: str,
        url: str,
        description: str | None,
    ) -> MediaIngestResponse:
        mime_type = (mime_type or "").lower()
        if mime_type not in MEDIA_IMAGE_TYPES and mime_type != MEDIA_PDF_TYPE:
            raise ValueError(f"Unsupported media type: {mime_type}")

        usage: TokenUsage | None = None
        if not (description and description.strip()):
            if mime_type == MEDIA_PDF_TYPE:
                description = await asyncio.to_thread(_pdf_text, content)
            else:
                description, usage = await describe_media_image(content, mime_type, title)
        description = (description or "").strip()[:MEDIA_DESCRIPTION_MAX_CHARS]

        text = f"{title}\n{description}" if description else title
        embeddings, embed_usage = await self._embed([text])
        if len(embeddings) != 1 or len(embeddings[0]) != self.embedding_dimension:
            raise ValueError("Embedding dimension mismatch for media item")

        await self.store.upsert_media(
            knowledge_item_id=knowledge_item_id,
            chatbot_ids=chatbot_ids,
            title=title,
            description=description,
            url=url,
            mime_type=mime_type,
            embedding=embeddings[0],
        )
        return MediaIngestResponse(
            description=description,
            embedding_model=self.embedding_model,
            usage=_add(usage, embed_usage),
        )
