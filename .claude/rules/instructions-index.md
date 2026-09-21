---
title: "Project Instructions Index"
description: "Map of detailed per-area instructions. Read the relevant file(s) on demand before working in that area."
---

# Project Instructions Index

Detailed conventions live in `.github/instructions/`. **Before working in an area, read the matching file(s) below** — don't rely on this index alone. Match by the file path you're touching.

## Repo-wide

- **`.github/instructions/typescript.instructions.md`** — TypeScript coding standards across the repo.
- **`.github/instructions/monorepo.instructions.md`** — workspace commands, build orchestration.
- **`.github/instructions/git.instructions.md`** — git workflow, commit conventions, branching.

## API — `apps/api/**`

- **`.github/instructions/api/architecture.instructions.md`** — NestJS module structure & organization.
- **`.github/instructions/api/auth.instructions.md`** — JWT, RBAC, CASL policy-based permissions.
- **`.github/instructions/api/database.instructions.md`** — MikroORM repositories, entities, migrations (PostgreSQL).
- **`.github/instructions/api/jobs.instructions.md`** — BullMQ queues and job processors.
- **`.github/instructions/api/oauth-account-connect.instructions.md`** — multi-platform OAuth linking, token encryption/refresh.
- **`.github/instructions/api/response.instructions.md`** — response handling, request validation, error handling, API docs (includes i18n responses).

## App (main React app) — `apps/app/**`

- **`.github/instructions/app/react.instructions.md`** — stack overview, component conventions, route-folder layout, best practices. **Start here**, then read the focused files below.
- **`.github/instructions/app/data-fetching.instructions.md`** — TanStack Query v5 (key factory, query/mutation hooks, loaders) + `@repo/client`.
- **`.github/instructions/app/forms.instructions.md`** — React Hook Form + Zod via **`zodResolver`** + `@repo/ui` Form components.
- **`.github/instructions/app/routing-and-modals.instructions.md`** — React Router v7 lazy modules + create (`RouteFocusModal`) / edit (`RouteDrawer`) patterns.
- **`.github/instructions/app/state-and-authorization.instructions.md`** — Jotai (client state) + CASL (authorization).
- **i18n**: see [i18n.md](i18n.md) in this folder.

## AI (main React app) — `apps/ai/**`

For implementing Chabot/AI related features, read [AI](../../apps/ai/README.md) module for more information.

## Other apps & packages

- **`.github/instructions/packages/ui.instructions.md`** — shared UI component library (`@repo/ui`).
- **`.github/instructions/packages/auth.instructions.md`** — shared auth utilities.
- **`.github/instructions/packages/client.instructions.md`** — generated API client (`@repo/client`).
