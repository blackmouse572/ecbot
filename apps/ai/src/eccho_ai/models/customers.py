from typing import Any, ClassVar
from datetime import datetime
from uuid import UUID, uuid4

from sqlmodel import SQLModel, Field, Column, JSON

from eccho_ai.utils.date_utils import get_current_time


class Customers(SQLModel, table=True):
    """Mirror of the customers table maintained by apps/api.

    apps/ai only reads from this table (for the bounded customer-context block);
    all writes go back through apps/api over HTTP.
    """

    __tablename__: ClassVar[str] = "customers"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    workspace_id: UUID = Field(index=True)
    name: str | None = Field(default=None)
    phone: str | None = Field(default=None)
    email: str | None = Field(default=None)
    language: str | None = Field(default=None)
    metadata_: dict[str, Any] | None = Field(
        default=None,
        sa_column=Column("metadata", JSON, nullable=True),
    )
    profile_summary: str | None = Field(default=None)
    notes: str | None = Field(default=None)
    merged_into_customer_id: UUID | None = Field(default=None, index=True)

    deleted: bool = Field(default=False)
    created_at: datetime = Field(default_factory=get_current_time)
    updated_at: datetime | None = Field(default=None)
    deleted_at: datetime | None = Field(default=None)
