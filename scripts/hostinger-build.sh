#!/usr/bin/env bash
# Hostinger / VPS production build helper (run from monorepo root)
set -euo pipefail

echo "==> Install"
pnpm install --frozen-lockfile

echo "==> Prisma generate"
pnpm db:generate

echo "==> Build packages + apps"
pnpm build

echo "==> Prepare Next standalone static assets"
STANDALONE="apps/web/.next/standalone"
if [ -d "$STANDALONE" ]; then
  mkdir -p "$STANDALONE/apps/web/.next"
  if [ -d "apps/web/.next/static" ]; then
    cp -r apps/web/.next/static "$STANDALONE/apps/web/.next/static"
  fi
  if [ -d "apps/web/public" ]; then
    cp -r apps/web/public "$STANDALONE/apps/web/public"
  fi
  echo "Standalone ready at $STANDALONE"
else
  echo "WARN: standalone folder not found — check next.config output:'standalone'"
fi

echo "==> Done. Next: set env, pnpm db:migrate:deploy, pm2 start ecosystem.config.cjs"
