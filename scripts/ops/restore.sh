#!/usr/bin/env bash
set -euo pipefail

if [ "${1:-}" = "" ]; then
  echo "Usage: $0 <pg_dump.sql> [redis.rdb]"
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DUMP="$1"
REDIS_RDB="${2:-}"

echo "Restoring PostgreSQL from $DUMP"
docker compose -f "$ROOT/docker-compose.yml" exec -T postgres \
  psql -U exam -d exam_system -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
docker compose -f "$ROOT/docker-compose.yml" exec -T postgres \
  psql -U exam -d exam_system < "$DUMP"

if [ -n "$REDIS_RDB" ] && [ -f "$REDIS_RDB" ]; then
  echo "Restoring Redis RDB (service will restart)"
  docker compose -f "$ROOT/docker-compose.yml" stop redis
  docker compose -f "$ROOT/docker-compose.yml" cp "$REDIS_RDB" redis:/data/dump.rdb
  docker compose -f "$ROOT/docker-compose.yml" start redis
fi

echo "Restore complete. Re-login required if Redis sessions were not restored."
echo "DR-01 checklist: dump applied, schema reachable, application health, one login smoke."
