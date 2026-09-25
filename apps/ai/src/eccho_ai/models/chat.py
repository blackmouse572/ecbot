from typing import (
    ClassVar,
    Dict,
    Any
)
from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy.orm import relationship
from sqlmodel import (
    SQLModel,
    Field,
    Column,
    JSON,
    Relationship,
)
from sqlalchemy.dialects.postgresql import ARRAY, TEXT
from sqlalchemy import DateTime

from eccho_ai.utils.date_utils import get_current_time


class Chatbots(SQLModel, table=True):
    '''
    Represents a chatbot configuration in the system.
    Synced from `apps/api/src/modules/chatbot/repository/entities/chatbot.entity.ts`
    '''
    __tablename__: ClassVar[str] = "chatbots"

    # Metadata
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    deleted: bool = Field(default=False)
    created_at: datetime = Field(default_factory=get_current_time, sa_type=DateTime(timezone=True))
    updated_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    deleted_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    created_by_id: UUID | None = Field(default=None)
    updated_by_id: UUID | None = Field(default=None)
    deleted_by_id: UUID | None = Field(default=None)

    # Information
    name: str = Field(default=...)
    avatar: str | None = Field(default=None)
    general_knowledge: str | None = Field(default=None)
    workspace_id: UUID = Field(default=...)
    typing_indicator: bool = Field(default=True)
    auto_read: bool = Field(default=True)
    status: str = Field(default="active")
    type: str = Field(default="beauty")

    # Configuration
    primary_language: str = Field(default="en")
    defered_language: str | None = Field(default=None)
    welcome_message: str | None = Field(default=None)
    fallback_message: str | None = Field(default=None)
    max_tokens: int | None = Field(default=None)
    model_provider: str = Field(default=...)
    model_text_name: str = Field(default=...)
    model_temperature: float = Field(default=1.0)
    handoff_fallback_threshold: int = Field(default=3)
    handoff_message: str | None = Field(default=None)
    handoff_keywords: list[str] | None = Field(
    default=None,
    sa_column=Column(ARRAY(TEXT).with_variant(JSON(), "sqlite")),
)

    # Guardrail configuration
    guardrail_enabled: bool = Field(default=False)
    guardrail_model_enabled: bool = Field(default=False)
    guardrail_custom_instruction: str | None = Field(default=None)
    guardrail_escalate_on_block: bool = Field(default=True)

    # Proactive followups (#140)
    followup_rules: str | None = Field(default=None)

    # Relationships
    chatbot_tools: list["ChatbotTools"] = Relationship(back_populates="chatbot")
    chatbot_skills: list["ChatbotSkills"] = Relationship(back_populates="chatbot")


class ChatbotTools(SQLModel, table=True):
    '''
    Represents the association between chatbots and tools.
    Synced from `apps/api/src/modules/tool/repository/entities/chatbot-tool.entity.ts`
    '''
    __tablename__: ClassVar[str] = "chatbot_tools"

    # Metadata
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    deleted: bool = Field(default=False)
    created_at: datetime = Field(default_factory=get_current_time, sa_type=DateTime(timezone=True))
    updated_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    deleted_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    created_by_id: UUID | None = Field(default=None)
    updated_by_id: UUID | None = Field(default=None)
    deleted_by_id: UUID | None = Field(default=None)

    # Information
    chatbot_id: UUID = Field(default=..., foreign_key="chatbots.id")
    tool_id: UUID = Field(default=..., foreign_key="tools.id")
    enabled: bool = Field(default=True)
    enabled_actions: list[Any] | None = Field(default=None, sa_column=Column(JSON))

    # Relationships
    chatbot: "Chatbots" = Relationship(back_populates="chatbot_tools")
    tool: "Tools" = Relationship(back_populates="chatbot_tools")


