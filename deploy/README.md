# Deploying Anthem to a Digital Ocean droplet

Bare Node + systemd, Postgres on the same droplet, Caddy in front for auto-TLS.

## Prereqs

- Ubuntu 22.04 or 24.04 droplet
- A domain (or subdomain) with an A record pointing at the droplet's IPv4
- SSH access as root (or a user with sudo)

## First-time setup

SSH to the droplet, then:

```sh
git clone https://github.com/MichaelVacirca/AnthemApp.git /tmp/anthem-bootstrap
DOMAIN=anthem.example.com bash /tmp/anthem-bootstrap/deploy/setup.sh
```

The script is idempotent. It installs Node 20, Postgres, Caddy; creates an
`anthem` system user; clones the repo to `/srv/anthem/repo`; sets up systemd
+ Caddy + UFW; and writes a starter env file at `/etc/anthem/anthem.env`.

After it finishes:

1. **Set the Postgres password.** The setup created the role with a random
   password but the env file has `CHANGE_ME` as the placeholder. Either dig
   the password out of postgres logs, or just reset it:
   ```sh
   sudo -u postgres psql -c "ALTER ROLE anthem PASSWORD 'pick-something-strong';"
   sudo -e /etc/anthem/anthem.env   # set DATABASE_URL=postgres://anthem:pick-something-strong@127.0.0.1:5432/anthem
   ```

2. **Run the first deploy** (installs deps, builds, applies migrations):
   ```sh
   sudo -u anthem /srv/anthem/current/deploy/deploy.sh
   ```

3. **Seed sample staff** (optional, first time only — safe to skip if you'll
   add staff manually via the admin UI):
   ```sh
   sudo -u anthem bash -c 'cd /srv/anthem/current && set -a && source /etc/anthem/anthem.env && set +a && npm run db:seed'
   ```
   The seed prints the sample PINs. Default manager is **9999** (Alex).

4. **Start the service:**
   ```sh
   sudo systemctl start anthem
   sudo systemctl status anthem
   ```

5. **Verify:** visit `https://your-domain` — Caddy issues the cert on first
   request. Watch logs with `journalctl -u anthem -f`.

## Subsequent deploys

```sh
sudo -u anthem /srv/anthem/current/deploy/deploy.sh
```

This pulls `main`, runs `npm ci`, `npm run build`, applies any new
migrations, and restarts the service.

The deploy script needs to run `sudo systemctl restart anthem`. Either:
- Run the script with sudo, **or**
- Allow the `anthem` user to restart the service without a password by
  adding a sudoers drop-in:
  ```sh
  echo 'anthem ALL=(root) NOPASSWD: /bin/systemctl restart anthem' \
    | sudo tee /etc/sudoers.d/anthem-restart
  sudo chmod 440 /etc/sudoers.d/anthem-restart
  ```

## Optional: error monitoring (Sentry)

Sentry is wired in but disabled unless `SENTRY_DSN` is set. To turn it on,
add the following to `/etc/anthem/anthem.env` and restart:

```
SENTRY_DSN=https://...ingest.sentry.io/...
NEXT_PUBLIC_SENTRY_DSN=https://...ingest.sentry.io/...
SENTRY_ORG=your-sentry-org
SENTRY_PROJECT=your-sentry-project
SENTRY_AUTH_TOKEN=sntrys_...   # only needed if you want source-map uploads
```

Source maps upload during `npm run build` if `SENTRY_ORG`, `SENTRY_PROJECT`,
and `SENTRY_AUTH_TOKEN` are all set. Without them, errors still report,
just with minified stack traces.

## Operational notes

- **Logs:** `journalctl -u anthem -f` (app), `journalctl -u caddy -f` (TLS/proxy).
- **Env changes** require a service restart: edit `/etc/anthem/anthem.env`,
  then `sudo systemctl restart anthem`.
- **Postgres backups** run daily at 04:00 UTC via the `anthem-backup.timer`
  systemd timer (installed by `setup.sh`). Dumps land in
  `/srv/anthem/backups/anthem-<UTC-date>.sql.gz` and the script keeps the
  last 14 by default. Tweak `RETAIN_DAYS` or set `BACKUP_UPLOAD_CMD` in
  `/etc/anthem/backup.env` to ship dumps off-droplet (S3, DO Spaces).
  Manual run: `sudo systemctl start anthem-backup.service`. Last run:
  `sudo systemctl status anthem-backup.service` and
  `sudo journalctl -u anthem-backup.service`.
- **DB pruning** runs daily at 03:30 UTC via `anthem-prune.timer` (installed
  by `setup.sh`). Deletes `auth_attempt` rows older than 24h and
  `admin_action` rows older than 365d, then `VACUUM ANALYZE`s. Override the
  windows by writing `/etc/anthem/prune.env` with `AUTH_ATTEMPT_RETAIN_HOURS=`
  and/or `ADMIN_ACTION_RETAIN_DAYS=`. Manual run:
  `sudo systemctl start anthem-prune.service`.
- **Health check** at `GET /api/health` returns `{ ok: true, db: "up" }`
  (200) when the DB is reachable, 503 otherwise. Caddy uses this for
  upstream health and you can point uptime monitors at it too.
- **Caddy auto-renews** the TLS cert; nothing to do.
- **Trust proxy.** The systemd unit binds Next to `127.0.0.1` only; Caddy
  forwards `X-Forwarded-For`, which the rate limiter reads. Never expose
  port 3000 to the internet.

## Troubleshooting

- **`anthem` won't start:** `journalctl -u anthem -n 100 --no-pager`. Most
  common cause is a malformed `DATABASE_URL` or missing `SESSION_SECRET`.
- **Cert won't issue:** check that `:80` is reachable (`curl -v
  http://your-domain`) and that the A record points here. Caddy logs the
  ACME failure: `journalctl -u caddy -n 100 --no-pager`.
- **PIN locked out during testing:**
  `sudo -u postgres psql -d anthem -c "DELETE FROM auth_attempt;"`
