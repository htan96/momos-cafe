#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# PRODUCTION: npm run deploy
#
# Git: fetch + reset to origin/main (matches auto-deploy + manual full sync)
# Deps → Prisma migrate deploy + generate → next build → PM2 reload
#
# Requires on server:
#   - .env and/or .env.production with DATABASE_URL, Supabase, Square vars (see .env.example)
#   - PM2; for reboot persistence run: `pm2 save` after `pm2 start` and enable `pm2 startup`
# -----------------------------------------------------------------------------
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

PM2_NAME="${PM2_NAME:-momos-web}"
LOG_PREFIX="${LOG_PREFIX:-[momos-deploy]}"

export PATH="/usr/local/bin:/usr/bin:/bin:${PATH:-}"
export NODE_ENV=production

NODE_BIN="${NODE_BIN:-/usr/bin/node}"
NPM_BIN="${NPM_BIN:-/usr/bin/npm}"

if [[ ! -x "$NODE_BIN" ]]; then
  echo "$LOG_PREFIX ERROR: Node not executable at $NODE_BIN" >&2
  exit 1
fi
if [[ ! -x "$NPM_BIN" ]]; then
  echo "$LOG_PREFIX ERROR: npm not executable at $NPM_BIN" >&2
  exit 1
fi

echo "$LOG_PREFIX Node: $($NODE_BIN -v) | npm: $($NPM_BIN -v)"
echo "$LOG_PREFIX repo root: $ROOT"

ENV_FILES=(
  "$ROOT/.env"
  "$ROOT/.env.local"
  "$ROOT/.env.production"
  "$ROOT/.env.production.local"
)
for f in "${ENV_FILES[@]}"; do
  if [[ -f "$f" ]]; then
    cp -a "$f" "${f}.deploypreserve"
  fi
done

echo "$LOG_PREFIX git: fetch + reset --hard origin/main"
git fetch origin main
git reset --hard origin/main

for f in "${ENV_FILES[@]}"; do
  if [[ -f "${f}.deploypreserve" ]]; then
    cp -a "${f}.deploypreserve" "$f"
    rm -f "${f}.deploypreserve"
  fi
done

if [[ ! -f "$ROOT/.env" && ! -f "$ROOT/.env.production" ]]; then
  echo "$LOG_PREFIX WARN: Missing .env and .env.production — Prisma and Next need DATABASE_URL and app secrets." >&2
fi

echo "$LOG_PREFIX npm install"
"$NPM_BIN" ci 2>/dev/null || "$NPM_BIN" install

echo "$LOG_PREFIX Prisma: migrate deploy"
"$NPM_BIN" run db:migrate

echo "$LOG_PREFIX Prisma: generate"
"$NPM_BIN" run db:generate

echo "$LOG_PREFIX Next.js: build"
"$NPM_BIN" run build

ECOSYSTEM="$ROOT/ecosystem.config.cjs"
echo "$LOG_PREFIX PM2: $PM2_NAME (ecosystem $(basename "$ECOSYSTEM"))"
if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
  pm2 reload "$ECOSYSTEM" --only "$PM2_NAME" --update-env
else
  pm2 start "$ECOSYSTEM" --only "$PM2_NAME"
fi

echo "$LOG_PREFIX PM2 logs ($PM2_NAME, last 40 lines)"
pm2 logs "$PM2_NAME" --lines 40 --nostream || true

echo "$LOG_PREFIX deploy finished OK."