class Tools(SQLModel, table=True):
    '''
    Represents a tool configuration in the system.
    Synced from `apps/api/src/modules/tool/repository/entities/tool.entity.ts`
    '''
    __tablename__: ClassVar[str] = "tools"

    # Metadata
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    deleted: bool = Field(default=False)
    created_at: datetime = Field(default_factory=get_current_time, sa_type=DateTime(timezone=True))
    updated_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    deleted_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    created_by_id: UUID | None = Field(default=None)
    updated_by_id: UUID | None = Field(default=None)
    deleted_by_id: UUID | None = Field(default=None)

    # Information
    workspace_id: UUID = Field(default=...)
    kind: str = Field(default=...)
    display_name: str = Field(default=...)
    slug: str = Field(default=...)
    description: str = Field(default=None)
    status: str = Field(default="ACTIVE")
    source: Dict[str, Any] | None = Field(default=None, sa_column=Column(JSON))

    # Configuration HTTP tool
    http_method: str | None = Field(default=None)
    http_url: str | None = Field(default=None)
    http_input_schema: Dict[str, Any] | None = Field(default=None, sa_column=Column(JSON))
    http_headers: Dict[str, str] | None = Field(default=None, sa_column=Column(JSON))
    http_auth: Dict[str, Any] | None = Field(default=None, sa_column=Column(JSON))
    http_credential: str | None = Field(default=None)
    timeout_ms: int = Field(default=10000)
    max_retries: int = Field(default=1)

    # Configuration MCP tool
    mcp_provider: str | None = Field(default=None)
    mcp_server_url: str | None = Field(default=None)
    mcp_auth: Dict[str, Any] | None = Field(default=None, sa_column=Column(JSON))
    mcp_credential: str | None = Field(default=None)
    discovered_actions: list[Any] | None = Field(default=None, sa_column=Column(JSON))
    discovery_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))

    # Relationships
    chatbot_tools: list["ChatbotTools"] = Relationship(back_populates="tool")


class Skills(SQLModel, table=True):
    '''
    Represents an agent skill: procedural instructions loaded on-demand.
    Instructions body lives on S3; DB holds only metadata + the S3 pointer.
    Synced from `apps/api/src/modules/skill/repository/entities/skill.entity.ts`
    '''
    __tablename__: ClassVar[str] = "skills"

    # Metadata
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    deleted: bool = Field(default=False)
    created_at: datetime = Field(default_factory=get_current_time, sa_type=DateTime(timezone=True))
    updated_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    deleted_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    created_by_id: UUID | None = Field(default=None)
    updated_by_id: UUID | None = Field(default=None)
    deleted_by_id: UUID | None = Field(default=None)

    # Information
    workspace_id: UUID | None = Field(default=None)  # null = builtin template (Ecbot)
    name: str = Field(default=...)
    slug: str = Field(default=...)
    description: str | None = Field(default=None)
    status: str = Field(default="ACTIVE")

    # S3 pointer to the instructions body (embedded AwsS3Entity on the api side)
    s3_bucket: str | None = Field(default=None)
    s3_key: str | None = Field(default=None)

    # Relationships
    chatbot_skills: list["ChatbotSkills"] = Relationship(back_populates="skill")


class ChatbotSkills(SQLModel, table=True):
    '''
    Association between chatbots and skills.
    Synced from `apps/api/src/modules/skill/repository/entities/chatbot-skill.entity.ts`
    '''
    __tablename__: ClassVar[str] = "chatbot_skills"

    # Metadata
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    deleted: bool = Field(default=False)
    created_at: datetime = Field(default_factory=get_current_time, sa_type=DateTime(timezone=True))
    updated_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    deleted_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    created_by_id: UUID | None = Field(default=None)
    updated_by_id: UUID | None = Field(default=None)
    deleted_by_id: UUID | None = Field(default=None)

    # Information
    chatbot_id: UUID = Field(default=..., foreign_key="chatbots.id")
    skill_id: UUID = Field(default=..., foreign_key="skills.id")
    enabled: bool = Field(default=True)

    # Relationships
    chatbot: "Chatbots" = Relationship(back_populates="chatbot_skills")
    skill: "Skills" = Relationship(back_populates="chatbot_skills")