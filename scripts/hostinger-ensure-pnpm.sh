#!/usr/bin/env bash
# Install pnpm 9.x WITHOUT corepack (Hostinger Node 20 + corepack/pnpm 11 crashes:
# ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING).
set -euo pipefail

PNPM_WANT="9.15.9"

need_install=1
if command -v pnpm >/dev/null 2>&1; then
  ver="$(pnpm -v 2>/dev/null || true)"
  case "$ver" in
    9.*) need_install=0 ;;
  esac
fi

if [ "$need_install" = "1" ]; then
  echo "[hostinger] Installing pnpm@${PNPM_WANT} via npm (avoid broken corepack)..."
  npm install -g "pnpm@${PNPM_WANT}"
fi

echo "[hostinger] Using pnpm $(pnpm -v)"
