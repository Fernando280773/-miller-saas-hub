#!/usr/bin/env bash
# Runs ON THE VPS as the deploy user (called by .github/workflows/deploy.yml).
# Pulls main, builds, and restarts the app with zero-downtime reload.
set -euo pipefail
APP_DIR=/var/www/miller-saas-hub
REPO="git@github.com:Fernando280773/-miller-saas-hub.git"

cd "$APP_DIR"
# First run: turn the folder (which already holds .env.production) into a checkout.
if [ ! -d .git ]; then
  git init -q
  git remote add origin "$REPO"
fi
if [ ! -f .env.production ]; then
  echo "Missing $APP_DIR/.env.production — create it first (see deploy/setup-vps.sh)." >&2
  exit 1
fi
git fetch --quiet origin main
git reset --hard origin/main
npm ci --no-audit --no-fund
npm run build
pm2 startOrReload deploy/ecosystem.config.cjs --update-env
pm2 save
echo "Deployed $(git rev-parse --short HEAD)"
