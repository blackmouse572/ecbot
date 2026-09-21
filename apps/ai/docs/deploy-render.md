# Deploy `apps/ai` to Render

Deploy the AI package as two Render services connected to the **already-deployed API**.

- `eccho-ai` — **Web Service** (public HTTPS), FastAPI `:8000`, from `Dockerfile`.
- `eccho-ai-jobs` — **Background Worker** (no inbound, DB poller), from `Dockerfile.jobs`.

Setup is **manual via the Render dashboard** (no `render.yaml`). No inbound auth is added — endpoints are public.

## Architecture

```
API (Render, public) --AI_BACKEND_URL--------------------> eccho-ai  (/api/rag/*, /api/chat/*)
eccho-ai  --API_BASE_URL /api/v1/system/internal/tool/execute--> API  (AI_SERVICE_API_KEY/SECRET)
eccho-ai + eccho-ai-jobs --POSTGRES_URL-----------------> shared Postgres (pgvector)
eccho-ai-jobs --MINIO_*---------------------------------> S3/MinIO (download FILE attachments to chunk)
```

- `eccho-ai` reads chatbot config + writes/reads RAG vectors in the shared Postgres.
- `eccho-ai-jobs` is a heartbeat that polls DB tables and chunks/embeds FILE attachments (no Redis).

## Prerequisites

- Shared Postgres reachable from Render with the **`pgvector`** extension enabled. Note: **there is no Render-managed Postgres** in this workspace — the DB is external (use its full connection string in `POSTGRES_URL`).
- S3/MinIO reachable from Render (for the jobs worker).
- LLM keys (Google/Anthropic/OpenAI as used), `FIRECRAWL_API_KEY`.
- The deployed API's public URL and its `AI_SERVICE_API_KEY` / `AI_SERVICE_API_SECRET` values.

## Service 1 — `eccho-ai` (Web Service)

Dashboard → **New → Web Service** → connect this repo.

| Setting            | Value                                                    |
| ------------------ | -------------------------------------------------------- |
| Name               | `eccho-ai`                                               |
| Language / Runtime | Docker                                                   |
| Root Directory     | `apps/ai`                                                |
| Dockerfile Path    | `Dockerfile`                                             |
| Instance           | ≥ **2 GB RAM** (loads cross-encoder reranker at runtime) |
| Health Check Path  | `/health`                                                |

**Port**: the `Dockerfile` runs `uvicorn --port 8000` + `EXPOSE 8000`. Render auto-detects the exposed port; if the deploy fails port detection, set env `PORT=8000` and/or configure the service port to **8000**.

### Env vars — `eccho-ai`

| Key                     | Notes                                                                 |
| ----------------------- | --------------------------------------------------------------------- |
| `ENV`                   | `prod`                                                                |
| `OPENROUTER_API_KEY`    | chat, guardrail, classifier, image **and embedding** calls            |
| `FIRECRAWL_API_KEY`     | URL ingest                                                            |
| `POSTGRES_URL`          | `postgresql+asyncpg://…` shared DB                                    |
| `RAG_POSTGRES_URL`      | optional; falls back to `POSTGRES_URL`                                |
| `API_BASE_URL`          | `https://eccho.onrender.com` (deployed API, tool callback)            |
| `AI_SERVICE_API_KEY`    | must match API's internal-tool-execute guard                          |
| `AI_SERVICE_API_SECRET` | must match API's internal-tool-execute guard                          |
| `RAG_*`                 | retrieval/rerank vars (see `.env.example`) — defaults OK              |
| `CUSTOMER_CLASSIFIER_*` | provider/model/temperature — defaults OK                              |
| `LANGSMITH_*`           | optional tracing                                                      |

## Service 2 — `eccho-ai-jobs` (Background Worker)

Dashboard → **New → Background Worker** → same repo.

| Setting            | Value                                  |
| ------------------ | -------------------------------------- |
| Name               | `eccho-ai-jobs`                        |
| Language / Runtime | Docker                                 |
| Root Directory     | `apps/ai`                              |
| Dockerfile Path    | `Dockerfile.jobs`                      |
| Instance           | ≥ **2 GB RAM** (loads embedding model) |

### Env vars — `eccho-ai-jobs`

| Key                                                                             | Notes                    |
| ------------------------------------------------------------------------------- | ------------------------ |
| `ENV`                                                                           | `prod`                   |
| `OPENROUTER_API_KEY`                                                            | embedding calls          |
| `POSTGRES_URL`                                                                  | shared DB                |
| `MINIO_ENDPOINT`                                                                | S3/MinIO host:port       |
| `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY`                                         |                          |
| `MINIO_SECURE`                                                                  | `true` for TLS endpoints |
| `EMBEDDING_MODEL`, `EMBEDDING_DIMENSIONS`, `EMBEDDING_BATCH_SIZE`               | defaults OK              |
| `CHUNK_SIZE`, `CHUNK_OVERLAP`                                                   | defaults OK              |

## Wire the API to the AI service

On the **existing API service** (`API Ecbot`, `srv-d1h3ghfgi27c73c8j5o0`, `https://eccho.onrender.com`) set:

| Key              | Value                                                       |
| ---------------- | ----------------------------------------------------------- |
| `AI_BACKEND_URL` | `https://eccho-ai.onrender.com` (the `eccho-ai` public URL) |

`API_INTERNAL_TOKEN` stays as-is on the API — it is sent as `Authorization: Bearer …` but the AI service does not verify it (accepted risk; endpoints are public). Redeploy the API so `AI_BACKEND_URL` takes effect.

## Post-deploy smoke test

1. **Health** — `curl https://eccho-ai.onrender.com/health` → `200`.
2. **Jobs worker** — Render logs for `eccho-ai-jobs` show `heartbeat started — jobs=[...]`.
3. **RAG ingest end-to-end** — upload a knowledge-base file via the API; confirm `eccho-ai` logs the `POST /api/rag/ingest/upload` and the document reaches `completed`.
4. **Chat** — send a chatbot message through the API; confirm `eccho-ai` logs `POST /api/chat/stream` and a reply streams back.
5. **Tool callback** — trigger a tool-using chat; confirm `eccho-ai` reaches the API at `/api/v1/system/internal/tool/execute` (no `401`).

## Risks / notes

- **Public endpoints, no auth** — `/api/rag/*` and `/api/chat/*` are open to the internet; anyone can drive LLM/RAG cost. Add an inbound token check later if needed (the API already sends `Authorization: Bearer ${API_INTERNAL_TOKEN}`).
- **Memory** — both services load ML models; under 2 GB they OOM on first request.
- **pgvector** — ingest/retrieval fail if the extension is not enabled on the shared DB.
