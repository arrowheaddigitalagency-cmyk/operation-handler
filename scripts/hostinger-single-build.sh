#!/usr/bin/env bash
# Build Web + API for ONE Hostinger Node.js Web App (single domain).
# Bake local rewrite target so Next proxies /api/v1 to the in-process Nest API.
set -euo pipefail
cd "$(dirname "$0")/.."

export API_URL="${API_URL:-http://127.0.0.1:4000}"

bash scripts/hostinger-ensure-pnpm.sh

pnpm install --frozen-lockfile
pnpm db:generate
pnpm --filter @cc/domain build
pnpm --filter @cc/config build
pnpm --filter @cc/db build
pnpm --filter @cc/notifications build
pnpm --filter @cc/ai build
# @cc/ui is transpilePackages in Next — no separate emit required
API_URL="$API_URL" pnpm --filter @cc/api build
API_URL="$API_URL" pnpm --filter @cc/web build
bash scripts/hostinger-shared-prepare-standalone.sh

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
