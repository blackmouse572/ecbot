from typing import ClassVar, List
from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Column, Text, Integer
from sqlalchemy.types import UserDefinedType
from sqlmodel import SQLModel, Field

from eccho_ai.utils.date_utils import get_current_time
from eccho_ai.core.variables import AppVars


class VectorType(UserDefinedType):
    """Custom SQLAlchemy type for pgvector's `vector` column.

    Serialises Python ``list[float]`` ↔ pgvector literal format ``[x,y,…]``.
    No external ``pgvector`` package required — only the PostgreSQL extension.
    """

    cache_ok = True

    def __init__(self, dimensions: int) -> None:
        self.dimensions = dimensions

    def get_col_spec(self, **kw: object) -> str:
        return f"vector({self.dimensions})"

    def bind_processor(self, dialect: object):
        def process(value: List[float] | None) -> str | None:
            if value is None:
                return None
            return "[" + ",".join(str(v) for v in value) + "]"
        return process

    def result_processor(self, dialect: object, coltype: object):
        def process(value: str | None) -> List[float] | None:
            if value is None:
                return None
            # pgvector returns the literal string "[0.1,0.2,…]"
            return [float(x) for x in value.strip("[]").split(",")]
        return process


class KnowledgeItemChunks(SQLModel, table=True):
    __tablename__: ClassVar[str] = "knowledge_item_chunks"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=get_current_time)

    # FK → knowledge_base_items.id
    knowledge_base_item_id: UUID = Field(
        foreign_key="knowledge_base_items.id",
        index=True,
        nullable=False,
    )

    content: str = Field(sa_column=Column(Text, nullable=False))

    embedding: List[float] | None = Field(
        default=None,
        sa_column=Column(VectorType(AppVars.EMBEDDING_DIMENSIONS), nullable=True)
    )

    # Position within the parent document
    chunk_index: int = Field(sa_column=Column(Integer, nullable=False))

    # Source page number (for FILE/PDF items)
    page_index: int | None = Field(default=None)

    # Source URL (for URL items or individual crawled pages)
    url: str | None = Field(default=None)
