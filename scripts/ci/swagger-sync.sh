#!/usr/bin/env bash
# Verifies the checked-in @repo/client matches apps/api's current swagger
# output. Boots the API once (writes apps/api/swagger.json on boot), runs
# `pnpm generate:client` against it, and diffs the result against what's
# committed. Runs identically locally and in CI (.github/workflows/swagger-sync.yml).
#
# Expects in the environment: DATABASE_URL, DATABASE_SSL, REDIS_HOST,
# REDIS_PORT, and an apps/api/.env present (used for JWT keys etc).
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

HTTP_PORT="${HTTP_PORT:-8080}"
LOG="$(mktemp -t swagger-sync-api.XXXXXX.log)"
API_PID=""

cleanup() {
    if [[ -n "$API_PID" ]] && kill -0 "$API_PID" 2>/dev/null; then
        kill -TERM "$API_PID" 2>/dev/null || true
        wait "$API_PID" 2>/dev/null || true
    fi
    rm -f "$LOG"
}
trap cleanup EXIT

echo "==> Building api"
pnpm --filter api build

echo "==> Running migrations"
(cd apps/api && npx mikro-orm migration:up)

echo "==> Booting api (writes apps/api/swagger.json)"
pushd apps/api >/dev/null
APP_ENV=local HTTP_PORT="$HTTP_PORT" node dist/main >"$LOG" 2>&1 &
API_PID=$!
popd >/dev/null

health_url="http://localhost:${HTTP_PORT}/api/public/health/live"
deadline=$((SECONDS + 120))
until curl -sf "$health_url" >/dev/null 2>&1; do
    if ! kill -0 "$API_PID" 2>/dev/null; then
        echo "api process exited before becoming healthy" >&2
        tail -n 40 "$LOG" >&2
        exit 1
    fi
    if (( SECONDS >= deadline )); then
        echo "api did not become healthy within 120s" >&2
        tail -n 40 "$LOG" >&2
        exit 1
    fi
    sleep 2
done
echo "==> api is healthy"

echo "==> Stopping api"
kill -TERM "$API_PID"
waited=0
while kill -0 "$API_PID" 2>/dev/null; do
    if (( waited >= 15 )); then
        echo "api did not shut down within 15s of SIGTERM" >&2
        kill -9 "$API_PID" 2>/dev/null || true
        exit 1
    fi
    sleep 1
    waited=$((waited + 1))
done
wait "$API_PID" 2>/dev/null || true
API_PID=""

echo "==> Regenerating @repo/client"
pnpm generate:client

echo "==> Checking packages/client is in sync with apps/api/swagger.json"
if ! git diff --exit-code --stat -- packages/client/src/client; then
    echo "@repo/client is out of date with apps/api/swagger.json. Run: pnpm generate:client and commit packages/client." >&2
    exit 1
fi

echo "==> swagger-sync OK"
