#!/usr/bin/env bash
# Build Web + API for ONE Hostinger Node.js Web App (single domain).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.."

export API_URL="${API_URL:-http://127.0.0.1:4000}"

# shellcheck disable=SC1091
source "$SCRIPT_DIR/hostinger-ensure-pnpm.sh"

# Hostinger sets NODE_ENV=production during build → pnpm skips prisma/tsc/nest (devDeps).
pnpm install --frozen-lockfile --prod=false

# Auto-flip Prisma to MySQL when DATABASE_URL is mysql (prevents runtime crash / 504)
if [[ "${DATABASE_URL:-}" == mysql://* ]]; then
  echo "[hostinger] DATABASE_URL is MySQL — switching Prisma provider"
  node "$SCRIPT_DIR/switch-prisma-mysql.cjs"
fi

pnpm db:generate

# Apply migrations when MySQL URL is present (empty DB on first deploy)
if [[ "${DATABASE_URL:-}" == mysql://* ]]; then
  echo "[hostinger] Running prisma migrate deploy"
  pnpm db:migrate:deploy || echo "[hostinger] WARN: migrate deploy failed — check DATABASE_URL / DB exists"
fi

pnpm --filter @cc/domain build
pnpm --filter @cc/config build
pnpm --filter @cc/db build
pnpm --filter @cc/notifications build
pnpm --filter @cc/ai build
API_URL="$API_URL" NODE_ENV=production pnpm --filter @cc/api build
API_URL="$API_URL" NODE_ENV=production pnpm --filter @cc/web build
bash "$SCRIPT_DIR/hostinger-shared-prepare-standalone.sh"

WEB_ENTRY="apps/web/.next/standalone/apps/web/server.js"
API_ENTRY="apps/api/dist/main.js"

if [ ! -f "$API_ENTRY" ]; then
  echo "ERROR: missing $API_ENTRY"
  exit 1
fi
if [ ! -f "$WEB_ENTRY" ]; then
  echo "ERROR: missing $WEB_ENTRY (standalone incomplete)"
  exit 1
fi

echo "Single-domain build OK"
echo "  API entry: $API_ENTRY"
echo "  Web entry: $WEB_ENTRY"
echo "  Hostinger Entry file: scripts/hostinger-single-start.cjs"
echo "  API_URL (rewrites): $API_URL"
