# Exam Backend

Spring Boot 3 单体后端，实现 [docs/04-接口设计](../docs/04-接口设计/) 全部 MVP API。

## 技术栈

- Java 17、Spring Boot 3.3.5、Spring Security、Spring Data JPA
- PostgreSQL 15、Flyway、Redis 7

## 本地启动

```bash
# 1. 启动依赖
docker compose up -d

# 本地端口（若与本机已有服务冲突已改映射）：
# PostgreSQL 5433 | Redis 6380 | MinIO API 19000 / Console 19001

# 2. 运行后端
cd backend
mvn spring-boot:run
```

API 基址：`http://localhost:8088/api/v1`

## 种子账号

| 工号 | 临时密码 | 档案手机 | 说明 |
| --- | --- | --- | --- |
| **ADMIN001** | **Admin@123** | `13800000001` | 全大写工号（非 `admin`）；首登须改密；具备管理员与异常处置授权 |
| **EXAM001** | 与种子一致 | `13800000002` | 考试端 / 小程序演示员工 |

手机号由 Flyway `V10` 仅在 `phone IS NULL` 时写入，不会覆盖管理端已维护的号码。绑定、解绑和短信找回必须与档案号一致。

本地默认 `exam.sms.provider=mock`，验证码固定 **123456**（日志 `SMS mock code=123456`）。生产切真短信见 [docs/07-部署运维](../docs/07-部署运维/)。

## 测试

```bash
mvn test
```

## 模块分包

| 包 | 职责 |
| --- | --- |
| `modules.auth` | 登录、会话、改密 |
| `modules.organization` | 部门、员工 |
| `modules.question` | 题库、题目版本 |
| `modules.importjob` | Excel 导题 |
| `modules.practice` | 日常练习 |
| `modules.mock` | 模拟考试 |
| `modules.exam` | 正式考试、开卷、作答、交卷 |
| `modules.scoring` | 客观题评分 |
| `modules.report` | 统计、导出、作废 |
| `modules.outage` | 故障处置 |
| `modules.audit` | 审计日志 |

## 数据库

迁移脚本：`src/main/resources/db/migration/`  
设计文档：[docs/05-数据库设计](../docs/05-数据库设计/)
