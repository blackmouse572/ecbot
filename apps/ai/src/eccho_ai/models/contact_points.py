from typing import ClassVar
from datetime import datetime
from uuid import UUID, uuid4

from sqlmodel import SQLModel, Field

from eccho_ai.utils.date_utils import get_current_time


class ContactPoints(SQLModel, table=True):
    """Mirror of the contact_points table maintained by apps/api."""

    __tablename__: ClassVar[str] = "contact_points"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    workspace_id: UUID = Field(index=True)
    customer_id: UUID = Field(index=True)
    platform: str = Field(default=...)
    external_sender_id: str = Field(default=...)
    display_sender_name: str | None = Field(default=None)
    sender_avatar: str | None = Field(default=None)
    fetched_at: datetime | None = Field(default=None)

    deleted: bool = Field(default=False)
    created_at: datetime = Field(default_factory=get_current_time)
    updated_at: datetime | None = Field(default=None)
    deleted_at: datetime | None = Field(default=None)
