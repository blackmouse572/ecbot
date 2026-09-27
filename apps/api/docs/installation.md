# Local installation

How to get a fresh checkout to a running, logged-in local stack. The short
version is in the root [README](../../../README.md#quick-start); this page
explains what each step configures and what to do when one fails.

Agents: the `local-setup` skill (`.agents/skills/local-setup/`) runs this same
procedure end to end.

- [Prerequisites](#prerequisites)
- [1. Install](#1-install)
- [2. Configure: `pnpm setup:local`](#2-configure-pnpm-setuplocal)
- [3. Infrastructure](#3-infrastructure)
- [4. Schema and seed](#4-schema-and-seed)
- [5. Run and sign in](#5-run-and-sign-in)
- [Without Docker](#without-docker)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- Node 20+ and [pnpm](https://pnpm.io) 9
- Docker with Compose
- [uv](https://docs.astral.sh/uv/) with Python 3.12+, only to run `apps/ai`

## 1. Install

```bash
pnpm install
```

## 2. Configure: `pnpm setup:local`

```bash
pnpm setup:local
```

Creates `apps/api/.env`, `apps/app/.env` and `apps/ai/.env` from their
examples and configures them. Configuration comes in two kinds, and the script
treats them differently:

**Filled for you, without asking.** Values that only have to be _consistent_,
not chosen. A value you already set is never overwritten, so re-running is
safe.

| Value                                                                                | Where                             | Why it matters                                                                                                             |
| ------------------------------------------------------------------------------------ | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| JWT keypairs, `jwks.json`, `AUTH_JWT_*_KID`, `OAUTH_TOKEN_ENCRYPT_KEY`               | `apps/api/keys/`, `apps/api/.env` | Runs `pnpm generate:keys`, but only when keys or KIDs are missing. Regenerating signs everyone out.                        |
| `MIDDLEWARE_CORS_ORIGIN`                                                             | `apps/api/.env`                   | Must list each frontend origin. `*` turns credentialed requests off, and the apps send credentials.                        |
| Default API key: `E2E_SEED_DEFAULT_API_KEY` ↔ `VITE_API_KEY` / `VITE_API_KEY_SECRET` | `apps/api/.env` ↔ `apps/app/.env` | The seed stores this pair and the app presents it. Unpinned, the seed prints a random pair once and you'd copy it by hand. |
| AI service key: `AI_SERVICE_API_KEY` / `_SECRET`                                     | `apps/api/.env` ↔ `apps/ai/.env`  | The AI service calls back into the API with it.                                                                            |
| `CLOUD_TASKS_SYSTEM_API_KEY`                                                         | `apps/api/.env`                   | Pinned so the Cloud Tasks emulator's calls are accepted.                                                                   |
| Invitation, preview-share and Telegram webhook secrets                               | `apps/api/.env`                   | Random per checkout.                                                                                                       |
| `VITE_API_URL`                                                                       | frontend `.env`                   | Set to `http://localhost:<HTTP_PORT>` when empty or a placeholder.                                                         |

When a frontend already holds a _different_ key pair, the script reports it
and leaves it alone. It may point at a remote API on purpose.

**Asked of you.** Values only you can get. On a terminal the script prompts
for them, with secret input hidden. With `--yes`, `--check`, or no terminal, it
lists them and never invents them.

| Group                     | Values                                   | Needed for                                                              |
| ------------------------- | ---------------------------------------- | ----------------------------------------------------------------------- |
| LLM access (**required**) | `OPENROUTER_API_KEY` (`apps/ai/.env`)    | Any chatbot reply. Get it at <https://openrouter.ai/keys>.              |
| Email                     | `RESEND_API_KEY`, `EMAIL_FROM`           | Sending invitations and password resets. Without it, emails are logged. |
| Facebook / Instagram      | `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` | Connecting pages and accounts.                                          |
| Web crawling              | `FIRECRAWL_API_KEY`                      | Importing websites into a knowledge base.                               |
| Composio                  | `COMPOSIO_API_KEY`                       | The Composio built-in tools.                                            |

Options: `--check` (write nothing; exits 1 while a required value or the keys
are missing), `--yes` (no prompts), `--origin <url>` and `--client-env <path>`
(add another frontend's origin and give its `.env` the same key pair; a
superproject uses these for its own apps). `pnpm setup:local --help` lists them.

## 3. Infrastructure

```bash
docker compose up -d
```

Starts Postgres with pgvector (`:5432`), Redis (`:6379`), the JWKS server
(`:3011`, serving `apps/api/keys/jwks.json`), Bull Board (`:3010`) and the Cloud
Tasks emulator.

## 4. Schema and seed

```bash
pnpm db:migrate:up
pnpm db:seed
```

The seed creates demo countries, roles, users (`admin@mail.com` /
`aaAA@123`, among others) and the API keys, using the pairs from step 2. It
refuses to run with `NODE_ENV=production` or `APP_ENV=production`.

The seed never replaces a key that already exists. If this database was seeded
before step 2 ran, the pinned pairs aren't in it; see
[Troubleshooting](#troubleshooting).

## 5. Run and sign in

```bash
pnpm dev:app              # api :8080 + app :5173
pnpm --filter ai dev      # AI service :8000, in a second shell
```

Open <http://localhost:5173> and sign in as `admin@mail.com` / `aaAA@123`.

## Without Docker

You need the same three services yourself:

- **Postgres with the `pgvector` extension.** Migrations run `create extension vector`. On Debian/Ubuntu: `apt install postgresql-16-pgvector`. Point `DATABASE_URL` (api) and `POSTGRES_URL` (ai) at it.
- **Redis** on `REDIS_HOST:REDIS_PORT`.
- **The JWKS file at `AUTH_JWT_JWKS_URI`.** The API verifies its own tokens against it. For the default URI:
    ```bash
    mkdir -p /tmp/jwks/.well-known && cp apps/api/keys/jwks.json /tmp/jwks/.well-known/
    (cd /tmp/jwks && python3 -m http.server 3011)
    ```
    Re-copy after any `pnpm generate:keys`.

## Troubleshooting

| Symptom                                                                                           | Cause                                                                                                                 | Fix                                                                                                                                                |
| ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Browser: CORS preflight blocked                                                                   | Origin missing from `MIDDLEWARE_CORS_ORIGIN`, or it is `*`                                                            | `pnpm setup:local --origin <your-origin>`, then restart the API.                                                                                   |
| "Signed in" toast, then straight back to the login page; API logs `JWT Access Token Unauthorized` | The API can't fetch `AUTH_JWT_JWKS_URI`, or the served `jwks.json` is from an older key generation                    | Start the `jwks-server` container, or serve the file ([Without Docker](#without-docker)). Restart the API after regenerating keys.                 |
| Every request 401 with an API key error                                                           | The frontend's `VITE_API_KEY` isn't in the database, usually because the DB was seeded before `setup:local` pinned it | On a **disposable dev database only**: `pnpm --filter api exec nestjs-command remove:apikey && pnpm --filter api exec nestjs-command seed:apikey`. |
| Login 403, status code `5400`                                                                     | Turnstile: the widget didn't load (offline, headless, blocked `challenges.cloudflare.com`), so no token was sent      | For purely local work, empty `TURNSTILE_SECRET_KEY` (api) and `VITE_TURNSTILE_SITE_KEY` (app). That turns CAPTCHA off.                             |
| Migration fails: `extension "vector" is not available`                                            | Postgres without pgvector                                                                                             | Use the compose `database` service, or install pgvector ([Without Docker](#without-docker)).                                                       |
| Chatbot replies with its fallback message                                                         | `OPENROUTER_API_KEY` empty, or the AI service isn't running                                                           | `pnpm setup:local` prompts for it; start `pnpm --filter ai dev`.                                                                                   |
| `pnpm install`: 403 fetching `cdn.sheetjs.com`                                                    | A network policy blocks SheetJS's CDN (the API's `xlsx` dependency)                                                   | Allow that host. It can't be skipped with a frozen lockfile.                                                                                       |
