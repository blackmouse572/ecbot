# Self-hosting Ecbot

Run the whole platform on one server with Docker Compose: Postgres with pgvector, Redis, the API, the AI service, and Caddy serving the app with automatic HTTPS.

## Requirements

- A Linux server with Docker and the Compose plugin. Plan for 2 CPUs and at least 4 GB of RAM, because the AI service loads a reranking model.
- Node 20+ and pnpm 9 on the machine where you run `pnpm setup:local` (it can be the server).
- A domain whose DNS points at the server, with ports 80 and 443 open. Caddy gets a Let's Encrypt certificate for it on first start.
- An [OpenRouter](https://openrouter.ai/keys) key. Ecbot cannot reply without one.
- A [Resend](https://resend.com) key and a verified sender. Sign-up sends an email code, and an account can't sign in until its email is verified.

## Install

```bash
git clone https://github.com/blackmouse572/ecbot.git
cd ecbot
pnpm install
pnpm setup:local
```

`pnpm setup:local` writes the `.env` files, generates the JWT keys, and creates a random `POSTGRES_PASSWORD` in the root `.env`. It prompts for `OPENROUTER_API_KEY` and, if you say yes to the optional integrations, for email and channel credentials. [Installation](../apps/api/docs/installation.md) lists everything it sets.

Then set your public URL in the root `.env`:

```bash
SITE_URL=https://chat.example.com
```

and, in `apps/api/.env`:

| Variable         | Value                                                                           |
| ---------------- | ------------------------------------------------------------------------------- |
| `APP_ENV`        | `production`. Turns off Swagger and the demo seed.                              |
| `RESEND_API_KEY` | Your Resend key.                                                                |
| `EMAIL_FROM`     | A sender on a domain you verified in Resend, such as `Ecbot <bot@example.com>`. |

Start everything:

```bash
docker compose --profile full up -d --build
```

The `migrate` service creates the schema, then the API starts. Open your `SITE_URL` and sign up. Leave `pnpm db:seed` out of a public install: it creates demo accounts with well-known passwords.

To try it on your own machine first, keep `SITE_URL=http://localhost`. Caddy then serves plain HTTP on port 80.

## What runs where

Only Caddy (the `app` service) listens on the network, on ports 80 and 443. It serves the app and proxies `/api` to the API, so the app, the API and platform webhooks share one origin. Postgres, Redis, the API, the AI service, the JWKS server and the Cloud Tasks emulator are bound to `127.0.0.1`, so only the server itself can reach them.

| Variable             | Where           | Notes                                                                                                                        |
| -------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `SITE_URL`           | root `.env`     | Public URL. Compose passes it to the API as `HOME_URL`, `API_BACKEND_URL` and CORS origin.                                   |
| `POSTGRES_PASSWORD`  | root `.env`     | Postgres reads it only when the volume is first created. To change it later, run `ALTER USER postgres PASSWORD '...'` too.   |
| `OPENROUTER_API_KEY` | `apps/ai/.env`  | Required.                                                                                                                    |
| Channel credentials  | `apps/api/.env` | Facebook, Instagram and Zalo need your own approved app. Telegram, the website widget and the REST API channel need nothing. |

## Channels and webhooks

Point platform webhooks at `https://<your domain>/api/...`. Telegram registers its webhook itself from `SITE_URL` when you connect a bot. The optional `edge` Cloudflare Worker is not needed.

## Upgrade

```bash
git pull
docker compose --profile full up -d --build
```

`migrate` applies the new migrations before the new API starts. Back up first.

## Backup and restore

```bash
docker compose exec database pg_dump -U postgres -Fc eccho > ecbot-$(date +%F).dump
docker compose exec -T database pg_restore -U postgres -d eccho --clean < ecbot-2026-10-26.dump
```

Also keep a copy of `apps/api/keys/` and the three `.env` files. Without `OAUTH_TOKEN_ENCRYPT_KEY`, saved channel credentials can't be decrypted.

## Known limits

- Background jobs (incoming messages, follow-ups, knowledge processing) run through the Cloud Tasks emulator, which keeps its queue in memory. Jobs still waiting when it restarts are lost.
- The website widget's allowed sites are checked by the API, but this setup doesn't send the `frame-ancestors` header that makes the browser refuse to show the widget on other sites. The hosted version sends it from a Cloudflare Worker.
