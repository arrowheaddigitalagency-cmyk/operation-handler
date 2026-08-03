#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.."

: "${API_URL:?Set API_URL to https://api.yourdomain.com before building}"

# shellcheck disable=SC1091
source "$SCRIPT_DIR/hostinger-ensure-pnpm.sh"

pnpm install --frozen-lockfile --prod=false
pnpm db:generate
pnpm --filter @cc/domain build
API_URL="$API_URL" NODE_ENV=production pnpm --filter @cc/web build
bash "$SCRIPT_DIR/hostinger-shared-prepare-standalone.sh"

WEB_ENTRY="apps/web/.next/standalone/apps/web/server.js"
if [ ! -f "$WEB_ENTRY" ]; then
  echo "ERROR: missing $WEB_ENTRY after build"
  exit 1
fi
echo "Web build OK — entry: $WEB_ENTRY"
