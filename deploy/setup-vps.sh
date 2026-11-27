#!/usr/bin/env bash
# One-time setup of a fresh Ubuntu 22.04/24.04 Hostinger VPS for Miller SaaS Hub.
# Run as root ON THE VPS:
#   curl -fsSL https://raw.githubusercontent.com/Fernando280773/-miller-saas-hub/main/deploy/setup-vps.sh -o setup-vps.sh
#   sudo bash setup-vps.sh your-domain.com you@example.com
# It installs Node 22, nginx, PM2 and certbot, creates a `deploy` user, clones
# the repo, and serves the app on https://your-domain.com.
set -euo pipefail

DOMAIN="${1:?Usage: setup-vps.sh <domain> <email-for-ssl>}"
EMAIL="${2:?Usage: setup-vps.sh <domain> <email-for-ssl>}"
REPO="git@github.com:Fernando280773/-miller-saas-hub.git"
APP_DIR=/var/www/miller-saas-hub
APP_USER=deploy

echo "==> System packages"
apt-get update -y
apt-get install -y curl git nginx ufw certbot python3-certbot-nginx
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
npm install -g pm2

echo "==> Firewall (SSH + web only)"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo "==> Deploy user"
id "$APP_USER" >/dev/null 2>&1 || adduser --disabled-password --gecos "" "$APP_USER"
mkdir -p "/home/$APP_USER/.ssh" && chmod 700 "/home/$APP_USER/.ssh"
touch "/home/$APP_USER/.ssh/authorized_keys" && chmod 600 "/home/$APP_USER/.ssh/authorized_keys"
# Key GitHub Actions uses to log in here (private half goes into GitHub secrets).
if [ ! -f "/home/$APP_USER/.ssh/github_actions" ]; then
  ssh-keygen -t ed25519 -N "" -C "github-actions-deploy" -f "/home/$APP_USER/.ssh/github_actions"
  cat "/home/$APP_USER/.ssh/github_actions.pub" >> "/home/$APP_USER/.ssh/authorized_keys"
fi
# Key this server uses to pull the repo (public half goes into GitHub deploy keys).
if [ ! -f "/home/$APP_USER/.ssh/id_ed25519" ]; then
  ssh-keygen -t ed25519 -N "" -C "vps-repo-read" -f "/home/$APP_USER/.ssh/id_ed25519"
fi
ssh-keyscan github.com >> "/home/$APP_USER/.ssh/known_hosts" 2>/dev/null
chown -R "$APP_USER:$APP_USER" "/home/$APP_USER/.ssh"

mkdir -p "$APP_DIR" && chown "$APP_USER:$APP_USER" "$APP_DIR"

echo "==> nginx site for $DOMAIN"
sed "s/__DOMAIN__/$DOMAIN/g" > /etc/nginx/sites-available/miller-saas-hub <<'NGINX'
server {
    listen 80;
    server_name __DOMAIN__ www.__DOMAIN__;
    client_max_body_size 20m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX
ln -sf /etc/nginx/sites-available/miller-saas-hub /etc/nginx/sites-enabled/miller-saas-hub
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "==> PM2 on boot"
env PATH="$PATH" pm2 startup systemd -u "$APP_USER" --hp "/home/$APP_USER" >/dev/null

cat <<MSG

======================================================================
 Almost done. Three manual steps:

 1) Let this server read the repo — GitHub repo → Settings → Deploy keys
    → Add deploy key (read-only), paste:
$(cat /home/$APP_USER/.ssh/id_ed25519.pub)

 2) Let GitHub Actions log in here — GitHub repo → Settings → Secrets and
    variables → Actions → New repository secret:
      VPS_HOST     = this server's IP
      VPS_USER     = $APP_USER
      VPS_SSH_KEY  = the whole private key printed by:
                     sudo cat /home/$APP_USER/.ssh/github_actions

 3) Create the app's secrets file (never committed):
      sudo -u $APP_USER nano $APP_DIR/.env.production
    with at least:
      NEXT_PUBLIC_SUPABASE_URL=...
      NEXT_PUBLIC_SUPABASE_ANON_KEY=...
      STRIPE_SECRET_KEY=sk_test_...   (sk_live_... for real cards)

 Then point $DOMAIN's DNS A record at this server, and run:
      sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN -m $EMAIL --agree-tos -n
 Finally re-run the "Deploy to VPS" workflow in GitHub → Actions
 (or merge anything to main).
======================================================================
MSG
