# Stage 1: builder — install dependencies into a venv with uv
FROM python:3.12-slim AS builder

# uv binary from the official distroless image
COPY --from=ghcr.io/astral-sh/uv:0.11 /uv /uvx /bin/

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/app/.venv

WORKDIR /app

# 1) Install deps only (cached layer) — project source not needed yet.
COPY pyproject.toml uv.lock README.md ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --no-install-project

# 2) Copy source and install the eccho_ai package (fast; deps already cached).
COPY . /app
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev

# Stage 2: runtime — slim image with just the venv + source
FROM python:3.12-slim AS runtime

ENV VIRTUAL_ENV=/app/.venv \
    PATH="/app/.venv/bin:$PATH"

WORKDIR /app

COPY --from=builder /app/.venv /app/.venv
COPY . /app

EXPOSE 8000

CMD ["uvicorn", "eccho_ai.main:app", "--host", "0.0.0.0", "--port", "8000"]
