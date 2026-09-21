#!/usr/bin/env bash
set -euo pipefail

INPUT=$(cat)
WORKTREE_PATH=$(echo "$INPUT" | jq -r '.worktree_path')

[ ! -d "${WORKTREE_PATH}" ] && exit 0

log() { echo "$*" > /dev/tty 2>/dev/null || true; }

log "=== eccho worktree cleanup ==="

if [ -f "${WORKTREE_PATH}/.env.local" ]; then
  DEV_PORT=$(grep -oP 'DEV_PORT=\K\d+' "${WORKTREE_PATH}/.env.local" 2>/dev/null || true)
  if [ -n "${DEV_PORT}" ]; then
    log "  killing processes on port ${DEV_PORT}..."
    lsof -ti ":${DEV_PORT}" 2>/dev/null | xargs kill 2>/dev/null || true
  fi
fi

BRANCH=$(git -C "${WORKTREE_PATH}" rev-parse --abbrev-ref HEAD 2>/dev/null || true)
git worktree remove "${WORKTREE_PATH}" --force 2>/dev/null || true
if [ -n "${BRANCH}" ]; then
  git branch -D "${BRANCH}" 2>/dev/null || true
  log "  removed branch: ${BRANCH}"
fi

log "=== cleanup done ==="
