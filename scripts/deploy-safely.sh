#!/usr/bin/env sh
set -eu

PROJECT_DIR="${PROJECT_DIR:-$(pwd)}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
HEALTH_URL="${HEALTH_URL:-http://localhost:8000/health}"

cd "$PROJECT_DIR"

./scripts/backup-production.sh

echo "Building application images"
docker compose -f "$COMPOSE_FILE" build --pull

echo "Starting updated services"
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

echo "Waiting for backend health"
ATTEMPT=0
until curl -fsS "$HEALTH_URL" >/dev/null 2>&1; do
  ATTEMPT=$((ATTEMPT + 1))
  if [ "$ATTEMPT" -ge 30 ]; then
    echo "Backend health check failed after 30 attempts" >&2
    exit 1
  fi
  sleep 2
done

./scripts/verify-data.sh

echo "Deployment completed successfully"
docker compose -f "$COMPOSE_FILE" ps
