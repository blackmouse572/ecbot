#!/usr/bin/env bash
set -euo pipefail

INPUT=$(cat)
NAME=$(echo "$INPUT" | jq -r '.name')
# Try Claude Code env var, fallback to git root detection
REPO_PATH="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}"
WORKTREE_PARENT="${REPO_PATH}/.claude/worktrees"
WORKTREE_PATH="${WORKTREE_PARENT}/${NAME}"
BRANCH="worktree-${NAME}"

log() { echo "$*" > /dev/tty 2>/dev/null || true; }

hash_port() {
  local hash
  hash=$(echo -n "$1" | md5sum 2>/dev/null | tr -d -c '0-9' | head -c 5)
  if [ -z "$hash" ]; then
    hash=$(echo -n "$1" | md5 2>/dev/null | tr -d -c '0-9' | head -c 5)
  fi
  echo $(( (hash % 6900) + 3100 ))
}

log "=== eccho worktree setup ==="
log "  name:   ${NAME}"
log "  branch: ${BRANCH}"

mkdir -p "${WORKTREE_PARENT}"
git worktree add -b "${BRANCH}" "${WORKTREE_PATH}" HEAD >/dev/null 2>&1

log "  copying .env files..."
for app_dir in "${REPO_PATH}"/apps/*/; do
  app_name=$(basename "$app_dir")
  if [ -f "${REPO_PATH}/apps/${app_name}/.env" ]; then
    cp "${REPO_PATH}/apps/${app_name}/.env" "${WORKTREE_PATH}/apps/${app_name}/.env"
    log "    apps/${app_name}/.env"
  fi
done

log "  copying api keys..."
mkdir -p "${WORKTREE_PATH}/apps/api/keys"
if command -v rsync >/dev/null 2>&1; then
  rsync -a --exclude='.gitignore' "${REPO_PATH}/apps/api/keys/" "${WORKTREE_PATH}/apps/api/keys/" 2>/dev/null || true
else
  find "${REPO_PATH}/apps/api/keys/" -type f -not -name '.gitignore' \
    -exec cp {} "${WORKTREE_PATH}/apps/api/keys/" \; 2>/dev/null || true
fi

DEV_PORT=$(hash_port "${BRANCH}")
cat > "${WORKTREE_PATH}/.env.local" << EOF
DEV_PORT=${DEV_PORT}
WORKTREE_NAME=${NAME}
EOF
log "  dev port: ${DEV_PORT}"

log "  installing dependencies..."
(cd "${WORKTREE_PATH}" && pnpm install --frozen-lockfile) >> /tmp/worktree-setup.log 2>&1 || {
  log "  ! pnpm install failed, see /tmp/worktree-setup.log"
}

log "=== worktree ready ==="
echo "${WORKTREE_PATH}"
