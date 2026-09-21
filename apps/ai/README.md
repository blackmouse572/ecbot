# AI Agent Instructions & Repository Context

**CRITICAL INSTRUCTION FOR AI AGENTS:** Read this entire document before implementing features, fixing bugs, or investigating issues. It contains the essential context, structure, and conventions for this repository.

## 1. Step-by-Step Implementation Workflow

Whenever you are given a task, execute it using the following sequence:

1. **Scan Structure:** Understand where the change belongs.
2. **Check Models/Schemas:** Review existing models in `models/` or `modules/<name>/models/` before creating new ones.
3. **Brainstorm & Propose:** Briefly outline your approach before writing extensive code.
4. **Implement Code:** Write clean, modular code adhering to the conventions below.
5. **Run Tests:** Write and execute tests (`uv run pytest -m "not integration"`). Prefer end-to-end testing.
6. **Run Deploy Test:** Verify build integrity via Docker (`docker build ...` and `docker run ...`).
7. **Update Docs:** Update this file with new folder structures or APIs.
8. **Commit Code:** Use `git add apps/ai && git commit -m "<implement summary>"`.

## 2. App Conventions & Rules of Engagement

**General Coding Rules:**

- Focus on the 80/20 rule: deliver high-impact, functional code without unnecessary over-engineering.
- Do not hallucinate imports. Only use standard libraries or dependencies explicitly listed in `pyproject.toml`.
- Logging: always use the custom structured logger.
  - Usage: `from eccho_ai.core.app_logger import get_logger`, then `logger = get_logger(__name__)`.
- Use Python type hints for function arguments and return types.

**Schema & Model Definition:**

- `TypedDict`: use for simple dictionary types.
- `Pydantic`: use for application API schema requests, responses, or anything requiring strong validation.
- `SQLModel`: use exclusively for database schemas/entities.
  - Location: define in `src/eccho_ai/models/`.
  - Constraint: this application only reads from the core application database; these models should not create/update the actual DB schema.
  - JSON fields: use `JSON` for lists/dicts.
  - Datetimes: use `sa_type=DateTime(timezone=True)`.
  - IDs: use `UUID` for ID-related fields.
  - Performance: prefer one-round trips for fetching data. Use `joinedload` and SQLModel relationships.
- If a model is synced from `apps/api` or another source, add a comment referencing its origin.

**Prebuilt providers & infra:**

- `build_chat_model` (`llm/providers/chat_model.py`): build a LangChain chat model (OpenRouter) from config — stateless, cached.
- `get_google_provider()` (`llm/providers/google.py`): cached image-generation client (OpenRouter `/images`).
- `get_embeddings_client()` (`llm/retrievers/embeddings.py`): cached embeddings client (OpenRouter `/embeddings`), shared by RAG ingest/retrieval and the chunking job.
- `PostgresRepo` (`core/postgres.py`): common DB access with generic typing.

## 3. Folder Structure & Important Files

Root is inside `apps/ai/`.

`src/` layout, single package `eccho_ai`, managed by **uv** (editable install).

