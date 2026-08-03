#!/usr/bin/env bash
# Copy Next standalone static + public assets (required after next build).
set -euo pipefail
cd "$(dirname "$0")/.."

STANDALONE="apps/web/.next/standalone"
if [ ! -d "$STANDALONE" ]; then
  echo "ERROR: $STANDALONE missing — ensure apps/web next.config has output: 'standalone'"
  exit 1
fi

mkdir -p "$STANDALONE/apps/web/.next"
if [ -d "apps/web/.next/static" ]; then
  cp -r apps/web/.next/static "$STANDALONE/apps/web/.next/static"
fi
if [ -d "apps/web/public" ]; then
  cp -r apps/web/public "$STANDALONE/apps/web/public"
fi

echo "Standalone assets copied"
