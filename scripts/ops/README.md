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

## 生产窗口检查单（本期只勾选，不在本机全量切换）

切换窗口前：

- [ ] 备份：`scripts/ops/backup.sh` 成功，对象含 PostgreSQL dump，排除 `credentials/`
- [ ] 恢复演练记录：对空库跑过 `restore.sh`（可在演练库，不必动生产）
- [ ] 存储：生产 `EXAM_STORAGE_BACKEND=minio`；本地开发保持 `local`
- [ ] Prometheus 已抓取 `/api/v1/actuator/prometheus`，health 告警已接值班
- [ ] PERF 全量空表仍空则不得把本机抽样当作发布门禁通过

切换窗口中：

- [ ] 通知管理员暂停发布新考试（可选）
- [ ] 执行备份 → 切换 → `GET /api/v1/actuator/health` = UP
- [ ] 管理员登录 + 抽查一场监控页 lifecycle

回滚：用窗口前 dump 跑 `restore.sh`，应用配置回到上一版本。

密钥：MinIO access/secret 只放环境变量或密钥管理，不进 git（见仓库根目录 `.env.example`）。