```text
apps/ai/
+-- .env.example              # Env variables. Keep synced with core/variables.py
+-- Dockerfile                # uv-based; entry = eccho_ai.main:app
+-- pyproject.toml            # deps + [project.scripts] eccho-ai + pytest config
+-- uv.lock
+-- src/eccho_ai/
|   +-- main.py               # FastAPI app factory + `run()` console entry
|   +-- core/                 # cross-cutting infra
|   |   +-- variables.py      # App variables (pydantic-settings)
|   |   +-- app_logger.py     # Structlog definition
|   |   +-- app_configs.py    # Swagger config
|   |   +-- postgres.py       # PostgresRepo (generic DB access)
|   |   +-- api_client.py     # apps/api HTTP client
|   +-- llm/                  # shared LangChain layer
|   |   +-- providers/        # chat_model (build_chat_model) + google (images)
|   |   +-- agents/           # shared agent + ChatbotConfigMiddleware (per-request config)
|   |   +-- tools/            # operator_tools, system_tools, skills (load_skill)
|   |   +-- prompts/          # AGENT.md (package data) + loader (render_system_prompt)
|   |   +-- retrievers/       # rag retrieval, pgvector store, text processing, pdf/web readers
|   |   +-- guardrails/       # content (input/output policy) + secrets (scan)
|   +-- modules/              # feature routers + orchestration
|   |   +-- chat/             # chat/stream endpoints, services, customer context
|   |   +-- customer/         # customer classification/context endpoints
|   |   +-- rag/              # RAG ingest endpoints + orchestration
|   +-- jobs/                 # in-process ingest/chunking heartbeat
|   +-- models/               # SQLModel schemas + app response models
|   +-- middlewares/  utils/
+-- tests/                    # pytest (imports eccho_ai.*)
+-- eval/                     # datasets / cases / runners (scaffold — see eval/README.md)
+-- storage/                  # runtime RAG uploads (gitignored)
```

## 4. Common Scripts

Run these commands from `apps/ai/` unless otherwise specified:

- Install/sync deps: `uv sync`
- Run dev server: `uv run uvicorn eccho_ai.main:app --reload` (or `pnpm dev`)
- Run unit tests: `uv run pytest -m "not integration"` (integration needs a live Postgres)
- Build Docker image: `docker build -t eccho-ai .`
- Run Docker container: `docker run -d --rm --name eccho-ai-c -p 8000:8000 --env-file .env eccho-ai`
- Verify: `docker logs eccho-ai-c` or `curl localhost:8000/health`

## 5. Current APIs

- `GET /health` - Health check endpoint.
- `POST /api/chat/message` - Synchronous chat endpoint.
- `POST /api/chat/stream` - SSE chat endpoint.
- `DELETE /api/chat/chatbot-cache/{chatbot_id}` - Drop this chatbot's cached config. Called by `apps/api` when the chatbot's config, tools or skills change.
- Customer endpoints are registered from `modules/customer/routers.py`.

The AI chat service is stateless for durable conversation storage. `apps/api` is the source of truth for conversation history and injects prior turns through `ChatRequest.history`. The AI service injects per-turn RAG context into the current prompt only.

### Chat Stream Events

Streaming responses from `/api/chat/stream` use the **Vercel AI SDK v5 UI Message Stream protocol** (typed parts).

Response header: `x-vercel-ai-ui-message-stream: v1`

Supported part types (streamed as `data: <serialized-part>\n\n`):

- **Flow control:** `start`, `start-step`, `finish-step`, `finish`
- **Text deltas:** `text-start`, `text-delta`, `text-end`
- **Reasoning (model reasoning/CoT):** `reasoning-start`, `reasoning-delta`, `reasoning-end`
- **Tool calls:** `tool-input-available` (tool name + args), `tool-output-available` (tool result)
- **Metadata:** `source-url` (RAG citations), `message-metadata` (token usage, latency)
- **Guardrails (custom):** `data-guardrail` (content policy filter results)
- **Errors & termination:** `error` (stream-side failure), `data: [DONE]` (final terminator)

The `show tool activity` archetype toggle controls whether `reasoning-*` and `tool-*` parts are forwarded to clients or stripped per channel.

### Agent archetypes & modular prompt

The system prompt in `llm/prompts/AGENT.md` is being split into an **always-on security/quality core** (untrusted-input framing, accuracy, precedence, persona — never toggle-able) plus **conditional blocks** (identity concealment, customer-data tools, escalation) assembled per chatbot from four behavioral toggles (customer tracking, human handoff, identity concealment, show tool activity). Customer/CRM `SYSTEM_TOOLS` are filtered by the customer-tracking toggle. Config flows in via the `Chatbots` SQLModel (shared DB), not the request DTO. See [ADR-0008](../../docs/adr/0008-agent-archetypes.md) / [ADR-0009](../../docs/adr/0009-agent-templates.md).

### RAG / Knowledge Base Ingest

