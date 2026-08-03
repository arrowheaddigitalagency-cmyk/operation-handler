#!/usr/bin/env bash
# Install pnpm 9.x into the project (NO global npm -g).
# Hostinger blocks writing to /opt/alt/.../node_modules (ENOENT on mkdir).
#
# Usage: source this file from build scripts so PATH persists:
#   source "$(dirname "$0")/hostinger-ensure-pnpm.sh"
set -euo pipefail

PNPM_WANT="9.15.9"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TOOLS_DIR="$ROOT/.hostinger-tools"
BIN_DIR="$TOOLS_DIR/node_modules/.bin"

mkdir -p "$TOOLS_DIR"

need_install=1
if [ -x "$BIN_DIR/pnpm" ]; then
  ver="$("$BIN_DIR/pnpm" -v 2>/dev/null || true)"
  case "$ver" in
    9.*) need_install=0 ;;
  esac
fi

if [ "$need_install" = "1" ]; then
  echo "[hostinger] Installing pnpm@${PNPM_WANT} into .hostinger-tools (local, no -g)..."
  cd "$TOOLS_DIR"
  if [ ! -f package.json ]; then
    printf '%s\n' '{"name":"hostinger-tools","private":true}' > package.json
  fi
  npm install "pnpm@${PNPM_WANT}" --no-audit --no-fund --omit=dev
  cd "$ROOT"
fi

export PATH="$BIN_DIR:$PATH"
hash -r 2>/dev/null || true

if ! command -v pnpm >/dev/null 2>&1; then
  echo "[hostinger] ERROR: pnpm still not on PATH after local install" >&2
  exit 1
fi

echo "[hostinger] Using pnpm $(pnpm -v) from $BIN_DIR"
