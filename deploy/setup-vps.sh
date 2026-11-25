#!/usr/bin/env bash
#
# One-time setup of the IIM AI Assistant on an Ubuntu 22.04/24.04
# VPS (e.g. Hostinger KVM 2 or larger). Safe to re-run: it skips
# steps that are already done and never overwrites an existing .env.
#
# Usage (as root):
#   bash setup-vps.sh <domain> <git-repo-url> <email-for-https-notices>
#
# Example:
#   bash setup-vps.sh myiim.network https://github.com/tanmoy99/chatbotCapstone.git you@example.com
#
# Read docs/DEPLOYMENT.md first.

set -euo pipefail

DOMAIN="${1:?Usage: setup-vps.sh <domain> <git-repo-url> <email>}"
REPO_URL="${2:?Usage: setup-vps.sh <domain> <git-repo-url> <email>}"
CERT_EMAIL="${3:?Usage: setup-vps.sh <domain> <git-repo-url> <email>}"

APP_USER="iimbot"
APP_DIR="/opt/iim-chatbot"
DATA_DIR="/var/lib/iim-chatbot"
LOG_DIR="/var/log/iim-chatbot"
MODEL="${OLLAMA_MODEL:-llama3.2:3b}"

step() { printf '\n==> %s\n' "$*"; }

if [[ $EUID -ne 0 ]]; then
  echo "Run this script as root (sudo bash setup-vps.sh ...)." >&2
  exit 1
fi

step "Installing system packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y git curl ca-certificates nginx ufw openssl zstd \
  certbot python3-certbot-nginx

step "Installing Node.js 22 (if needed)"
NODE_MAJOR=0
if command -v node >/dev/null 2>&1; then
  NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
fi
if (( NODE_MAJOR < 20 )); then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
node --version

if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2
fi

step "Installing Ollama (if needed)"
if ! command -v ollama >/dev/null 2>&1; then
  curl -fsSL https://ollama.com/install.sh | sh
fi

# Keep the model loaded and Ollama reachable only from this server.
mkdir -p /etc/systemd/system/ollama.service.d
cat > /etc/systemd/system/ollama.service.d/iim.conf <<'EOF'
[Service]
Environment="OLLAMA_KEEP_ALIVE=-1"
Environment="OLLAMA_HOST=127.0.0.1:11434"
Environment="OLLAMA_NUM_PARALLEL=2"
EOF
systemctl daemon-reload
systemctl enable --now ollama
systemctl restart ollama

for attempt in $(seq 1 30); do
  curl -fsS http://127.0.0.1:11434/api/tags >/dev/null 2>&1 && break
  sleep 1
done

step "Downloading the model $MODEL (about 2 GB the first time)"
ollama pull "$MODEL"

step "Creating the app user and folders"
if ! id "$APP_USER" >/dev/null 2>&1; then
  useradd --system --create-home --home-dir "/home/$APP_USER" --shell /bin/bash "$APP_USER"
fi
mkdir -p "$DATA_DIR" "$LOG_DIR"
chown "$APP_USER:$APP_USER" "$DATA_DIR" "$LOG_DIR"
chmod 750 "$DATA_DIR"

step "Fetching the app"
if [[ -d "$APP_DIR/.git" ]]; then
  sudo -u "$APP_USER" git -C "$APP_DIR" pull --ff-only
else
  mkdir -p "$APP_DIR"
  chown "$APP_USER:$APP_USER" "$APP_DIR"
  sudo -u "$APP_USER" git clone "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"
sudo -u "$APP_USER" npm ci --omit=dev

step "Writing settings (.env)"
if [[ -f "$APP_DIR/.env" ]]; then
  echo ".env already exists; leaving it unchanged."
  GENERATED_PASSWORD=""
else
  GENERATED_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-24)"
  cat > "$APP_DIR/.env" <<EOF
# IIM AI Assistant production settings. See .env.example for every option.
PORT=3100
HOST=127.0.0.1
TRUST_PROXY=1

OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=$MODEL
REQUEST_TIMEOUT_MS=60000
MAX_MESSAGE_LENGTH=1500

ADMIN_PASSWORD=$GENERATED_PASSWORD

KNOWLEDGE_DATA_PATH=$DATA_DIR/knowledge-base.json
CHAT_RATE_LIMIT_PER_MINUTE=20
ENQUIRY_LIMIT_PER_10_MINUTES=5

# WhatsApp number for the contact card (digits with country code).
HANDOFF_WHATSAPP=

# Sites allowed to embed the chat button, separated by spaces.
EMBED_ALLOWED_ORIGINS=

# Enquiry emails (Hostinger mailbox). Fill in, then: pm2 restart iim-chatbot
# SMTP_HOST=smtp.hostinger.com
# SMTP_PORT=465
# SMTP_USER=assistant@$DOMAIN
# SMTP_PASS=
# ENQUIRY_TO=info@iim-africa.org
# ENQUIRY_FROM=assistant@$DOMAIN
EOF
  chown "$APP_USER:$APP_USER" "$APP_DIR/.env"
  chmod 600 "$APP_DIR/.env"
fi

step "Starting the app with pm2"
sudo -u "$APP_USER" bash -c "cd '$APP_DIR' && (pm2 describe iim-chatbot >/dev/null 2>&1 && pm2 reload deploy/ecosystem.config.js || pm2 start deploy/ecosystem.config.js) && pm2 save"
env PATH="$PATH" pm2 startup systemd -u "$APP_USER" --hp "/home/$APP_USER" >/dev/null

step "Configuring nginx for $DOMAIN"
sed "s/DOMAIN_NAME/$DOMAIN/g" "$APP_DIR/deploy/nginx-iim-chatbot.conf" \
  > /etc/nginx/sites-available/iim-chatbot
ln -sf /etc/nginx/sites-available/iim-chatbot /etc/nginx/sites-enabled/iim-chatbot
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

step "Firewall: allow SSH and web traffic only"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

step "HTTPS certificate"
# Include www only if it has a DNS record; otherwise the whole
# certificate request would fail.
CERT_DOMAINS=(-d "$DOMAIN")
if getent hosts "www.$DOMAIN" >/dev/null 2>&1; then
  CERT_DOMAINS+=(-d "www.$DOMAIN")
else
  echo "www.$DOMAIN has no DNS record; requesting a certificate for $DOMAIN only."
fi

if certbot --nginx "${CERT_DOMAINS[@]}" --redirect \
     -m "$CERT_EMAIL" --agree-tos -n; then
  echo "HTTPS is set up."
else
  echo "Certificate request failed. Check that $DOMAIN points to this server's"
  echo "IP address (DNS changes can take up to an hour), then run:"
  echo "  certbot --nginx ${CERT_DOMAINS[*]} --redirect -m $CERT_EMAIL --agree-tos"
fi

step "Daily backup of enquiries, feedback and knowledge"
install -m 755 "$APP_DIR/deploy/backup.sh" /etc/cron.daily/iim-chatbot-backup

step "Checking the app"
for attempt in $(seq 1 20); do
  if curl -fsS http://127.0.0.1:3100/api/health; then
    echo
    break
  fi
  sleep 1
done

echo
echo "Done. Open https://$DOMAIN"
if [[ -n "$GENERATED_PASSWORD" ]]; then
  echo
  echo "Admin page: https://$DOMAIN/admin/"
  echo "Admin password (shown once; it is also in $APP_DIR/.env):"
  echo "  $GENERATED_PASSWORD"
fi
