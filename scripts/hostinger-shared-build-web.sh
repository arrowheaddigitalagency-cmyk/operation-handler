#!/usr/bin/env bash
# Build Next.js web + prepare standalone for Hostinger Shared (Web website).
# Requires API_URL to be the public API origin (rewrites bake at build time).
set -euo pipefail
cd "$(dirname "$0")/.."

: "${API_URL:?Set API_URL to https://api.yourdomain.com before building}"

bash scripts/hostinger-ensure-pnpm.sh

pnpm install --frozen-lockfile
pnpm db:generate
pnpm --filter @cc/domain build
# @cc/ui is consumed via Next transpilePackages — skip separate tsc emit
API_URL="$API_URL" pnpm --filter @cc/web build
bash scripts/hostinger-shared-prepare-standalone.sh

WEB_ENTRY="apps/web/.next/standalone/apps/web/server.js"
if [ ! -f "$WEB_ENTRY" ]; then
  echo "ERROR: missing $WEB_ENTRY after build"
  exit 1
fi
echo "Web build OK — entry: $WEB_ENTRY"