Configured with the `/api/rag` prefix.

- `POST /api/rag/ingest/upload`
  - Uploads a `pdf`, `docx`, or `txt` document, normalizes text, chunks it, embeds chunks, and stores vectors in PostgreSQL pgvector.
  - Payload: multipart form data with `file`, optional `chunk_size`, optional `chunk_overlap`, optional `knowledge_base_id`, optional `chatbot_id`.

- `POST /api/rag/ingest/url`
  - Scrapes a website URL through Firecrawl, extracts markdown content, normalizes text, chunks it, embeds chunks, and stores vectors in PostgreSQL pgvector.
  - Payload: JSON with `url`, optional `chunk_size`, optional `chunk_overlap`, optional `knowledge_base_id`, optional `chatbot_id`, optional `only_main_content`, optional `max_age`, and optional `parsers`.

- `GET /api/rag/documents`
  - Lists recently ingested RAG documents and processing status.

- `GET /api/rag/chatbots`
  - Lists chatbot IDs and model settings for local RAG testing.

- `POST /api/rag/retrieve`
  - Debug endpoint for retrieving knowledge-base context before the chat agent answers.
  - Response includes formatted context, chunks, rerank scores, and `sources`.

Chat requests automatically run RAG retrieval for completed documents attached to the chatbot through `rag_documents.metadata.chatbot_id`. Retrieval uses PostgreSQL full-text search and pgvector cosine similarity, then reranks candidates with a cross-encoder model before injecting context into the user prompt. When an answer uses RAG context, the assistant is instructed to cite inline source IDs such as `[KB-1]`; the backend also appends a final `Nguồn:` section if the model omits it.

### RAG Environment Variables

```env
RAG_POSTGRES_URL=
RAG_LOCAL_STORAGE_DIR=storage/rag_uploads
RAG_CHUNK_SIZE=1000
RAG_CHUNK_OVERLAP=150
RAG_EMBEDDING_MODEL=google/gemini-embedding-001
RAG_EMBEDDING_DIMENSION=768
RAG_RETRIEVAL_ENABLED=true
RAG_RETRIEVAL_TOP_K=5
RAG_RETRIEVAL_CANDIDATE_LIMIT=24
RAG_RETRIEVAL_CONTEXT_MAX_CHARS=6000
RAG_RETRIEVAL_MIN_SCORE=0.05
RAG_RERANK_CROSS_ENCODER_MODEL=cross-encoder/ms-marco-MiniLM-L-6-v2
RAG_RERANK_BATCH_SIZE=16
FIRECRAWL_API_KEY=
```

### Caching Environment Variables

```env
GUARDRAIL_CACHE_MAXSIZE=1000
EMBEDDING_CACHE_MAXSIZE=512
EMBEDDING_CACHE_TTL_SECONDS=300
CHATBOT_CACHE_TTL_SECONDS=60
```

- `GUARDRAIL_CACHE_MAXSIZE` — bounds the guardrail classifier's response cache. Scoped to that one client (it runs at `temperature=0.0` with a fixed prompt, so verdicts are deterministic); chat responses are never cached. `0` disables it.
- `EMBEDDING_CACHE_*` — memoizes RAG query embeddings by normalized query text.
- `CHATBOT_CACHE_TTL_SECONDS` — TTL for the per-request chatbot config read. It is only a backstop: apps/api invalidates explicitly via `DELETE /api/chat/chatbot-cache/{chatbot_id}` whenever a chatbot's config, tools or skills change. `0` bypasses the cache.

Prompt caching is handled at the gateway: `build_chat_model` sets OpenRouter's top-level `cache_control` for `anthropic/*` models (other providers cache implicitly), and `ChatbotConfigMiddleware` pins each conversation to one provider endpoint with `session_id` so the cache can actually be hit.

`POSTGRES_URL` can continue to point to the app/chatbot database. RAG ingest and retrieval use `RAG_POSTGRES_URL` first, then fall back to `POSTGRES_URL` only when `RAG_POSTGRES_URL` is not set.
