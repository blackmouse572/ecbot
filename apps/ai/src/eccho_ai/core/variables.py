import os
import re
from pathlib import Path
from typing import Literal
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

from pydantic import Field, SecretStr, ValidationInfo, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


# App root = the dir containing `src/` (…/apps/ai). This file lives at
# src/eccho_ai/configs/variables.py, so walk up 4 levels. `.env` is optional —
# in containers/CI env vars are injected directly.
_APP_ROOT = Path(__file__).resolve().parents[3]


class _AppVars(BaseSettings):
    """
    Application variables loaded from environment variables or .env file
    """
    model_config = SettingsConfigDict(
        env_file=_APP_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Generals
    ENV: Literal["development", "staging", "production"] = "development"
    LOG_LEVEL: str = "INFO"
    MAX_CONCURRENT_REQUESTS: int = 100

    # Set only by the enterprise image; unset uses the bundled AGENT.md.
    AGENT_PROMPT_PATH: Path | None = Field(default=None)

    # LLMs - optional, depends on provider
    ANTHROPIC_API_KEY: SecretStr = Field(default=SecretStr(""))
    OPENAI_API_KEY: SecretStr = Field(default=SecretStr(""))
    DEEPSEEK_API_KEY: SecretStr = Field(default=SecretStr(""))
    FIRECRAWL_API_KEY: SecretStr = Field(default=SecretStr(""))
    OPENROUTER_API_KEY: SecretStr = Field(default=SecretStr(""))
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"

    # Postgres - required
    POSTGRES_URL: SecretStr
    RAG_POSTGRES_URL: SecretStr | None = Field(default=None)

    # Tool registry callback (apps/api). Required only when executing workspace tools.
    AI_SERVICE_API_KEY: SecretStr = Field(default=SecretStr(""))
    AI_SERVICE_API_SECRET: SecretStr = Field(default=SecretStr(""))
    API_BASE_URL: str = Field(default="http://localhost:3000")

    # Langsmith tracing - optional
    LANGSMITH_TRACING: bool = Field(default=False)
    LANGSMITH_ENDPOINT: str = "https://api.smith.langchain.com"
    LANGSMITH_API_KEY: SecretStr = Field(default=SecretStr(""))
    LANGSMITH_PROJECT: str = "eccho"

    # Embedding (chunking job) - full OpenRouter model id, same gateway as the chat models
    EMBEDDING_MODEL: str = "google/gemini-embedding-001"
    EMBEDDING_DIMENSIONS: int = 768
    EMBEDDING_BATCH_SIZE: int = 20
    EMBEDDING_TIMEOUT_SECONDS: float = 30.0

    # Chunking pipeline
    CHUNK_SIZE: int = 512
    CHUNK_OVERLAP: int = 50
    CRAWL_MAX_DEPTH: int = 3
    CRAWL_MAX_PAGES: int = 50
    CRAWL_SAME_DOMAIN_ONLY: bool = True

    # MinIO / S3 (used by the jobs service to download FILE attachments)
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: SecretStr = Field(default=SecretStr(""))
    MINIO_SECRET_KEY: SecretStr = Field(default=SecretStr(""))
    MINIO_SECURE: bool = False

    # RAG ingest/retrieval
    RAG_LOCAL_STORAGE_DIR: str = "storage/rag_uploads"
    RAG_CHUNK_SIZE: int = 1000
    RAG_CHUNK_OVERLAP: int = 150
    RAG_EMBEDDING_MODEL: str = "google/gemini-embedding-001"
    RAG_EMBEDDING_DIMENSION: int = 768
    RAG_RETRIEVAL_ENABLED: bool = True
    RAG_RETRIEVAL_TOP_K: int = 5
    RAG_RETRIEVAL_CANDIDATE_LIMIT: int = 24
    RAG_RETRIEVAL_CONTEXT_MAX_CHARS: int = 6000
    RAG_RETRIEVAL_MIN_SCORE: float = 0.05
    # When False, skip the cross-encoder reranker (no sentence-transformers/torch
    # load) and rank by the hybrid similarity/FTS score. Set False on small instances.
    RAG_RERANK_ENABLED: bool = True
    RAG_RERANK_CROSS_ENCODER_MODEL: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"
    RAG_RERANK_BATCH_SIZE: int = 16

    @property
    def API_TOOL_EXECUTION_COMMAND_URL(self) -> str:
        '''Construct the full URL for the API tool execution command'''
        return f"{self.API_BASE_URL}/api/v1/system/internal/tool/execute"

    # Auxiliary OpenRouter chat models (guardrail model-tier + customer classifier/summary).
    GUARDRAIL_MODEL: str = "google/gemini-2.5-flash"
    CLASSIFIER_MODEL: str = "google/gemini-2.5-flash"
    CUSTOMER_CLASSIFIER_TEMPERATURE: float = 0.1
    # Describes inbound customer images (must accept image input).
    VISION_MODEL: str = "google/gemini-2.5-flash"
    VISION_MAX_IMAGES: int = 4
    # Catalog images from the operator instructions shown alongside, so the
    # description can name the product a customer photo shows.
    VISION_MAX_CATALOG_IMAGES: int = 6
    # KEEP IN SYNC with apps/api MESSAGE_MEDIA_MAX_BYTES (what it stores).
    VISION_MAX_IMAGE_BYTES: int = 5 * 1024 * 1024
    # OpenRouter image-generation model.
    IMAGE_MODEL: str = "google/gemini-2.5-flash-image"

    # ── Caching (#318) ────────────────────────────────────────────────────────
    # Guardrail tier-2 runs at temperature 0.0 with a fixed system prompt, so its
    # verdicts are deterministic and safe to memoize. Scoped to that one client —
    # the chatbot's own model is never cached. 0 disables.
    GUARDRAIL_CACHE_MAXSIZE: int = 1000
    # Repeated RAG queries re-embed the same normalized text otherwise.
    EMBEDDING_CACHE_MAXSIZE: int = 512
    EMBEDDING_CACHE_TTL_SECONDS: float = 300.0
    # Backstop only — apps/api invalidates explicitly on chatbot/tool/skill edits.
    # 0 disables the cache (every request re-queries).
    CHATBOT_CACHE_TTL_SECONDS: float = 60.0

    @field_validator("POSTGRES_URL", "RAG_POSTGRES_URL", mode="after")
    @classmethod
    def ensure_asyncpg_driver(
        cls,
        v: SecretStr | None,
        info: ValidationInfo,
    ) -> SecretStr | None:
        '''Ensure that Postgres URLs use asyncpg and are compatible with SQLAlchemy.'''
        if v is None:
            return v
        url_str = v.get_secret_value()
        if not url_str.strip():
            if info.field_name == "RAG_POSTGRES_URL":
                return None
            raise ValueError(f"{info.field_name} cannot be empty")

        url_str = re.sub(r"^postgres(?:ql)?(?:\+[a-zA-Z0-9_]+)?://", "postgresql+asyncpg://", url_str)

        parsed = urlparse(url_str)
        params = parse_qs(parsed.query, keep_blank_values=True)
        params.pop("channel_binding", None)
        if "sslmode" in params:
            params["ssl"] = params.pop("sslmode")
        clean_query = urlencode({k: v[0] for k, v in params.items()})
        clean_url = urlunparse(parsed._replace(query=clean_query))

        return SecretStr(clean_url)

    @property
    def is_production(self) -> bool:
        '''Convenience property to check if the app is running in production environment'''
        return self.ENV == "production"

    def debug_app_vars(self):
        '''Print all application variables for debugging purposes, hiding sensitive information'''
        print("=" * 50)
        for field_name, field_value in self.model_dump().items():
            if isinstance(field_value, SecretStr):
                print(f"{field_name}: {'*' * 8} (hidden)")
            else:
                print(f"{field_name}: {field_value}")
        print("=" * 50)

    def __init__(self, **values):
        super().__init__(**values)
        # Sync with os environment
        for key, value in self.model_dump().items():
            if key not in os.environ:
                # Handle secret values
                if isinstance(value, SecretStr):
                    os.environ[key] = value.get_secret_value()
                # Handle boolean values
                elif isinstance(value, bool):
                    os.environ[key] = str(value).lower()
                # Handle other types (int, str, etc.)
                elif value is not None:
                    os.environ[key] = str(value)


AppVars = _AppVars()

if AppVars.ENV == "development":
    AppVars.debug_app_vars()
