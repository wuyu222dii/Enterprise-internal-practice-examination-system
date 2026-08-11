# 企业内部练习与考试系统交互原型

面向产品与研发评审的三端可点击原型，覆盖员工小程序、Web 正式考试端和 Web 管理后台共 33 个页面。

## 本地运行

运行环境：Node.js 20.19 或更高版本。

```bash
npm install
npm run dev
```

根路径会直接打开 `MP-02` 员工首页。左侧评审工具可切换三端、页面、状态和八条端到端流程；隐藏后可查看纯产品画布。

## 验证命令

```bash
npm run lint
npm run test
npm run build
npm run test:e2e
```

Playwright 会把代表性页面截图写入 `artifacts/screenshots/`。

## 原型边界

- 使用本地假数据模拟保存、计时、导入、故障和导出。
- 不连接后端，不发送短信，不解析真实 Excel，不持久化业务数据。
- 业务规则以 [原型设计方案](../docs/02-方案设计/原型设计方案.md) 和已确认 PRD 为准。
