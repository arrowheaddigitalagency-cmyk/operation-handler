#!/usr/bin/env bash
# Optional Hostinger Cron command file (upload + chmod +x, or paste curls into hPanel).
# Usage: CRON_SECRET=... API_BASE=https://api.yourdomain.com ./scripts/hostinger-shared-cron.sh
set -euo pipefail

: "${CRON_SECRET:?CRON_SECRET required}"
: "${API_BASE:?API_BASE required e.g. https://api.yourdomain.com}"

curl -fsS -X POST -H "x-cron-secret: ${CRON_SECRET}" "${API_BASE}/api/v1/notifications/process"
curl -fsS -X POST -H "x-cron-secret: ${CRON_SECRET}" "${API_BASE}/api/v1/maintenance/run-reminders"
curl -fsS -X POST -H "x-cron-secret: ${CRON_SECRET}" "${API_BASE}/api/v1/campaigns/run"
