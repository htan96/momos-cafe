#!/usr/bin/env bash
# Prints recommended cron entry for poll-based auto-deploy (run once locally).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AUTO="$ROOT/scripts/auto-deploy.sh"
echo "Add one line to crontab (crontab -e):"
echo ""
echo "* * * * * $AUTO"
echo ""
echo "Ensure $AUTO is executable (chmod +x)."
echo "Ensure DEPLOY_LOG directory exists or set DEPLOY_LOG to a writable file."
