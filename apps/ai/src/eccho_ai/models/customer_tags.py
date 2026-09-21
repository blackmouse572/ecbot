from typing import ClassVar
from datetime import datetime
from uuid import UUID, uuid4

from sqlmodel import SQLModel, Field

from eccho_ai.utils.date_utils import get_current_time


class CustomerTags(SQLModel, table=True):
    """Mirror of the customer_tags table (workspace tag catalog)."""

    __tablename__: ClassVar[str] = "customer_tags"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    workspace_id: UUID = Field(index=True)
    name: str = Field(default=...)
    emoji: str | None = Field(default=None)
    description: str | None = Field(default=None)
    triggers_handoff: bool = Field(default=False)

    deleted: bool = Field(default=False)
    created_at: datetime = Field(default_factory=get_current_time)
    updated_at: datetime | None = Field(default=None)
    deleted_at: datetime | None = Field(default=None)
