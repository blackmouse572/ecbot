from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field

from eccho_ai.llm.usage import TokenUsage


class RAGIngestResponse(BaseModel):
    document_id: UUID
    filename: str
    stored_path: str
    mime_type: str | None = None
    content_chars: int = 0
    chunk_count: int = 0
    chunk_size: int
    chunk_overlap: int
    embedding_model: str
    embedding_dimension: int
    status: str = "COMPLETED"
    # Embedding tokens, for apps/api to meter (#250); None when not reported.
    usage: TokenUsage | None = None
    # Website items only: pages read (apps/api charges them to the plan), the
    # start page's title and the start of the text, shown to the owner.
    pages_crawled: int = 0
    page_title: str | None = None
    preview: str | None = None


class RAGDocumentResponse(BaseModel):
    document_id: UUID = Field(alias="id")
    filename: str
    stored_path: str
    mime_type: str | None = None
    content_chars: int = 0
    chunk_count: int = 0
    chunk_size: int
    chunk_overlap: int
    embedding_model: str
    embedding_dimension: int
    status: str
    error_message: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime


class RAGRetrieveRequest(BaseModel):
    chatbot_id: str
    query: str


class RAGUrlIngestRequest(BaseModel):
    url: str
    knowledge_item_id: str
    # The knowledge item's name, shown to operators as the source (#204).
    title: str | None = None
    chatbot_ids: list[str] = Field(default_factory=list)
    knowledge_base_id: str | None = None
    chunk_size: int | None = None
    chunk_overlap: int | None = None
    only_main_content: bool = True
    max_age: int | None = 172800000
    parsers: list[str] = Field(default_factory=lambda: ["pdf"])
    # 1 reads only this page; more follows same-site links up to that many.
    max_pages: int = Field(default=1, ge=1, le=50)


class RAGTextIngestRequest(BaseModel):
    knowledge_item_id: str
    text: str
    title: str
    chatbot_ids: list[str] = Field(default_factory=list)
    knowledge_base_id: str | None = None
    chunk_size: int | None = None
    chunk_overlap: int | None = None


class RAGChatbotLinksRequest(BaseModel):
    chatbot_ids: list[str] = Field(default_factory=list)
