# ecbot: Agent Guide

AI chatbot platform for Vietnamese businesses, in a pnpm + Turborepo monorepo: NestJS API, React SPA, Python AI service.

## Project map

```
apps/
  api/      NestJS 11 backend: PostgreSQL + MikroORM, Redis + BullMQ, JWT/CASL
  app/      Main React 19 SPA: Vite, Tailwind 4, TanStack Query, React Router v7
  ai/       Chatbot / AI module (see apps/ai/README.md)
packages/
  ui/               @repo/ui: shared components on @medusajs/ui + design tokens
  client/           @repo/client: generated API client
  auth/             shared auth utilities
  eslint-config/    typescript-config/   shared configs
```

<important if="you need to run commands to build, lint, test, migrate, or generate code">

Run from the repo root. The full list lives in the root `package.json` scripts.

| Command                                                        | What it does                                                |
| -------------------------------------------------------------- | ----------------------------------------------------------- |
| `pnpm dev` / `pnpm --filter api dev` / `pnpm --filter app dev` | Dev servers (all, API only, SPA only)                       |
| `pnpm build`                                                   | Build all                                                   |
| `pnpm lint` / `pnpm format`                                    | Lint / Prettier                                             |
| `pnpm test:api`                                                | API unit tests (Jest)                                       |
| `pnpm db:migrate:create\|up\|down`                             | MikroORM migrations (api)                                   |
| `pnpm db:seed`                                                 | Seed the database                                           |
| `pnpm generate:client`                                         | Regenerate `@repo/client` after any API DTO or route change |

</important>

<important if="you are implementing a feature or fixing a bug">

- Work test-first: write a failing test (red), make it pass with the simplest code (green), then refactor.
- Ship the minimum code that solves the asked problem: no speculative features, configurability, or single-use abstractions. If 200 lines could be 50, rewrite it.
- For a large or multi-step task, invoke the `using-superpowers` skill first (if available) to pick the process skill.
</important>

<important if="you are writing or editing code under apps/api">
Invoke the `eccho-backend` skill before writing code.
</important>

<important if="you are writing or editing code under apps/app">
Invoke the `eccho-frontend` skill before writing code.
</important>

<important if="you are adding or changing a chat channel (Messenger, Instagram, WhatsApp, Zalo, TikTok, Shopee, Telegram, API channel, website widget)">
Invoke the `eccho-platform-adapters` skill before writing code.
</important>

<important if="you are working under apps/ai">
Read `apps/ai/README.md` first.
</important>

<important if="you are creating files or splitting code">

- TypeScript-first, kebab-case file names, one class or component per file.
- When a file grows large, split it. When code is reused across apps, move it into a shared package.
</important>

<important if="you are writing UI copy, i18n strings, or LLM prompt templates">
Write natural, human copy with commas, colons, periods, or parentheses. The em dash ("—") reads as machine-written to our non-technical Vietnamese users, so keep it out of product text.
</important>

<important if="you are committing, branching, or opening a PR">
Follow `.github/instructions/git.instructions.md`.
</important>

<important if="you are touching packages/ui, packages/client, packages/auth, or monorepo build config">
Read the matching file in `.github/instructions/` (`packages/*.instructions.md`, `monorepo.instructions.md`) before editing.
</important>

<important if="you are adding or editing an agent skill, AGENTS.md, or CLAUDE.md">

- Skill sources live in `.agents/skills/<name>/`; `.claude/skills/<name>` is a symlink to it. Edit only the `.agents/skills/` copy.
- New skill: create `.agents/skills/<name>/SKILL.md` (disclose long reference into `references/`), then `ln -s ../../.agents/skills/<name> .claude/skills/<name>`. The directory name must equal the frontmatter `name`.
- Shared guidance goes here in `AGENTS.md`; `CLAUDE.md` only imports it.
</important>
