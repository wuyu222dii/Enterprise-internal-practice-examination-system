#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$ROOT/scripts/ops/backups}"
mkdir -p "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

echo "Dumping PostgreSQL to $BACKUP_DIR/pg_${STAMP}.sql"
docker compose -f "$ROOT/docker-compose.yml" exec -T postgres \
  pg_dump -U exam --no-owner exam_system > "$BACKUP_DIR/pg_${STAMP}.sql"

echo "Saving Redis snapshot"
docker compose -f "$ROOT/docker-compose.yml" exec -T redis redis-cli SAVE >/dev/null
docker compose -f "$ROOT/docker-compose.yml" cp redis:/data/dump.rdb "$BACKUP_DIR/redis_${STAMP}.rdb" 2>/dev/null \
  || echo "WARN: could not copy Redis RDB; session data may be rebuilt by re-login"

echo "Object storage: copy MinIO data except credentials/"
if [ -d "$ROOT/miniodata" ]; then
  mkdir -p "$BACKUP_DIR/minio_${STAMP}"
  rsync -a --exclude 'credentials/' "$ROOT/miniodata/" "$BACKUP_DIR/minio_${STAMP}/" || true
fi

ln -sfn "pg_${STAMP}.sql" "$BACKUP_DIR/pg_latest.sql"
echo "Backup complete. Confirm:"
echo "  1. PostgreSQL dump size: $(wc -c < "$BACKUP_DIR/pg_${STAMP}.sql") bytes"
echo "  2. Redis SAVE issued"
echo "  3. credentials/ excluded from object backup (ACC-02)"
echo "  4. Restore drill: scripts/ops/restore.sh $BACKUP_DIR/pg_${STAMP}.sql"
