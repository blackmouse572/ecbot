---
name: local-setup
description: Bring a fresh or broken ecbot checkout to a running, signed-in local stack — install, configure every .env, start Postgres/Redis/JWKS, migrate, seed, run, and prove login works. Use when the user asks to set up, spin up, bootstrap, install or run the project locally, when a new contributor clones the repo, or when local login/API calls fail with CORS, 401 right after sign-in, API-key rejections, Turnstile 403 (5400) or a missing `vector` extension.
---

# Local setup

Procedure for getting ecbot running locally with the user. The human-facing
version, with the reasoning behind each value, is
[`apps/api/docs/installation.md`](../../../apps/api/docs/installation.md). Read
its Troubleshooting table when a step fails.

## Ground rules

- **Two kinds of config, two behaviours.** `pnpm setup:local` fills values that
  only need to be _consistent_ (keys, KIDs, CORS, internal secrets, matched API
  key pairs) without asking. Values only a person can supply (OpenRouter,
  email, channel credentials) are **asked of the user**. Never invent, guess or
  reuse a real credential from elsewhere.
- **Never print a secret back.** Don't echo keys or secrets in chat, and don't
  paste `.env` contents. Refer to values by name.
- **Never commit** `.env` files or `apps/api/keys/`. They're gitignored; keep
  them that way.
- **Destructive database steps need a yes first**: `migration:fresh`,
  `schema:fresh`, `remove:apikey`, dropping or truncating. Say which database
  it hits. Prefer a new throwaway database over wiping one that has data.

## Procedure

1. **Prerequisites.** Check `node -v` (20+), `pnpm -v` (9), `docker compose version`.
   No Docker → follow _Without Docker_ in the install doc and tell the user
   which services you're starting by hand.

2. **Install.** `pnpm install`. A 403 on `cdn.sheetjs.com` is a network policy.
   Tell the user to allow that host; there is no frozen-lockfile workaround.

3. **Configure.** You have no terminal to prompt on, so run
   `pnpm setup:local --yes` and read its report:
   - _Filled automatically_: relay it in one line, e.g. "set CORS, keys and
     the shared API key pairs".
   - _Needs a value from you_: ask the user for each **required** value, and once,
     whether they want any **optional** group. Use your question tool if you
     have one. Write each answer into the file the report names with a single
     targeted edit to that line.
   - _Warnings_: surface each one. A frontend holding a different key pair is
     the user's call.
     Then `pnpm setup:local --check` must exit 0.

4. **Infrastructure.** `docker compose up -d database redis jwks-server`, then wait
   until `docker compose ps` shows them healthy.

5. **Schema and seed.** `pnpm db:migrate:up`, then `pnpm db:seed`. If the seed logs
   `ApiKey "…" already exists … skipping` for the default or AI key, the
   database predates the pinned pairs. Step 7 will fail on the API key. Ask
   before running the fix from the install doc.

6. **Run.** Start `pnpm dev:app` in the background (api :8080, app :5173). Start
   `pnpm --filter ai dev` too if the user wants chat replies. Wait for
   `curl -sf localhost:8080/api/public/health/live`.

7. **Prove sign-in.** Health alone doesn't cover the API key, CORS or JWKS. Read
   the default pair from `apps/app/.env` into shell variables, without printing it:

   ```bash
   KEY=$(grep ^VITE_API_KEY= apps/app/.env | cut -d= -f2- | tr -d '"')
   SECRET=$(grep ^VITE_API_KEY_SECRET= apps/app/.env | cut -d= -f2- | tr -d '"')
   RES=$(curl -s localhost:8080/api/v1/public/auth/login/credential \
     -H "x-api-key: $KEY:$SECRET" -H 'content-type: application/json' \
     -H 'origin: http://localhost:5173' \
     -d '{"email":"admin@mail.com","password":"aaAA@123","turnstileToken":"XXXX.DUMMY.TOKEN.XXXX"}')
   TOKEN=$(printf '%s' "$RES" | node -pe 'JSON.parse(require("fs").readFileSync(0)).data?.accessToken ?? ""')
   [ -n "$TOKEN" ] || echo "login failed: $RES"
   curl -s -o /dev/null -w '%{http_code}\n' localhost:8080/api/v1/shared/user/profile \
     -H "x-api-key: $KEY:$SECRET" -H "authorization: Bearer $TOKEN"
   ```

   `200` means login and token verification work. A failed login prints the
   API's response; its `statusCode` (e.g. `5400` Turnstile) points to the row
   in Troubleshooting. The dummy token is
   Cloudflare's, and it's accepted with the example test secret when the
   machine can reach Cloudflare. Match any failure to the install doc's
   Troubleshooting table and fix the cause. Don't just retry.

8. **Hand over.** Give the URLs (app :5173, API docs :8080/docs, Bull Board
   :3010), the demo login `admin@mail.com` / `aaAA@123`, and any optional
   group left unset with what it blocks.
