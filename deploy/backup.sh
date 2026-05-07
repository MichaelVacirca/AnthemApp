#!/usr/bin/env bash
# Daily Postgres backup. Run as the postgres user via the systemd timer.
#
# Writes /srv/anthem/backups/anthem-<UTC-date>.sql.gz, keeps the last
# RETAIN_DAYS files (default 14), and prunes older ones.
#
# Optional: set BACKUP_UPLOAD_CMD to a shell command that takes the file
# path as its first arg, e.g.:
#   export BACKUP_UPLOAD_CMD='aws s3 cp "$1" s3://my-bucket/anthem/'
# and the script will run that after each successful dump.

set -euo pipefail

DB_NAME=${DB_NAME:-anthem}
BACKUP_DIR=${BACKUP_DIR:-/srv/anthem/backups}
RETAIN_DAYS=${RETAIN_DAYS:-14}

mkdir -p "$BACKUP_DIR"
chmod 750 "$BACKUP_DIR"

stamp=$(date -u +%Y-%m-%dT%H%M%SZ)
out="$BACKUP_DIR/anthem-$stamp.sql.gz"

echo "==> Dumping $DB_NAME to $out"
pg_dump --no-owner --no-acl "$DB_NAME" | gzip -9 > "$out"

if [[ -n "${BACKUP_UPLOAD_CMD:-}" ]]; then
	echo "==> Uploading $out"
	bash -c "$BACKUP_UPLOAD_CMD" _ "$out"
fi

echo "==> Pruning backups older than $RETAIN_DAYS days"
find "$BACKUP_DIR" -name 'anthem-*.sql.gz' -type f -mtime "+$RETAIN_DAYS" -print -delete

echo "Done."
