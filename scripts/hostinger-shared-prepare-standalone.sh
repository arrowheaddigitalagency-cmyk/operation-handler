#!/usr/bin/env bash
# Copy Next standalone static + public assets (required after next build).
# Verified monorepo layout (Next 15): standalone root mirrors repo; server lives under apps/web/.
set -euo pipefail
cd "$(dirname "$0")/.."

STANDALONE="apps/web/.next/standalone"
WEB_IN_STANDALONE="$STANDALONE/apps/web"
SERVER_JS="$WEB_IN_STANDALONE/server.js"

if [ ! -d "$STANDALONE" ]; then
  echo "ERROR: $STANDALONE missing — ensure apps/web next.config has output: 'standalone'"
  exit 1
fi

mkdir -p "$WEB_IN_STANDALONE/.next"
if [ -d "apps/web/.next/static" ]; then
  rm -rf "$WEB_IN_STANDALONE/.next/static"
  cp -r apps/web/.next/static "$WEB_IN_STANDALONE/.next/static"
fi
if [ -d "apps/web/public" ]; then
  rm -rf "$WEB_IN_STANDALONE/public"
  cp -r apps/web/public "$WEB_IN_STANDALONE/public"
fi

echo "Standalone assets copied"
echo "  standalone root: $STANDALONE"
echo "  static:          $WEB_IN_STANDALONE/.next/static"
echo "  public:          $WEB_IN_STANDALONE/public"
if [ -f "$SERVER_JS" ]; then
  echo "  web entry:       $SERVER_JS"
else
  echo "  WARN: $SERVER_JS not found yet (incomplete standalone — common on Windows symlink EPERM; Hostinger Linux build should create it)"
fi
