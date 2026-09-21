# Ecbot

<p>
  <a href="./LICENSE"><img alt="Licence: AGPL-3.0" src="https://img.shields.io/github/license/blackmouse572/ecbot?color=2563eb"></a>
  <a href="https://github.com/blackmouse572/ecbot/actions/workflows/test-api.yml"><img alt="API tests" src="https://img.shields.io/github/actions/workflow/status/blackmouse572/ecbot/test-api.yml?branch=main&label=api%20tests"></a>
  <a href="https://github.com/blackmouse572/ecbot/actions/workflows/test-ai.yml"><img alt="AI tests" src="https://img.shields.io/github/actions/workflow/status/blackmouse572/ecbot/test-ai.yml?branch=main&label=ai%20tests"></a>
  <a href="https://github.com/blackmouse572/ecbot/actions/workflows/lint-api.yml"><img alt="Lint" src="https://img.shields.io/github/actions/workflow/status/blackmouse572/ecbot/lint-api.yml?branch=main&label=lint"></a>
  <a href="./CONTRIBUTING.md"><img alt="PRs welcome" src="https://img.shields.io/badge/PRs-welcome-16a34a"></a>
  <a href="https://github.com/blackmouse572/ecbot/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/blackmouse572/ecbot?style=flat"></a>
</p>

Build one AI agent — persona, knowledge, tools, behaviour — and run it across every messaging channel your customers actually use. Operators watch the conversations and step in whenever they want.

Ecbot is a multi-platform AI agent platform for conversational commerce and customer service. It is the same engine that runs Ecbot Cloud, open-sourced in full.

## Channels

| Channel            | Status                                      |
| ------------------ | ------------------------------------------- |
| Facebook Messenger | Shipped                                     |
| Zalo OA            | Shipped                                     |
| Telegram           | Shipped                                     |
| Website widget     | Shipped                                     |
| REST API channel   | Shipped                                     |
| Instagram          | Roadmap — [adapter slot open](../../issues) |
| TikTok Shop        | Roadmap — [adapter slot open](../../issues) |
| Shopee             | Roadmap — [adapter slot open](../../issues) |

Adapters are self-contained (`apps/api/src/modules/platform/adapters/`). Three slots are open and specced — they are the best place to start contributing.

## Features

- **One agent, every channel.** Define persona, knowledge, tools and behaviour once; the same agent answers on Facebook Messenger, Zalo OA, Telegram, your website widget and a REST API channel. Instagram, TikTok Shop and Shopee are open adapter slots.
- **Operator inbox with human handoff.** Every conversation is visible to operators, who can take over at any time; the agent hands off on its own by keyword or when its confidence drops below a threshold you set.
- **Knowledge base with RAG.** Upload files and pages; embeddings live next to the relational data in one Postgres (pgvector), and retrieval is scoped per agent.
- **Tools and MCP.** Give agents tools from the marketplace (Composio), a hosted MCP server, or any MCP URL you operate; tool calls run inside the conversation.
- **Guardrails.** Input and output guardrails with custom instructions and escalation to a human when a message is blocked.
- **Follow-ups and customer context.** Rule-based follow-up messages, customer profiles and automatic tagging so the agent knows who it is talking to.
- **Workspaces, roles and audit.** Multi-workspace tenancy with role-based permissions, invitations, API keys and an activity log.
- **Streaming and queues.** Token streaming from the AI service to the channel, BullMQ background jobs, and a queue dashboard.
- **English and Vietnamese** out of the box, in the operator UI and API responses.

