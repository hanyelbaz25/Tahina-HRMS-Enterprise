#!/usr/bin/env sh
set -eu

PROJECT_DIR="${PROJECT_DIR:-$(pwd)}"
BACKUP_ROOT="${BACKUP_ROOT:-$PROJECT_DIR/backups}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
LATEST_FILE="$BACKUP_ROOT/latest"

if [ ! -f "$LATEST_FILE" ]; then
  echo "No backup pointer found at $LATEST_FILE" >&2
  exit 1
fi

BACKUP_DIR="$(cat "$LATEST_FILE")"
BEFORE="$BACKUP_DIR/table-counts.csv"
AFTER="$BACKUP_DIR/table-counts-after.csv"

if [ ! -s "$BEFORE" ]; then
  echo "Missing pre-deployment table counts: $BEFORE" >&2
  exit 1
fi

docker compose -f "$COMPOSE_FILE" exec -T db psql \
  -U "${POSTGRES_USER:-tahina}" -d "${POSTGRES_DB:-tahina_hrms}" \
  -At -F ',' -c "SELECT schemaname || '.' || relname, n_live_tup FROM pg_stat_user_tables ORDER BY 1;" \
  > "$AFTER"

awk -F',' '
  NR==FNR { before[$1]=$2; next }
  {
    if (($1 in before) && $2 < before[$1]) {
      printf "Protected table count decreased: %s before=%s after=%s\n", $1, before[$1], $2 > "/dev/stderr"
      failed=1
    }
  }
  END { exit failed ? 1 : 0 }
' "$BEFORE" "$AFTER"

echo "Data verification passed. No existing table count decreased."
