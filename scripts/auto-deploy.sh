#!/usr/bin/env bash
# Poll GitHub for new commits on main and run full deploy (deploy.sh owns git + build + PM2).
#
# Install (example path — adjust to your clone):
#   crontab -e → * * * * * /var/www/htworks/momos/scripts/auto-deploy.sh
#
# Logs: /var/log/momos-deploy.log (override with DEPLOY_LOG)
#
# Notes:
#   - Private repos need git credentials on the server (deploy key or HTTPS token).
#   - deploy.sh uses flock — overlapping cron ticks exit cleanly.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/usr/local/sbin:${PATH:-}"

LOG="${DEPLOY_LOG:-/var/log/momos-deploy.log}"
DEPLOY_SCRIPT="$ROOT/deploy.sh"

{
  echo "--- $(date -Is) auto-deploy check ---"
  git fetch origin main
  LOCAL="$(git rev-parse HEAD)"
  REMOTE="$(git rev-parse origin/main)"
  if [[ "$LOCAL" != "$REMOTE" ]]; then
    echo "Changes detected ($LOCAL → $REMOTE) → running deploy.sh..."
    bash "$DEPLOY_SCRIPT"
    echo "Deploy complete"
  else
    echo "No changes"
  fi
} >>"$LOG" 2>&1
