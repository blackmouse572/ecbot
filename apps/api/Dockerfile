# Use multi-stage build for optimal caching and smaller final image
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME/bin:$PNPM_HOME:$PATH"
# Install dependencies for better performance
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

# Prune stage - extract only the API and its dependencies
FROM base AS builder
WORKDIR /app
RUN pnpm i -g turbo@2.11.3
COPY . .
RUN turbo prune api --docker

# Install dependencies stage
FROM base AS installer
WORKDIR /app
RUN pnpm i -g turbo@2.11.3
RUN pnpm i -g @nestjs/cli@^11.0.5

# Copy package files and install dependencies first (better caching)
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY turbo.json turbo.json
# Flat node_modules so app code can require transitive deps it imports directly
# (express, multer, ...) — pnpm's default isolated linker hides them in prod.
RUN echo "node-linker=hoisted" > .npmrc
RUN pnpm install --frozen-lockfile

# Copy source code and build
COPY --from=builder /app/out/full/ .
RUN pnpm build --filter=api

# Production dependencies only
RUN pnpm prune --prod

# Final runtime stage
FROM base AS runner
WORKDIR /app

# Copy built application
COPY --from=installer /app .

EXPOSE 8080

# Superproject builds set this to the package's path in their workspace (e.g. core/apps/api).
ARG APP_DIR=apps/api
ENV APP_DIR=${APP_DIR}

# exec keeps node as PID 1 so SIGTERM reaches it directly.
CMD ["sh", "-c", "exec node $APP_DIR/dist/main"]
