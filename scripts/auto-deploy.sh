#!/usr/bin/env bash
# Poll GitHub for new commits on main; reset to origin and run full deploy.
# Install: crontab -e →  * * * * * /var/www/htworks/momos/scripts/auto-deploy.sh
# Logs: /var/log/momos-deploy.log (override with DEPLOY_LOG)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/usr/local/sbin:${PATH:-}"
export NODE_ENV=production

LOG="${DEPLOY_LOG:-/var/log/momos-deploy.log}"
{
  echo "--- $(date -Is) auto-deploy check ---"
  git fetch origin main
  LOCAL="$(git rev-parse HEAD)"
  REMOTE="$(git rev-parse origin/main)"
  if [[ "$LOCAL" != "$REMOTE" ]]; then
    echo "Changes detected → deploying..."
    git reset --hard origin/main
    /usr/bin/npm run deploy
    echo "Deploy complete"
  else
    echo "No changes"
  fi
} >>"$LOG" 2>&1
