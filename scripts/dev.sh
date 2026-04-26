#!/usr/bin/env bash
# Start the backend (port 5600) and frontend (port 5601) for local development.
#
# Usage:
#   ./scripts/dev.sh
#
# Defaults are chosen for a self-hosted single-developer setup. To override
# anything, export the variable before running this script.

set -euo pipefail

# Move to the repo root so relative paths work regardless of where this is run.
cd "$(dirname "$0")/.."

# A stable dev session secret across restarts (regenerated only if missing).
# Gitignored so it never leaves the machine.
SECRET_FILE=".dev-session-secret"
if [ ! -f "$SECRET_FILE" ]; then
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32 > "$SECRET_FILE"
  else
    LC_ALL=C tr -dc 'a-f0-9' < /dev/urandom | head -c 64 > "$SECRET_FILE"
  fi
fi

export NODE_ENV="${NODE_ENV:-development}"
export PORT="${PORT:-5600}"
export LOG_LEVEL="${LOG_LEVEL:-info}"
export DATABASE_PATH="${DATABASE_PATH:-./data/garden-guide.db}"
export PHOTO_DIR="${PHOTO_DIR:-./data/photos}"
export PUBLIC_URL="${PUBLIC_URL:-http://localhost:5601}"
export ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-sk-ant-not-yet-configured}"
export VAPID_PUBLIC_KEY="${VAPID_PUBLIC_KEY:-not-yet-configured}"
export VAPID_PRIVATE_KEY="${VAPID_PRIVATE_KEY:-not-yet-configured}"
export SESSION_SECRET="$(cat "$SECRET_FILE")"

export VITE_PORT="${VITE_PORT:-5601}"
export VITE_API_TARGET="${VITE_API_TARGET:-http://localhost:${PORT}}"

cat <<INFO
Garden Guide dev
  Backend:  http://localhost:${PORT}
  Frontend: http://localhost:${VITE_PORT}
  Data:     ${DATABASE_PATH}
  Photos:   ${PHOTO_DIR}

If this is the first start with an empty users table, the backend will
print a BOOTSTRAP_TOKEN — copy it and open
http://localhost:${VITE_PORT}/register?invite=<token>

Press Ctrl+C to stop both services.

INFO

exec pnpm dev
