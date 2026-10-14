"""Media items: images and PDFs a business uploads for its agent to send.

Each item is one row in `rag.rag_media`, embedded from its title and a short
description, and searched on its own: media never takes one of the knowledge
chunks' places in retrieval. The description is the owner's when they wrote
one, otherwise the vision model's (images) or the start of the text (PDFs).
"""
from __future__ import annotations

import asyncio
import base64
from collections.abc import Awaitable, Callable

import pymupdf
from langchain_core.messages import HumanMessage
from pydantic import BaseModel

from eccho_ai.core.app_logger import get_logger
from eccho_ai.core.variables import AppVars
from eccho_ai.llm.providers.chat_model import build_chat_model
from eccho_ai.llm.retrievers.embeddings import (
    aembed_documents_with_usage,
    get_embeddings_client,
)
from eccho_ai.llm.retrievers.vector_store import PgVectorStore
from eccho_ai.llm.usage import TokenUsage
from eccho_ai.modules.rag.models import RAGIngestResponse
from eccho_ai.modules.rag.services import RAGIngestService

logger = get_logger(__name__)

MEDIA_IMAGE_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
MEDIA_PDF_TYPE = "application/pdf"
MEDIA_DESCRIPTION_MAX_CHARS = 1000
# A page with less text than this is a picture (a menu photo, a scan): only
# its page number or a caption comes out as text, so the vision model reads it.
PDF_PAGE_MIN_TEXT_CHARS = 40
PDF_PAGES_PER_VISION_CALL = 8
# Bounds the vision cost of one upload (a 20MB PDF can hold hundreds of scans).
PDF_MAX_VISION_PAGES = 80
PDF_PAGE_RENDER_DPI = 72

_DESCRIBE_PROMPT = (
    "This image belongs to a business that will send it to customers in chat. "
    "Write a short description that lets someone find it by search: what it "
    "shows (product, dish, service, banner, menu, place), its distinguishing "
    "details (colors, style, size), and all visible text verbatim (names, "
    "prices, dates, codes). Write in the language of the visible text, or "
    "Vietnamese when there is none. Plain text, at most 80 words. Do not guess "
    "anything that is not visible."
)

_READ_PAGES_PROMPT = (
    "These are pages of a business's PDF (menu, catalog, price list or "
    "brochure). List every product, dish or service you can read, one per "
    "line, as 'full name - price'. When a page lists cooking styles or "
    "variants under a heading, put the heading in each name (heading 'Cánh "
    "gà' with 'Chiên mắm' becomes 'Cánh gà chiên mắm'). Vietnamese name "
    "first when shown, then the English name if any; skip other languages. "
    "Add other useful visible text (opening hours, address, notes) on its own "
    "line. Do not guess anything that is not visible. Plain text only."
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
    return str(reply.content or "").strip() or None, _vision_usage(reply)


def _vision_usage(reply) -> TokenUsage:
    usage = getattr(reply, "usage_metadata", None) or {}
    return TokenUsage(
        input_tokens=usage.get("input_tokens", 0),
        output_tokens=usage.get("output_tokens", 0),
        total_tokens=usage.get("total_tokens", 0),
    )


def _pdf_pages(content: bytes) -> list[tuple[str, bytes | None]]:
    """Each page's text, plus a JPEG of the page when it has almost none."""
    pages: list[tuple[str, bytes | None]] = []
    with pymupdf.open(stream=content, filetype="pdf") as doc:
        for page in doc:
            text = page.get_text().strip()
            if len(text) >= PDF_PAGE_MIN_TEXT_CHARS:
                pages.append((text, None))
            else:
                image = page.get_pixmap(dpi=PDF_PAGE_RENDER_DPI).tobytes("jpeg", jpg_quality=70)
                pages.append(("", image))
    return pages


async def _read_page_batch(images: list[bytes]) -> tuple[str | None, TokenUsage | None]:
    content: list[dict] = [{"type": "text", "text": _READ_PAGES_PROMPT}]
    content += [
        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64.b64encode(image).decode()}"}}
        for image in images
    ]
    try:
        model = build_chat_model(AppVars.VISION_MODEL, temperature=0.0, max_tokens=2000)
        reply = await model.ainvoke([HumanMessage(content=content)])
    except Exception as exc:  # noqa: BLE001 (any provider error: skip these pages)
        logger.warning("media_pdf_read_failed", error=str(exc))
        return None, None
    return str(reply.content or "").strip() or None, _vision_usage(reply)


async def read_pdf_page_images(images: list[bytes]) -> tuple[list[str], TokenUsage | None]:
    """What the vision model reads on picture pages, batched and in parallel."""
    batches = [images[i:i + PDF_PAGES_PER_VISION_CALL] for i in range(0, len(images), PDF_PAGES_PER_VISION_CALL)]
    results = await asyncio.gather(*(_read_page_batch(batch) for batch in batches))
    usage: TokenUsage | None = None
    for _, batch_usage in results:
        usage = _add(usage, batch_usage)
    return [text for text, _ in results if text], usage


async def read_pdf(content: bytes) -> tuple[str, TokenUsage | None]:
    """The PDF's text in page order, picture pages read by the vision model."""
    pages = await asyncio.to_thread(_pdf_pages, content)
    images = [image for _, image in pages if image is not None][:PDF_MAX_VISION_PAGES]
    read, usage = await read_pdf_page_images(images) if images else ([], None)
    # The picture pages' text goes where the first picture page was: a menu's
    # intro, then its dishes, then a wine list keeps that order.
    parts: list[str] = []
    for text, image in pages:
        if image is None:
            parts.append(text)
        elif read:
            parts.extend(read)
            read = []
    return "\n\n".join(part for part in parts if part), usage


class MediaIngestService:
    def __init__(
        self,
        store: PgVectorStore | None = None,
        embed: Callable[[list[str]], Awaitable[tuple[list[list[float]], TokenUsage | None]]] | None = None,
        ingest_text: Callable[..., Awaitable[RAGIngestResponse]] | None = None,
    ):
        self.embedding_dimension = AppVars.RAG_EMBEDDING_DIMENSION
        self.embedding_model = AppVars.RAG_EMBEDDING_MODEL
        self.store = store or PgVectorStore(embedding_dimension=self.embedding_dimension)
        self._embed = embed or (lambda texts: aembed_documents_with_usage(get_embeddings_client(), texts))
        # A PDF's whole text is also chunked like a text item, so the agent can
        # answer from a 30-page menu whose description holds only its start.
        self._ingest_text = ingest_text or RAGIngestService(store=self.store).ingest_text

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
        pdf_text = ""
        if mime_type == MEDIA_PDF_TYPE:
            pdf_text, usage = await read_pdf(content)
        if not (description and description.strip()):
            if mime_type == MEDIA_PDF_TYPE:
                description = pdf_text
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
        usage = _add(usage, embed_usage)
        if pdf_text:
            chunked = await self._ingest_text(
                knowledge_item_id=knowledge_item_id, text=pdf_text, title=title, chatbot_ids=chatbot_ids,
            )
            usage = _add(usage, chunked.usage)
        return MediaIngestResponse(
            description=description,
            embedding_model=self.embedding_model,
            usage=usage,
        )
