# 考试系统 — 员工小程序

WeChat 小程序骨架，对应 PRD 页面 MP-01 ~ MP-09 的基础入口。

## 页面结构

| 路径 | 页面 ID | 说明 |
| --- | --- | --- |
| `pages/login/login` | MP-01 | 员工登录 |
| `pages/home/home` | MP-02 | 学习中心首页 |
| `pages/practice/practice` | MP-03~05 | 练习模式（占位） |
| `pages/exam-tasks/exam-tasks` | MP-09 | 考试任务列表 |

## 前置条件

- 后端 API 运行于 `http://localhost:8088/api/v1`
- 微信开发者工具（稳定版）

## 本地开发步骤

1. 克隆仓库并启动后端服务（Spring Boot，端口 8088）。

2. 打开微信开发者工具，选择「导入项目」。

3. 项目目录选择本仓库下的 `mini-program/` 文件夹。

4. AppID 可选择「测试号」或「使用测试号」。

5. 在开发者工具中开启「不校验合法域名、web-view、TLS 版本以及 HTTPS 证书」（本地开发必须）。

6. 编译运行，默认进入登录页。

## API 配置

默认 API 地址在 `app.js` 的 `globalData.apiBase`：

```js
const API_BASE = 'http://localhost:8088/api/v1'
```

生产环境请修改为实际域名，并在微信公众平台配置 request 合法域名。

## 认证

- 登录：`POST /auth/login`，body `{ employeeNo, password }`
- Token 存储于 `wx.setStorageSync('exam_token')`
- 后续请求在 header 中携带 `Authorization: Bearer <token>`

## 设计规范

- 主色：`#1B4B8A`
- 背景：`#F5F7FA`

详见 `docs/03-研发对接/` 下的视觉与组件规范文档。
