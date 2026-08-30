# 容量压测（PERF-01~04）

脚本默认按 **500 人** 规模设计，必须在**独立压测机**上跑满，禁止用本机抽样数字作为验收。

## 前置

- PostgreSQL :5433、API :8088、造数见 `seed-capacity.sql`
- 安装 [k6](https://k6.io/)
- 先看连接池（`hikari.maximum-pool-size=60`）与考试端保存 debounce（600ms）是否把保存尾延迟压回 1s

```bash
docker exec -i exam_system-postgres-1 psql -U exam -d exam_system < scripts/load-test/seed-capacity.sql
EXAM_ID=$(scripts/load-test/setup-capacity-exam.sh | tail -1)

# PERF-01 500 VU × 30min
EXAM_ID=$EXAM_ID k6 run scripts/load-test/perf01-sustained.js

# PERF-02 500 开卷 + 500 交卷
EXAM_ID=$EXAM_ID PHASE=open k6 run scripts/load-test/perf02-burst.js
EXAM_ID=$EXAM_ID PHASE=submit k6 run scripts/load-test/perf02-burst.js

# PERF-03 500 同秒到期
EXAM_ID=$EXAM_ID k6 run scripts/load-test/perf03-expiry.js
```

结果写入 [docs/06-测试验收/验收追踪.md](../../docs/06-测试验收/验收追踪.md) 的 P50/P95/P99 与失败明细。
