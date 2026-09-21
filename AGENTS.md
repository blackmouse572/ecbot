# ecbot — Agent Guide

## Prerequisites

Before starting work:

- **Large / multi-step tasks** — invoke the `using-superpowers` skill first (if available) to pick the right process skill (brainstorming, systematic-debugging, TDD, …).
- **TDD, red → green** — write a failing test first (red), make it pass with the simplest code (green), then refactor. No implementation before the test.
- **Keep changes minimal, simplicity first** — the minimum code that solves the problem, nothing speculative:
  - No features beyond what was asked.
  - No abstractions for single-use code.
  - No "flexibility" or "configurability" that wasn't requested.
  - No error handling for impossible scenarios.
  - If you write 200 lines and it could be 50, rewrite it.
  - Ask: "Would a senior engineer call this overcomplicated?" If yes, simplify.

## Structure

```
apps/
  api/      NestJS 11 backend — PostgreSQL + MikroORM, Redis + BullMQ, JWT/CASL   → skill: eccho-backend
  app/      Main React 19 SPA — Vite, Tailwind 4, TanStack Query, React Router v7 → skill: eccho-frontend
  ai/       Chatbot / AI module (see apps/ai/README.md)
packages/
  ui/               @repo/ui — shared components on @medusajs/ui + design tokens
  client/           @repo/client — generated API client (pnpm generate:client)
  auth/             shared auth utilities
  eslint-config/    typescript-config/   shared configs
```

Deep, area-specific conventions live in **`.github/instructions/`** — read the matching file before working in an area (index: `.claude/rules/instructions-index.md`). Per-app extras: `apps/api/docs/` (backend guides), `apps/ai/README.md`.

## Files & conventions

- **Skills are the primary agent context.** Real skill files live in **`.agents/skills/<name>/`** and are **symlinked** into `.claude/skills/<name>` so both providers stay in sync. When adding/editing a skill, edit the file under `.agents/skills/` — never fork the two copies.
- **`CLAUDE.md` references this file** (`@AGENTS.md`); keep shared guidance here, not duplicated in `CLAUDE.md`.
- TypeScript-first, kebab-case files, one class/component per file. See `.github/instructions/typescript.instructions.md`.
- Commit conventions & git workflow: `.github/instructions/git.instructions.md`. Monorepo commands: `.github/instructions/monorepo.instructions.md`.
- Keep files small and focused — if a file grows too large, split it into smaller ones.
- If part of files is reused across apps, extract it into a shared utility or utility file.

### Common commands

```bash
pnpm dev                    # all apps          pnpm --filter api dev / --filter app dev
pnpm build                  # build all         pnpm lint / pnpm format
pnpm db:migrate:create|up|down                  # MikroORM migrations (api)
pnpm generate:client        # regenerate @repo/client after API DTO/route changes
```

## Agent skills

Project skills route you to the canonical docs and enforce this repo's patterns. Invoke the matching skill **before** writing code in that area:

| Skill                       | Use for                                                                                                                                                                                                                             |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **eccho-backend**           | anything under `apps/api/**` — modules, entities, repositories, services, controllers, DTOs, migrations, BullMQ jobs, auth, i18n responses. Global rules + structure + links to every `apps/api/docs/*` guide.                      |
| **eccho-frontend**          | anything under `apps/app/**` — pages, route modules, loaders, data hooks, mutations, forms, create/edit modals, UI, authz, i18n. Global rules + structure + references (TanStack Query, React Router, `@repo/ui`). |
| **eccho-platform-adapters** | building/registering a chat platform integration (Messenger, Instagram, Zalo, TikTok, Shopee) via the `apps/api` `platform` module.                                                                                                 |

Adding a skill: create `.agents/skills/<name>/SKILL.md` (+ `references/` if it exceeds ~100 lines), then `ln -s ../../.agents/skills/<name> .claude/skills/<name>`.
