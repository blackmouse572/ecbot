# Use multi-stage build for optimal caching and smaller final image
# NOTE: glibc-based (not alpine) — @cloudflare/vite-plugin runs the `workerd`
# native binary, which needs real glibc symbols alpine/musl can't provide.
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME/bin:$PNPM_HOME:$PATH"
# Pinned to match root package.json's packageManager/turbo — an unpinned
# `latest` drifts from the repo's actual pnpm 9 / turbo 2.10 over time and
# can break the lockfile or silently diverge.
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

# Prune stage - extract only the app and its dependencies
FROM base AS builder
WORKDIR /app
RUN pnpm i -g turbo@2.11.3
COPY . .
RUN turbo prune app --docker

# Install dependencies stage
FROM base AS installer
WORKDIR /app
RUN pnpm i -g turbo@2.11.3

# Copy package files and install dependencies first (better caching)
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY turbo.json turbo.json
RUN pnpm install --frozen-lockfile

# Copy source code and build
COPY --from=builder /app/out/full/ .
# `turbo prune` skips gitignored files, so out/full/ has no apps/app/.env even
# though .dockerignore lets it into the context — take it from the builder's
# raw copy instead. Without this, vite builds with VITE_* undefined and the
# bundle silently falls back to App.tsx's hardcoded default API URL.
# Deliberately not optional: a missing .env should fail the build loudly rather
# than ship an image that points at the wrong backend.
COPY --from=builder /app/apps/app/.env apps/app/.env
# Build workspace deps first (turbo), then build app directly via vite —
# turbo's `-- <args>` passthrough would apply --mode to every task in the
# run (breaking `tsc` in @repo/client), so app must be built on its own.
RUN pnpm build --filter=app^...
# Vite bakes VITE_* vars into the bundle at build time by reading apps/app/.env
# (copied in above). --mode development makes it
# load .env instead of the default "production" mode's .env.production —
# trade-off: .env.development/.env.local are still excluded from the build
# context (only apps/app/.env is let through) and the bundle ships unminified.
# Fine for local-only testing; do not promote this image to staging/prod.
RUN pnpm --filter app exec vite build --mode development
# .env is only needed for the build above — delete it so the raw secret
# values never land in the final image layer (Vite has already baked the
# values it needs into dist/).
RUN rm -f apps/app/.env

# Final runtime stage
# NOTE: vite preview here is for local docker testing only — real deploys
# go through Cloudflare Workers/wrangler (pnpm deploy), not this image.
FROM base AS runner
WORKDIR /app

# Copy built application (vite preview needs the full workspace + node_modules,
# not a pruned "prod only" install — vite itself is a devDependency)
COPY --from=installer /app .

EXPOSE 4173

CMD ["pnpm", "--filter", "app", "exec", "vite", "preview", "--host", "0.0.0.0", "--port", "4173"]
