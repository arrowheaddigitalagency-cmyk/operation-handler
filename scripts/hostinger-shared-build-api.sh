#!/usr/bin/env bash
# Build Nest API + workspace deps for Hostinger Shared (API website).
set -euo pipefail
cd "$(dirname "$0")/.."

bash scripts/hostinger-ensure-pnpm.sh

pnpm install --frozen-lockfile
pnpm db:generate
pnpm --filter @cc/domain build
pnpm --filter @cc/config build
pnpm --filter @cc/db build
pnpm --filter @cc/notifications build
pnpm --filter @cc/ai build
pnpm --filter @cc/api build

echo "API build OK — entry: apps/api/dist/main.js"
