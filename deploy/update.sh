#!/usr/bin/env bash
#
# Deploy the latest code from git to the VPS.
#
# Usage (as root):  bash /opt/iim-chatbot/deploy/update.sh
#
# Live knowledge, enquiries and feedback live in /var/lib/iim-chatbot,
# outside the git folder, so an update never touches them.

set -euo pipefail

APP_USER="iimbot"
APP_DIR="/opt/iim-chatbot"

cd "$APP_DIR"

echo "==> Fetching code"
sudo -u "$APP_USER" git pull --ff-only

echo "==> Installing dependencies"
sudo -u "$APP_USER" npm ci --omit=dev

echo "==> Checking the knowledge seed and syntax"
sudo -u "$APP_USER" node scripts/validate-kb.js
sudo -u "$APP_USER" node --check server.js

echo "==> Restarting (in-flight answers are allowed to finish)"
sudo -u "$APP_USER" pm2 reload iim-chatbot

for attempt in $(seq 1 20); do
  if curl -fsS http://127.0.0.1:3100/api/health; then
    echo
    echo "Update complete."
    exit 0
  fi
  sleep 1
done

echo "The app did not answer its health check. Logs:"
sudo -u "$APP_USER" pm2 logs iim-chatbot --lines 50 --nostream
exit 1