Ecbot self-hosted is the complete engine, uncrippled — the same code that runs Ecbot Cloud. Two things are yours to supply: an LLM key (Ecbot routes through [OpenRouter](https://openrouter.ai); set `OPENROUTER_API_KEY` and pay the provider directly) and, for Facebook, Zalo or TikTok, your own platform app approved for messaging permissions. Telegram, the website widget and the REST API channel need no approval — start there.

## Quick start

Requires Node 20+, [pnpm](https://pnpm.io) 9, Docker, and [uv](https://docs.astral.sh/uv/) with Python 3.12+ (for `apps/ai`).

```bash
git clone https://github.com/blackmouse572/ecbot.git
cd ecbot
pnpm install
```

**1. Bring up the infrastructure.** Postgres with pgvector, Redis, a JWKS server, Bull Board and a Cloud Tasks emulator — everything the apps talk to.

```bash
docker compose up -d
```

To use a hosted Postgres instead ([Neon](https://neon.tech), Supabase, RDS), point `DATABASE_URL` at it and ignore the `database` container. It needs the **pgvector** extension: Ecbot keeps relational data and embeddings in one database.

**2. Configure.**

```bash
cp apps/api/.env.example apps/api/.env
cp apps/app/.env.example apps/app/.env
cp apps/ai/.env.example  apps/ai/.env
```

The defaults work against the Compose stack as-is. The only value you must supply is `OPENROUTER_API_KEY` in `apps/ai/.env` — Ecbot has no LLM access without it.

**3. JWT signing keys.** Writes a keypair into `apps/api/keys/` and fills the matching `.env` entries.

```bash
pnpm generate:keys
```

**4. Create the schema, and optionally seed demo data.**

```bash
pnpm --filter api migration:up
pnpm --filter api migrate:seed      # demo countries, API keys, roles and users
```

`migration:up` applies the chain under `apps/api/migrations/` — it replays cleanly onto an empty database and records what ran, so later upgrades are plain `migration:up` too. Do not use `schema:create`: it builds the tables without recording any migration, and the next upgrade would try to replay the whole chain.

**5. Run the apps.**

```bash
pnpm dev:app                          # api + app
pnpm --filter ai dev                  # AI service, in a second shell
```

|                    |                            |
| ------------------ | -------------------------- |
| App                | http://localhost:5173      |
| API                | http://localhost:8080      |
| API docs (Swagger) | http://localhost:8080/docs |
| AI service         | http://localhost:8000      |
| Queue dashboard    | http://localhost:3010      |

To run the apps in containers too, use the Compose profiles: `docker compose --profile app up` for api + app, `--profile full` to include the AI service.

> The seed inserts demo accounts with well-known passwords, and prints generated API keys once. It is development tooling: it refuses to run with `NODE_ENV=production` or `APP_ENV=production`, and you should change the demo passwords before exposing an instance.

## Repository layout

A [Turborepo](https://turbo.build/repo) + pnpm workspace.

**Apps**

- **`api`** — the backend. NestJS 11, PostgreSQL via MikroORM, Redis + BullMQ. Owns channels, conversations, knowledge, tools, and the operator API.
- **`app`** — the operator UI. React 19, Vite, TanStack Query, React Router v7.
- **`ai`** — the agent runtime. Python 3.12, FastAPI, LangChain. Handles generation, RAG, and guardrails; `api` streams from it over HTTP.
- **`edge`** — optional Cloudflare Worker that receives platform webhooks and forwards them. Self-hosting works without it; point webhooks straight at `api`.

**Packages** — `@repo/ui` (shared components), `@repo/client` (API client generated from the OpenAPI schema), `@repo/auth`, plus shared ESLint and TypeScript configs.

## Development

```bash
pnpm dev                 # everything
pnpm lint                # eslint
pnpm check-types         # tsc --noEmit
pnpm test:api            # api unit tests
pnpm generate:client     # regenerate @repo/client after changing API DTOs or routes
```

Conventions live in [`AGENTS.md`](./AGENTS.md) and `.github/instructions/`. Domain vocabulary is in [`CONTEXT.md`](./CONTEXT.md) — read it before naming anything.

## Contributing

Start with [`CONTRIBUTING.md`](./CONTRIBUTING.md). Adapter slots are labelled `good first issue`.

## Security

Report vulnerabilities privately — see [`SECURITY.md`](./SECURITY.md). Please do not open a public issue.

## Licence

[AGPL-3.0](./LICENSE). `apps/api` began as a fork of [ack-nestjs-boilerplate](https://github.com/andrechristikan/ack-nestjs-boilerplate) (MIT); see [`NOTICE`](./NOTICE).

"Ecbot" and the Ecbot logo are trademarks and are not covered by the licence — see [`TRADEMARK.md`](./TRADEMARK.md).
