#!/usr/bin/env bash
# Build Next.js web + prepare standalone for Hostinger Shared (Web website).
# Requires API_URL to be the public API origin (rewrites bake at build time).
set -euo pipefail
cd "$(dirname "$0")/.."

: "${API_URL:?Set API_URL to https://api.yourdomain.com before building}"

corepack enable
corepack prepare pnpm@9.15.9 --activate

pnpm install --frozen-lockfile
pnpm db:generate
pnpm --filter @cc/domain build
pnpm --filter @cc/ui build
API_URL="$API_URL" pnpm --filter @cc/web build
bash scripts/hostinger-shared-prepare-standalone.sh

echo "Web build OK — entry: apps/web/.next/standalone/apps/web/server.js"
