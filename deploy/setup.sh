#!/usr/bin/env bash
# One-time droplet setup. Run as root on a fresh Ubuntu 22.04 / 24.04 droplet.
# Idempotent: safe to re-run.
#
# Before running, set DOMAIN to the domain pointing at this droplet:
#   DOMAIN=anthem.example.com bash setup.sh

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
	echo "Run as root (use sudo)." >&2
	exit 1
fi

DOMAIN=${DOMAIN:-}
APP_USER=anthem
APP_ROOT=/srv/anthem
ENV_DIR=/etc/anthem
REPO_URL=${REPO_URL:-https://github.com/MichaelVacirca/AnthemApp.git}
DB_NAME=anthem
DB_USER=anthem

echo "==> Updating apt"
apt-get update -y
apt-get install -y curl ca-certificates gnupg git ufw debian-keyring debian-archive-keyring apt-transport-https

echo "==> Installing Node 20 (NodeSource)"
if ! command -v node >/dev/null || [[ "$(node -v)" != v20* ]]; then
	curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
	apt-get install -y nodejs
fi

echo "==> Installing Postgres"
apt-get install -y postgresql postgresql-contrib
systemctl enable --now postgresql

echo "==> Installing Caddy"
if ! command -v caddy >/dev/null; then
	curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/gpg.key \
		| gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
	curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt \
		| tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
	apt-get update -y
	apt-get install -y caddy
fi

echo "==> Creating app user"
if ! id "$APP_USER" >/dev/null 2>&1; then
	useradd --system --create-home --home-dir "/home/$APP_USER" --shell /bin/bash "$APP_USER"
fi

echo "==> Creating app directories"
mkdir -p "$APP_ROOT" "$ENV_DIR"
chown -R "$APP_USER:$APP_USER" "$APP_ROOT"
chmod 750 "$ENV_DIR"

echo "==> Creating Postgres role and database"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname = '$DB_USER'" | grep -q 1 || \
	sudo -u postgres psql -c "CREATE ROLE $DB_USER LOGIN PASSWORD '$(openssl rand -hex 16)';"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
	sudo -u postgres createdb -O "$DB_USER" "$DB_NAME"

echo "==> Cloning repo"
if [[ ! -d "$APP_ROOT/repo/.git" ]]; then
	sudo -u "$APP_USER" git clone "$REPO_URL" "$APP_ROOT/repo"
fi
ln -sfn "$APP_ROOT/repo" "$APP_ROOT/current"

if [[ ! -f "$ENV_DIR/anthem.env" ]]; then
	echo "==> Writing initial $ENV_DIR/anthem.env (FILL IN DATABASE_URL PASSWORD)"
	cat > "$ENV_DIR/anthem.env" <<EOF
# Set the password to whatever you used when creating the Postgres role.
# Get/reset it with: sudo -u postgres psql -c "ALTER ROLE $DB_USER PASSWORD 'newpw';"
DATABASE_URL=postgres://$DB_USER:CHANGE_ME@127.0.0.1:5432/$DB_NAME
SESSION_SECRET=$(openssl rand -hex 32)
EOF
	chown root:"$APP_USER" "$ENV_DIR/anthem.env"
	chmod 640 "$ENV_DIR/anthem.env"
fi

echo "==> Installing systemd units"
install -m 644 "$APP_ROOT/current/deploy/anthem.service" /etc/systemd/system/anthem.service
install -m 644 "$APP_ROOT/current/deploy/anthem-backup.service" /etc/systemd/system/anthem-backup.service
install -m 644 "$APP_ROOT/current/deploy/anthem-backup.timer" /etc/systemd/system/anthem-backup.timer
install -m 644 "$APP_ROOT/current/deploy/anthem-prune.service" /etc/systemd/system/anthem-prune.service
install -m 644 "$APP_ROOT/current/deploy/anthem-prune.timer" /etc/systemd/system/anthem-prune.timer

mkdir -p /srv/anthem/backups
chown postgres:postgres /srv/anthem/backups
chmod 750 /srv/anthem/backups

systemctl daemon-reload
systemctl enable anthem.service
systemctl enable --now anthem-backup.timer
systemctl enable --now anthem-prune.timer

echo "==> Installing Caddyfile"
if [[ -n "$DOMAIN" ]]; then
	sed "s/anthem.example.com/$DOMAIN/" "$APP_ROOT/current/deploy/Caddyfile" > /etc/caddy/Caddyfile
else
	echo "    DOMAIN not set; copy deploy/Caddyfile to /etc/caddy/Caddyfile manually after editing the domain."
fi
systemctl reload caddy || systemctl restart caddy

echo "==> Configuring firewall"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo
echo "Next steps:"
echo "  1. Edit $ENV_DIR/anthem.env and set the real Postgres password."
echo "     If you didn't capture the generated password, reset it with:"
echo "       sudo -u postgres psql -c \"ALTER ROLE $DB_USER PASSWORD 'something';\""
echo "  2. Run the first deploy:  sudo -u $APP_USER $APP_ROOT/current/deploy/deploy.sh"
echo "  3. Seed sample staff (optional, first time only):"
echo "       sudo -u $APP_USER bash -c 'cd $APP_ROOT/current && npm run db:seed'"
echo "  4. Start the app:  systemctl start anthem"
echo "  5. Check logs:     journalctl -u anthem -f"
