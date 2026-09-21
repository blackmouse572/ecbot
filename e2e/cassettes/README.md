# AI cassettes

vcrpy recordings of the chat agent's LLM HTTP calls. The `regression` Playwright
project replays these (`AI_CASSETTE_MODE=none`) so chat tests are deterministic
and make **no** real LLM calls. Cassette filename = `chat-<md5(message)[:12]>.yaml`
(see `apps/ai/middlewares/cassette_middleware.py`), so a recording is only reused
when the user message is byte-identical.

**These files must be committed** — without them the `regression` chat suite
skips (see `chat-conversation.spec.ts`).

## Recording

Recording drives the **real** chat flow once with a real provider key, in vcrpy
`new_episodes` mode, so the recorded request path/host match what replay looks up.

Prerequisites:

- A real `DEEPSEEK_API_KEY` — the E2E chatbot is pinned to DeepSeek
  (`e2e/fixtures/chatbot.fixture.ts`: `modelProvider: 'deepseek'`).
- `E2E_TEST_KEY` / `E2E_API_KEY` matching the api test config.
- Docker + the E2E stack building.
- **The frontend app served at `BASE_URL` (default `http://localhost:5173`).**
  ⚠️ Neither compose file starts the app, and there is no Playwright `webServer`
  yet — the browser flow (smoke/regression) currently has nothing to navigate to.
  Serve the app before recording, e.g. `pnpm --filter app dev`, or add a
  `webServer` block to `playwright.config.ts`. This gap blocks the browser E2E in
  general, not just recording.

Steps (mirrors the CI smoke job, but in record mode):

```bash
# 0. Serve the app (separate terminal) — required by the browser flow
pnpm --filter app dev            # → http://localhost:5173

# 1. Bring the stack up in RECORD mode (new_episodes + cassettes mounted rw)
export DEEPSEEK_API_KEY=sk-...    # real key (E2E chatbot uses DeepSeek)
export E2E_TEST_KEY=...           # matches api test-helpers guard
export E2E_API_KEY=...
docker compose \
  -f docker-compose.yml \
  -f docker-compose.e2e.yml \
  -f docker-compose.e2e.record.yml \
  up -d --build --wait

# 2. Migrate + seed (host → dockerized postgres on :5432)
#    migrate:seed:e2e seeds country + apikey + role (what E2E needs) via nestjs-command.
#    (db:seed / seeder:run is a no-op — mikro-orm's defaultSeeder DatabaseSeeder doesn't exist;
#     full migrate:seed also seeds demo users, which E2E doesn't need.)
( cd apps/api && pnpm migration:up && pnpm migrate:seed:e2e )

# 3. Drive the real chat flow — vcrpy records into ./e2e/cassettes
BASE_URL=http://localhost:5173 API_URL=http://localhost:8080 AI_URL=http://localhost:8000 \
  pnpm e2e:smoke

# 4. Tear down
docker compose \
  -f docker-compose.yml -f docker-compose.e2e.yml -f docker-compose.e2e.record.yml down -v
```

## Before committing

Request headers (`authorization`, `x-api-key`, `api-key`, `cookie`) are scrubbed
on write. **Verify anyway** — never commit a cassette containing a live key:

```bash
grep -rInE 'sk-[A-Za-z0-9]|authorization|api[_-]?key' e2e/cassettes/*.yaml
```

If that returns anything sensitive, delete the cassette and fix the scrub list in
`_scrub_request` before re-recording. Then:

```bash
git add e2e/cassettes/*.yaml && git commit -m "test(e2e): record AI cassettes"
```
