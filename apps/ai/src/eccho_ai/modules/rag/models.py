from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


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
    chatbot_ids: list[str] = Field(default_factory=list)
    knowledge_base_id: str | None = None
    chunk_size: int | None = None
    chunk_overlap: int | None = None
    only_main_content: bool = True
    max_age: int | None = 172800000
    parsers: list[str] = Field(default_factory=lambda: ["pdf"])


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
