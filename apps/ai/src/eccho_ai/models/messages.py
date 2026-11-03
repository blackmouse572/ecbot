from datetime import datetime
from typing import Any, ClassVar
from uuid import UUID

from sqlalchemy import DateTime
from sqlmodel import JSON, Column, Field, SQLModel


class Messages(SQLModel, table=True):
    """Read-only mirror of the messages table.

    Synced from `apps/api/src/modules/conversation/repository/entities/message.entity.ts`.
    apps/ai reads it only to steer a running turn (see llm/agents/steering.py).
    """

    __tablename__: ClassVar[str] = "messages"

    id: UUID = Field(primary_key=True)
    conversation_id: UUID = Field(index=True)
    direction: str = Field(default=...)
    text: str | None = Field(default=None)
    attachments: list[dict[str, Any]] | None = Field(default=None, sa_column=Column(JSON, nullable=True))
    date_sent: datetime = Field(sa_type=DateTime(timezone=True))
    created_at: datetime = Field(sa_type=DateTime(timezone=True))
    deleted: bool = Field(default=False)
    deleted_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
