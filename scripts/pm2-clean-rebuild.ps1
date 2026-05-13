# Full clean rebuild for Next.js + Prisma behind PM2 (Windows).
#
# Before running:
# - `Set-Location` to repo root.
# - Set `$PM2_PROCESS_NAME` below (or `$env:MOMOS_PM2_APP` before invoking). Repo default PM2 app
#   name is `momos-web` (see ecosystem.config.cjs and deploy.sh). Use your real name instead of any
#   placeholder like YOUR_PM2_PROCESS_NAME if yours differs (`pm2 list`).
#
# For a local clean build without PM2 lifecycle, use `npm run build:clean` from README / package.json.
#
$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$PM2_PROCESS_NAME =
    if ($env:MOMOS_PM2_APP) { $env:MOMOS_PM2_APP }
    else { "momos-web" }

pm2 stop $PM2_PROCESS_NAME

if (Test-Path ".next") {
    Remove-Item -LiteralPath ".next" -Recurse -Force
}

npm ci

npx prisma generate

npm run build

pm2 restart $PM2_PROCESS_NAME

Write-Host "Done. Check: pm2 logs $PM2_PROCESS_NAME --lines 50" -ForegroundColor Green
