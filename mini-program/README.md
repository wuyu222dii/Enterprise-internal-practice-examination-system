# 考试系统 — 员工小程序

对应 PRD MP-01 ~ MP-12，视觉对齐 Figma「01 员工小程序」。

## 信息架构

底部四 Tab（顺序固定）：**练习 / 模拟 / 考试 / 我的**。

| 路径 | 页面 | 说明 |
| --- | --- | --- |
| `pages/login/login` | M-01 | 工号登录、短信找回密码 |
| `pages/home/home` | M-05 | 练习 Tab：继续会话、题库、四种练习入口 |
| `pages/mock/mock` | M-08 | 模拟 Tab |
| `pages/exam-tasks/exam-tasks` | M-11 | 考试 Tab（仅任务查看，不开卷） |
| `pages/account/account` | M-我的 | 我的 Tab：记录、错题、改密、绑定/解绑 |
| `pages/practice/practice` | M-06 | 专项练习配置（非 Tab） |
| `pages/wrong-book/wrong-book` | M-15 | 错题本 |
| `pages/records/records` | M-14 | 学习记录 |

## 前置条件

- 后端 API 运行于 `http://localhost:8088/api/v1`
- 微信开发者工具（稳定版）
- 演示工号 `ADMIN001` / `Admin@123`（首登须改密）；档案手机种子为 `13800000001`。考试端演示工号 `EXAM001`，档案手机 `13800000002`。

## 本地开发步骤

1. 启动后端：`cd backend && mvn spring-boot:run`（端口 8088）。

2. 打开微信开发者工具 → **导入项目**，目录选择本仓库 `mini-program/`。

3. AppID 选择 **测试号**。

4. 右上角 **详情 → 本地设置**，勾选：

   **不校验合法域名、web-view、TLS 版本以及 HTTPS 证书**

   未勾选时，请求 `http://localhost:8088` 会被拦截。

5. 点 **编译**。登录页应显示「企业内部练习与考试」标题，底栏为练习 / 模拟 / 考试 / 我的。

## API 配置

基址在 [`config.js`](config.js)，由 `app.js` 读取：

```js
module.exports = {
  apiBase: 'http://localhost:8088/api/v1',
}
```

真机预览改为电脑局域网 IP（例如 `http://192.168.x.x:8088/api/v1`）。生产改为 HTTPS 域名，并在微信公众平台配置 request 合法域名。不要新增可选的 `config.local.js` 再 `require`：微信会按编译期依赖打包，缺文件即失败。

本地 `exam.sms.provider=mock` 时验证码固定 **123456**（后端日志会打印 mock 码）。档案无手机号时须先在管理后台「员工 → 账号设置」保存后再绑定。

## 认证

- 登录账号是**工号**，不是手机号
- Token：`wx.setStorageSync('exam_token')`
- 失败提示统一为「工号或密码错误」，不暴露账号是否存在
