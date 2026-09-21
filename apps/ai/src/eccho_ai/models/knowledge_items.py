from typing import ClassVar, Dict, Any
from datetime import datetime
from uuid import UUID, uuid4
from enum import Enum

from sqlalchemy import Column, JSON, Enum as SAEnum
from sqlmodel import SQLModel, Field

from eccho_ai.utils.date_utils import get_current_time


class KnowledgeBaseItemType(str, Enum):
    FILE = "FILE"
    URL = "URL"
    TEXT = "TEXT"


class KnowledgeBaseItemStatus(str, Enum):
    DRAFT = "DRAFT"
    READY = "READY"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class KnowledgeItems(SQLModel, table=True):
    __tablename__: ClassVar[str] = "knowledge_base_items"

    # Base fields (mirrors DatabaseEntityBase column names)
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    deleted: bool = Field(default=False)
    created_at: datetime = Field(default_factory=get_current_time)
    updated_at: datetime | None = Field(default=None)
    deleted_at: datetime | None = Field(default=None)
    created_by_id: UUID | None = Field(default=None, index=True)
    updated_by_id: UUID | None = Field(default=None, index=True)
    deleted_by_id: UUID | None = Field(default=None, index=True)

    # Knowledge item specific fields
    knowledge_base_id: UUID = Field(index=True)
    type: KnowledgeBaseItemType = Field(
        sa_column=Column(SAEnum(KnowledgeBaseItemType), nullable=False)
    )
    title: str = Field(nullable=False)
    content: str | None = Field(default=None)
    folder_id: UUID | None = Field(default=None, index=True)

    # metadata_ as Python name to avoid collision with SQLAlchemy's built-in
    # `metadata` attribute; the DB column is named "metadata".
    metadata_: Dict[str, Any] | None = Field(default=None, sa_column=Column("metadata", JSON))

    # Attachment stored as individual flat columns matching the DB schema
    attachment_bucket: str | None = Field(default=None)
    attachment_key: str | None = Field(default=None)
    attachment_completed_url: str | None = Field(default=None)
    attachment_cdn_url: str | None = Field(default=None)
    attachment_mime: str | None = Field(default=None)
    attachment_extension: str | None = Field(default=None)
    attachment_size: float | None = Field(default=None)

    status: KnowledgeBaseItemStatus = Field(
        default=KnowledgeBaseItemStatus.DRAFT,
        sa_column=Column(SAEnum(KnowledgeBaseItemStatus), nullable=False)
    )
    error_message: str | None = Field(default=None)
    processed_at: datetime | None = Field(default=None)

    @property
    def has_attachment(self) -> bool:
        return self.attachment_key is not None
