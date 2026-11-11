from datetime import datetime
from typing import ClassVar
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel

from eccho_ai.utils.date_utils import get_current_time


class CustomerMarketingStates(SQLModel, table=True):
    """Mirror of the customer_marketing_states table maintained by apps/api.

    Read only here, for the customer-context block; the agent writes through
    the set_marketing_permission tool.
    """

    __tablename__: ClassVar[str] = "customer_marketing_states"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    workspace_id: UUID = Field(index=True)
    customer_id: UUID = Field(index=True, unique=True)
    stage: str = Field(default="NEW")
    permission: str = Field(default="PENDING")
    permission_until: datetime | None = Field(default=None)
    hostile: bool = Field(default=False)
    consent_asked_at: datetime | None = Field(default=None)
    last_inbound_at: datetime | None = Field(default=None)

    deleted: bool = Field(default=False)
    created_at: datetime = Field(default_factory=get_current_time)
    updated_at: datetime | None = Field(default=None)
    deleted_at: datetime | None = Field(default=None)
