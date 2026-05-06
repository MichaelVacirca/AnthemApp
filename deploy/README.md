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

## Operational notes

- **Logs:** `journalctl -u anthem -f` (app), `journalctl -u caddy -f` (TLS/proxy).
- **Env changes** require a service restart: edit `/etc/anthem/anthem.env`,
  then `sudo systemctl restart anthem`.
- **Postgres backups** are NOT set up automatically. Recommend a daily
  `pg_dump` cron to a separate volume or off-droplet (DO Spaces, S3).
  Quickest: `0 4 * * * pg_dump -U anthem anthem | gzip > /srv/anthem/backups/$(date +\%F).sql.gz`
- **Rate-limit table grows.** `auth_attempt` rows accumulate forever.
  Recommend a weekly cleanup once you're live:
  `DELETE FROM auth_attempt WHERE attempted_at < now() - interval '30 days';`
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
