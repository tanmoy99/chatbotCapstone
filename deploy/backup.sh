#!/usr/bin/env bash
#
# Daily backup of the live data: knowledge base (with its edit
# backups), visitor enquiries and answer ratings.
# Installed as /etc/cron.daily/iim-chatbot-backup by setup-vps.sh.
# Keeps the last 30 days in /var/backups/iim-chatbot.

set -euo pipefail

DATA_DIR="/var/lib/iim-chatbot"
BACKUP_DIR="/var/backups/iim-chatbot"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

tar -czf "$BACKUP_DIR/iim-chatbot-$(date +%Y-%m-%d).tar.gz" -C "$DATA_DIR" .

find "$BACKUP_DIR" -name 'iim-chatbot-*.tar.gz' -mtime +30 -delete
