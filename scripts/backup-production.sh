#!/usr/bin/env sh
set -eu

PROJECT_DIR="${PROJECT_DIR:-$(pwd)}"
BACKUP_ROOT="${BACKUP_ROOT:-$PROJECT_DIR/backups}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="$BACKUP_ROOT/$TIMESTAMP"

mkdir -p "$BACKUP_DIR"

printf '%s\n' "Creating PostgreSQL backup in $BACKUP_DIR"
docker compose -f "$COMPOSE_FILE" exec -T db \
  pg_dump -U "${POSTGRES_USER:-tahina}" -d "${POSTGRES_DB:-tahina_hrms}" \
  --format=custom --no-owner --no-privileges \
  > "$BACKUP_DIR/database.dump"

test -s "$BACKUP_DIR/database.dump"

printf '%s\n' "Capturing protected table counts"
docker compose -f "$COMPOSE_FILE" exec -T db psql \
  -U "${POSTGRES_USER:-tahina}" -d "${POSTGRES_DB:-tahina_hrms}" \
  -At -F ',' -c "SELECT schemaname || '.' || relname, n_live_tup FROM pg_stat_user_tables ORDER BY 1;" \
  > "$BACKUP_DIR/table-counts.csv"

if [ -f .env ]; then
  cp .env "$BACKUP_DIR/.env.backup"
  chmod 600 "$BACKUP_DIR/.env.backup"
fi

sha256sum "$BACKUP_DIR/database.dump" > "$BACKUP_DIR/SHA256SUMS"
printf '%s\n' "$BACKUP_DIR" > "$BACKUP_ROOT/latest"
printf '%s\n' "Backup completed successfully: $BACKUP_DIR"
