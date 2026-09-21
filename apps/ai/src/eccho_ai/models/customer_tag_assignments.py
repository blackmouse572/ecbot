from typing import ClassVar
from datetime import datetime
from uuid import UUID, uuid4

from sqlmodel import SQLModel, Field

from eccho_ai.utils.date_utils import get_current_time


class CustomerTagAssignments(SQLModel, table=True):
    """Mirror of the customer_tag_assignments table (customer→tag join)."""

    __tablename__: ClassVar[str] = "customer_tag_assignments"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    customer_id: UUID = Field(index=True)
    tag_id: UUID = Field(index=True)

    deleted: bool = Field(default=False)
    created_at: datetime = Field(default_factory=get_current_time)
    updated_at: datetime | None = Field(default=None)
    deleted_at: datetime | None = Field(default=None)
