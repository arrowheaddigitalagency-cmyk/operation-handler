#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.."

# shellcheck disable=SC1091
source "$SCRIPT_DIR/hostinger-ensure-pnpm.sh"

pnpm install --frozen-lockfile
pnpm db:generate
pnpm --filter @cc/domain build
pnpm --filter @cc/config build
pnpm --filter @cc/db build
pnpm --filter @cc/notifications build
pnpm --filter @cc/ai build
pnpm --filter @cc/api build

echo "API build OK — entry: apps/api/dist/main.js"
