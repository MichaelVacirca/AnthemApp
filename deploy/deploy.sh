#!/usr/bin/env bash
# Pull latest, install deps, build, run migrations, restart.
# Run as the anthem user from /srv/anthem/current:
#   sudo -u anthem /srv/anthem/current/deploy/deploy.sh

set -euo pipefail

APP_DIR=/srv/anthem/current
ENV_FILE=/etc/anthem/anthem.env
BRANCH=${BRANCH:-main}

cd "$APP_DIR"

echo "==> Fetching latest"
git fetch --prune origin
git reset --hard "origin/$BRANCH"

echo "==> Installing dependencies"
npm ci --legacy-peer-deps

echo "==> Building"
npm run build

echo "==> Running migrations"
set -a; source "$ENV_FILE"; set +a
npm run db:migrate

echo "==> Restarting service (needs sudo, will prompt if not allowed via NOPASSWD)"
sudo systemctl restart anthem
sudo systemctl --no-pager --quiet is-active anthem && echo "    anthem is active"

echo "Done. Logs: journalctl -u anthem -f"
