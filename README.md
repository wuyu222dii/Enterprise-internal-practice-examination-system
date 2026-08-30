# 企业内部练习与考试系统

面向单一企业的内部练习与正式考试平台。管理员维护题库与考试，员工在同一身份下完成练习、模拟和正式考试，三端职责严格分离。

## 文档导航

| 阶段 | 路径 | 说明 |
| --- | --- | --- |
| 需求调研 | [docs/01-需求调研/](docs/01-需求调研/) | 需求分析 V1.1、MVP 范围、62 条验收项 |
| 方案设计 | [docs/02-方案设计/](docs/02-方案设计/) | PRD 总览、三端页面级 PRD |
| 研发对接 | [docs/03-研发对接/](docs/03-研发对接/) | Figma 设计源、视觉规范、屏幕标注 |
| 接口设计 | [docs/04-接口设计/](docs/04-接口设计/) | REST API 规格、OpenAPI 3.1 |
| 数据库设计 | [docs/05-数据库设计/](docs/05-数据库设计/) | 表结构、不变量索引 |
| 测试验收 | [docs/06-测试验收/](docs/06-测试验收/) | 62 条验收追踪 |
| 部署运维 | [docs/07-部署运维/](docs/07-部署运维/) | 本地启动、压测、生产要点 |
| 设计稿 | [Figma · 产品原型](https://www.figma.com/design/0ScFyhj29qcWwstQZosPNd/%E4%BC%81%E4%B8%9A%E5%86%85%E9%83%A8%E7%BB%83%E4%B9%A0%E4%B8%8E%E8%80%83%E8%AF%95%E7%B3%BB%E7%BB%9F---%E4%BA%A7%E5%93%81%E5%8E%9F%E5%9E%8B?node-id=0-1) | 权威视觉稿与研发标注（Dev Mode） |

### 研发对接文档

| 端 | 视觉规范 | 屏幕标注 |
| --- | --- | --- |
| 总览 | [Figma 设计源说明](docs/03-研发对接/00-Figma设计源说明.md) | — |
| 员工小程序 | [视觉与组件规范](docs/03-研发对接/01-员工小程序-视觉与组件规范.md) | [屏幕标注索引](docs/03-研发对接/01-员工小程序-屏幕标注索引.md) |
| Web 正式考试端 | [视觉与组件规范](docs/03-研发对接/02-Web正式考试端-视觉与组件规范.md) | [屏幕标注索引](docs/03-研发对接/02-Web正式考试端-屏幕标注索引.md) |
| Web 管理后台 | [视觉与组件规范](docs/03-研发对接/03-Web管理后台-视觉与组件规范.md) | [屏幕标注索引](docs/03-研发对接/03-Web管理后台-屏幕标注索引.md) |

### 接口设计文档

| 文档 | 说明 |
| --- | --- |
| [API 设计说明](docs/04-接口设计/00-API设计说明.md) | 全局约定、错误码、幂等、权限、脱敏 |
| [openapi.yaml](docs/04-接口设计/openapi.yaml) | OpenAPI 3.1 机器可读规格 |
| [接口与页面映射表](docs/04-接口设计/08-接口与页面映射表.md) | FR/SYS ↔ 端点 ↔ 页面 ↔ Figma |

## 代码结构

| 目录 | 说明 |
| --- | --- |
| [backend/](backend/) | Spring Boot 3 API（Java 17） |
| [web-admin/](web-admin/) | React 管理后台 |
| [web-exam/](web-exam/) | React 正式考试端 |
| [mini-program/](mini-program/) | 微信小程序骨架 |
| [openapi/](openapi/) | OpenAPI 契约副本 |
| [scripts/](scripts/) | 冒烟测试、压测脚本 |
| [docker-compose.yml](docker-compose.yml) | 本地 PostgreSQL + Redis + MinIO |

## 快速启动

```bash
docker compose up -d
cd backend && mvn spring-boot:run
cd web-admin && npm install && npm run dev
cd web-exam && npm install && npm run dev
```

默认管理员：`ADMIN001` / `Admin@123`（首登须改密）。详见 [backend/README.md](backend/README.md)。

## 迭代状态（2026-08-30）

| 迭代 | 主题 | 状态 |
| --- | --- | --- |
| I1 | 认证与组织（改密、AD-04） | 已完成 |
| I2 | 题库与 Excel 导题 | 已完成 |
| I3 | 考试配置与发布 | 已完成 |
| I4 | 正式考试答题工作台 | 已完成 |
| I5 | 小程序练习/模拟 | 已完成 |
| I6 | 成绩/故障/审计 + E2E | 已完成 |
| I7 | 身份与组织补全（SMS/导入/凭据） | 已完成 |
| I8 | 考试策略与作答健壮性 | 已完成 |
| I9 | 管理端深度 UI + 小程序补页 | 已完成 |
| I10 | 运维生产化 + 全量验收 | 已完成 |

验收进度见 [docs/06-测试验收/验收追踪.md](docs/06-测试验收/验收追踪.md)。

## 三端架构

- **员工小程序** — 练习、模拟、正式任务查看；不在小程序内正式作答
- **Web 正式考试端** — 桌面开卷、限时答题、自动保存、交卷与受控结果
- **Web 管理后台** — 组织/员工、题库/导题、考试发布/监控、成绩导出、审计

## 归档

2026-08 前的可点击 HTML 原型已归档至 [`archive/prototype/`](archive/prototype/)，仅供历史参考。研发实现请以 Figma 与 `docs/03-研发对接/` 为准。
