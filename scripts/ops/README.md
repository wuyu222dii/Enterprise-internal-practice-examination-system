# 备份与恢复（DR-01 / DR-02）

开发端口：PostgreSQL **5433**、Redis **6380**、MinIO **19000**。

```bash
chmod +x scripts/ops/backup.sh scripts/ops/restore.sh
scripts/ops/backup.sh
scripts/ops/restore.sh scripts/ops/backups/pg_latest.sql
```

## 确认点（DR-01）

1. PostgreSQL 逻辑备份可独立恢复到空库
2. Redis 会话可丢弃并靠重新登录重建（RPO 以已确认写入的 PostgreSQL 为准）
3. 对象存储恢复时排除 `credentials/`（ACC-02 凭据不进备份）
4. 应用 `GET /api/v1/actuator/health` 在恢复后为 UP，管理员可登录

密钥：MinIO access/secret 只放环境变量或密钥管理，不进 git（见仓库根目录 `.env.example`）。
