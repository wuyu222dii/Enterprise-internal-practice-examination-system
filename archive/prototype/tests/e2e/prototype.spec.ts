import { expect, test } from "@playwright/test";

const registeredPages = [
  ...Array.from({ length: 12 }, (_, index) => ({
    id: `MP-${String(index + 1).padStart(2, "0")}`,
    surface: "mini",
  })),
  ...Array.from({ length: 5 }, (_, index) => ({
    id: `EX-${String(index + 1).padStart(2, "0")}`,
    surface: "exam",
  })),
  ...Array.from({ length: 16 }, (_, index) => ({
    id: `AD-${String(index + 1).padStart(2, "0")}`,
    surface: "admin",
  })),
];

const flowRoutes = [
  {
    id: "E2E-01",
    steps: [
      ["AD-03", "partial"],
      ["AD-04", "temporary-password"],
      ["MP-01", "first-login"],
      ["MP-02", "standard"],
    ],
  },
  {
    id: "E2E-02",
    steps: [
      ["AD-05", "standard"],
      ["AD-08", "standard"],
      ["AD-09", "partial"],
      ["AD-06", "standard"],
    ],
  },
  {
    id: "E2E-03",
    steps: [
      ["MP-03", "standard"],
      ["MP-04", "incorrect"],
      ["MP-05", "standard"],
      ["MP-11", "standard"],
    ],
  },
  {
    id: "E2E-04",
    steps: [
      ["MP-06", "standard"],
      ["MP-07", "standard"],
      ["MP-08", "standard"],
      ["MP-11", "mock-completed"],
    ],
  },
  {
    id: "E2E-05",
    steps: [
      ["AD-10", "standard"],
      ["AD-11", "standard"],
      ["AD-12", "standard"],
      ["AD-13", "standard"],
    ],
  },
  {
    id: "E2E-06",
    steps: [
      ["MP-09", "standard"],
      ["MP-10", "standard"],
      ["EX-02", "standard"],
      ["EX-03", "standard"],
      ["EX-04", "standard"],
      ["EX-05", "standard"],
    ],
  },
  {
    id: "E2E-07",
    steps: [
      ["EX-04", "paused"],
      ["AD-13", "pending"],
      ["EX-05", "locked"],
      ["MP-11", "formal-locked"],
    ],
  },
  {
    id: "E2E-08",
    steps: [
      ["AD-15", "standard"],
      ["AD-14", "recalculated"],
      ["MP-11", "invalidated"],
      ["EX-05", "voided"],
      ["AD-16", "standard"],
    ],
  },
];

function routeFor(
  pageId: string,
  surface: string,
  scenario: string,
  review = true,
): string {
  return `/${surface}/${pageId}?scenario=${encodeURIComponent(scenario)}&review=${review ? "1" : "0"}`;
}

test("root opens the actual mini-program home instead of a marketing page", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/mini\/MP-02/);
  await expect(page.locator(".product-canvas")).toBeVisible();
});

test("all 33 registered pages render and expose their review trace", async ({
  page,
}) => {
  const browserErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));
  expect(registeredPages).toHaveLength(33);
  for (const item of registeredPages) {
    await page.goto(routeFor(item.id, item.surface, "standard"));
    await expect(page.locator(".review-toolbar__title strong")).toContainText(
      item.id,
    );
    await expect(page.locator(".product-canvas")).toBeVisible();
    await expect(page.locator(".surface-placeholder")).toHaveCount(0);
  }
  expect(browserErrors).toEqual([]);
});

test("the eight end-to-end flows persist and advance through every registered page and scenario", async ({
  page,
}) => {
  await page.goto("/mini/MP-02?scenario=standard");
  for (const flow of flowRoutes) {
    await page.locator("#flow-select").selectOption(flow.id);
    for (let index = 0; index < flow.steps.length; index += 1) {
      const [pageId, scenario] = flow.steps[index];
      await expect(page).toHaveURL(
        new RegExp(`${pageId}\\?scenario=${scenario}.*flow=${flow.id}`),
      );
      await expect(page.locator("#scenario-select")).toHaveValue(scenario);
      if (index < flow.steps.length - 1) {
        await page.getByRole("button", { name: "下一步", exact: true }).click();
      }
    }
  }
});

test("flow selection follows browser history and free browsing clears its URL state", async ({
  page,
}) => {
  await page.goto("/mini/MP-02?scenario=standard");
  await page.locator("#flow-select").selectOption("E2E-03");
  await expect(page).toHaveURL(/MP-03\?scenario=standard&flow=E2E-03/);
  await page.locator("#flow-select").selectOption("E2E-04");
  await expect(page).toHaveURL(/MP-06\?scenario=standard&flow=E2E-04/);

  await page.goBack();
  await expect(page).toHaveURL(/MP-03\?scenario=standard&flow=E2E-03/);
  await expect(page.locator("#flow-select")).toHaveValue("E2E-03");

  await page.locator("#flow-select").selectOption("");
  await expect(page).toHaveURL(/MP-03\?scenario=standard$/);
  await expect(page.locator("#flow-select")).toHaveValue("");
});

test("review chrome can be hidden without hiding the product", async ({
  page,
}) => {
  await page.goto("/exam/EX-04");
  await page.getByRole("button", { name: "隐藏评审工具" }).first().click();
  await expect(page.locator(".review-sidebar")).toHaveCount(0);
  await expect(page.locator(".product-canvas")).toBeVisible();
  await expect(page.getByRole("button", { name: /评审工具/ })).toBeVisible();
});

test("pure product mode persists across product navigation without floating review controls", async ({
  page,
}) => {
  await page.goto(routeFor("MP-02", "mini", "standard", false));
  await page.getByRole("button", { name: "学习", exact: true }).click();
  await expect(page).toHaveURL(/\/mini\/MP-03\?.*review=0/);
  await expect(page.locator(".review-sidebar")).toHaveCount(0);
  await expect(page.locator(".review-show")).toHaveCount(0);
});

test("locked result scenario contains no score, answer or official-attempt disclosure", async ({
  page,
}) => {
  await page.goto(routeFor("EX-05", "exam", "locked", false));
  const canvas = page.locator(".product-canvas");
  await expect(canvas).toContainText("锁定");
  await expect(canvas).not.toContainText("标准答案");
  await expect(canvas).not.toContainText("官方尝试");
  await expect(canvas).not.toContainText("86 分");
});

test("answer save failure and expiry observation both block submission", async ({
  page,
}) => {
  await page.goto(routeFor("EX-04", "exam", "save-failed", false));
  await page.getByRole("button", { name: "提交试卷" }).click();
  await expect(page.locator(".product-canvas")).toContainText(
    "尚有答案未确认，无法交卷",
  );

  await page.goto(routeFor("EX-04", "exam", "expiry-observe", false));
  await expect(page.locator(".product-canvas")).toContainText(
    "答题时间已到，正在确认平台运行状态",
  );
  await expect(page.getByRole("button", { name: "提交试卷" })).toBeDisabled();
});

test("offline mock answers cannot be submitted before server confirmation", async ({
  page,
}) => {
  await page.goto(routeFor("MP-07", "mini", "offline", false));
  await expect(page.locator(".product-canvas")).toContainText("未确认保存");
  await expect(page.getByRole("button", { name: "提交试卷" })).toBeDisabled();
});

test("a submitted formal exam can converge from pending to the published result", async ({
  page,
}) => {
  await page.goto(routeFor("EX-05", "exam", "pending", false));
  await expect(page.locator(".product-canvas")).not.toContainText("官方得分");
  await page.getByRole("button", { name: "刷新结果状态" }).click();
  await expect(page).toHaveURL(/\/exam\/EX-05\?scenario=standard/);
  await expect(page.locator(".product-canvas")).toContainText("官方得分");
  await expect(page.locator(".product-canvas")).toContainText("88 / 100");
});

test("the formal exam opening window is identical across mini, exam and admin surfaces", async ({
  page,
}) => {
  for (const [pageId, surface] of [
    ["MP-10", "mini"],
    ["EX-03", "exam"],
  ]) {
    await page.goto(routeFor(pageId, surface, "standard", false));
    await expect(page.locator(".product-canvas")).toContainText(
      "2026-08-12 18:00",
    );
  }
  await page.goto(routeFor("AD-11", "admin", "standard", false));
  await expect(page.getByLabel("停止新开卷", { exact: true })).toHaveValue(
    "2026-08-12 18:00",
  );
});

test("a normal retry offers only the second allowed attempt", async ({
  page,
}) => {
  await page.goto(routeFor("EX-05", "exam", "retry", false));
  await expect(
    page.getByRole("button", { name: "开始第 2 次考试" }),
  ).toBeVisible();
  await expect(page.locator(".exam-attempts-panel tbody tr")).toHaveCount(1);
});

test("employee imports reach credential delivery and one-time download expiry", async ({
  page,
}) => {
  await page.goto(routeFor("AD-03", "admin", "standard", false));
  await page.getByRole("button", { name: "批量导入" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "确认" }).click();
  await expect(page).toHaveURL(/scenario=partial/);
  await page.getByRole("button", { name: "确认建档 96 人" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "确认" }).click();
  await expect(page).toHaveURL(/scenario=credential/);
  await expect(page.locator(".product-canvas")).toContainText("批量凭据待下载");
  await page.getByRole("button", { name: "下载一次" }).click();
  await expect(page).toHaveURL(/scenario=expired/);
  await expect(page.locator(".product-canvas")).toContainText("批量凭据已失效");
});

test("SMS verification actions cannot be bypassed in mini-program and admin recovery", async ({
  page,
}) => {
  await page.goto(routeFor("MP-01", "mini", "sms", false));
  await expect(page.getByRole("button", { name: "验证并继续" })).toBeDisabled();
  await page.getByRole("button", { name: "发送验证码" }).click();
  await page.getByLabel("短信验证码").fill("123456");
  await expect(page.getByRole("button", { name: "验证并继续" })).toBeEnabled();

  await page.goto(routeFor("AD-01", "admin", "standard", false));
  await page.getByRole("button", { name: "使用短信验证码找回密码" }).click();
  await expect(
    page.getByRole("button", { name: "验证并重置密码" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "发送验证码" }).click();
  await page.getByLabel("6 位短信验证码").fill("123456");
  await expect(
    page.getByRole("button", { name: "验证并重置密码" }),
  ).toBeDisabled();
  await page.getByLabel("设置新密码").fill("Strong#2026");
  await page.getByLabel("确认新密码").fill("Strong#2026");
  await expect(
    page.getByRole("button", { name: "验证并重置密码" }),
  ).toBeEnabled();
});

test("account password change and unbind actions enforce their complete input gates", async ({
  page,
}) => {
  await page.goto(routeFor("MP-01", "mini", "first-login", false));
  const firstLogin = page.getByRole("button", { name: "保存并验证手机" });
  await expect(firstLogin).toBeDisabled();
  await page.getByLabel("新密码", { exact: true }).fill("Employee#2026");
  await page.getByLabel("确认新密码").fill("Different#2026");
  await expect(firstLogin).toBeDisabled();
  await page.getByLabel("确认新密码").fill("Employee#2026");
  await expect(firstLogin).toBeEnabled();

  await page.goto(routeFor("MP-01", "mini", "recovery", false));
  const recover = page.getByRole("button", { name: "确认重置" });
  await page.getByRole("button", { name: "发送验证码" }).click();
  await page.getByLabel("短信验证码").fill("123456");
  await expect(recover).toBeDisabled();
  await page.getByLabel("新密码", { exact: true }).fill("Employee#2026");
  await page.getByLabel("确认新密码").fill("Employee#2026");
  await expect(recover).toBeEnabled();

  await page.goto(routeFor("MP-12", "mini", "unbind", false));
  const unbind = page.getByRole("button", { name: "验证并解除绑定" });
  await expect(unbind).toBeDisabled();
  await page.getByRole("button", { name: "发送验证码" }).click();
  await expect(unbind).toBeDisabled();
  await page.getByLabel("短信验证码").fill("123456");
  await expect(unbind).toBeEnabled();
  await unbind.click();
  await expect(page.locator(".product-canvas")).toContainText(
    "确认解除小程序绑定？",
  );
  await expect(
    page.getByRole("button", { name: "确认解除绑定" }),
  ).toBeVisible();

  await page.goto(routeFor("MP-12", "mini", "password", false));
  const changePassword = page.getByRole("button", { name: "确认修改" });
  await expect(changePassword).toBeDisabled();
  await page.getByLabel("当前密码").fill("Old#Pass2025");
  await page.getByLabel("新密码", { exact: true }).fill("Strong#2026");
  await page.getByLabel("确认新密码").fill("Mismatch#2026");
  await expect(changePassword).toBeDisabled();
  await page.getByLabel("确认新密码").fill("Strong#2026");
  await expect(changePassword).toBeEnabled();

  await page.goto(routeFor("AD-01", "admin", "first-change", false));
  const enterAdmin = page.getByRole("button", { name: /保存并进入后台/ });
  await expect(enterAdmin).toBeDisabled();
  await page.getByLabel("新密码", { exact: true }).fill("Admin#2026");
  await page.getByLabel("确认新密码").fill("Different#2026");
  await expect(enterAdmin).toBeDisabled();
  await page.getByLabel("确认新密码").fill("Admin#2026");
  await expect(enterAdmin).toBeEnabled();
});

test("practice advances to the next question instead of ending the session early", async ({
  page,
}) => {
  await page.goto(routeFor("MP-04", "mini", "standard", false));
  const canvas = page.locator(".product-canvas");
  await expect(canvas).toContainText("第 18 / 50 题");
  await page
    .getByRole("button", { name: /C.*企业安全渠道报告并删除邮件/ })
    .click();
  await page.getByRole("button", { name: "提交答案" }).click();
  await expect(canvas).toContainText("回答正确");
  await page.getByRole("button", { name: "下一题" }).click();
  await expect(canvas).toContainText("第 19 / 50 题");
  await expect(canvas).not.toContainText("本轮练习已完成");
});

test("mock exam supports previous, next and answer-card navigation while preserving answers", async ({
  page,
}) => {
  await page.goto(routeFor("MP-07", "mini", "standard", false));
  const canvas = page.locator(".product-canvas");
  await expect(canvas).toContainText("第 12 / 20 题");
  await page.getByRole("button", { name: "下一题" }).click();
  await expect(canvas).toContainText("第 13 / 20 题");
  await page.getByRole("button", { name: /C.*定期检查异常登录/ }).click();
  await page.getByRole("button", { name: "答题卡" }).click();
  await expect(canvas).toContainText("已答 2 / 20 题");
  await page
    .locator(".mini-answer-card-grid")
    .getByRole("button", { name: "20" })
    .click();
  await expect(canvas).toContainText("第 20 / 20 题");
  await expect(page.getByRole("button", { name: "下一题" })).toBeDisabled();
  await page.getByRole("button", { name: "上一题" }).click();
  await expect(canvas).toContainText("第 19 / 20 题");
});

test("precheck failures block publishing while partial imports remain confirmable", async ({
  page,
}) => {
  await page.goto(routeFor("AD-12", "admin", "failed", false));
  await expect(page.locator(".product-canvas")).toContainText("规则阻断项");
  await expect(page.locator(".product-canvas")).toContainText("定位重叠");
  await expect(
    page.getByRole("button", { name: "确认冻结并发布" }),
  ).toBeDisabled();

  await page.goto(routeFor("AD-09", "admin", "partial", false));
  const canvas = page.locator(".product-canvas");
  await expect(canvas).toContainText("972");
  await expect(canvas).toContainText("28");
  await expect(page.getByRole("button", { name: "确认导入" })).toBeEnabled();
});

test("failed and expired result exports can be regenerated and downloaded with feedback", async ({
  page,
}) => {
  await page.goto(routeFor("AD-14", "admin", "export-failed", false));
  await page.getByRole("button", { name: "重新生成" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "确认" }).click();
  await expect(page.locator(".product-canvas")).toContainText("排队中");
  await expect(page.locator(".product-canvas")).toContainText("已完成", {
    timeout: 3000,
  });
  await page.getByRole("button", { name: "下载" }).click();
  await expect(page.locator(".product-canvas")).toContainText("下载已开始");
  await expect(page.getByRole("button", { name: "已下载" })).toBeDisabled();

  await page.goto(routeFor("AD-14", "admin", "export-expired", false));
  await page.getByRole("button", { name: "重新生成" }).click();
  await expect(page.getByRole("dialog")).toContainText("生成成绩导出");
});

test("severe consistency incidents lock official results across monitoring and reports", async ({
  page,
}) => {
  await page.goto(routeFor("AD-13", "admin", "result-locked", false));
  const monitoring = page.locator(".product-canvas");
  await expect(monitoring).toContainText("严重一致性故障");
  await expect(monitoring).not.toContainText("结果进度");
  await expect(monitoring).not.toContainText("已通过");
  await expect(
    page.getByRole("button", { name: "结果已锁定" }).first(),
  ).toBeDisabled();
  await page.getByRole("button", { name: "成绩统计" }).click();
  await expect(page).toHaveURL(/\/admin\/AD-14\?scenario=locked/);

  const results = page.locator(".product-canvas");
  await expect(results).toContainText("官方结果当前不可用");
  await expect(results).not.toContainText("通过率");
  await expect(results).not.toContainText("官方得分");
  await expect(results).not.toContainText("96");
});

test("voiding an attempt preserves facts and moves the page to a recalculated terminal state", async ({
  page,
}) => {
  await page.goto(routeFor("AD-15", "admin", "standard", false));
  await page.getByRole("button", { name: "作废尝试 #2" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("原始事实不会删除");
  await expect(dialog.getByRole("button", { name: "确认" })).toBeDisabled();
  await dialog.getByLabel("内部处置原因").fill("设备异常导致本次尝试无效");
  await dialog.getByLabel("员工可见说明").fill("本次尝试已作废并返还一次机会");
  await dialog.getByRole("button", { name: "确认" }).click();
  await expect(page).toHaveURL(/scenario=voided/);
  await expect(page.locator(".product-canvas")).toContainText("尝试 #2 已作废");
  await expect(page.locator(".product-canvas")).toContainText(
    "官方结果 72 · 未通过 · 尝试 #1",
  );
  await expect(page.locator(".product-canvas")).toContainText(
    "尝试 #1 的 72 分成为新官方结果",
  );
  await page.getByRole("button", { name: "返回成绩" }).click();
  await expect(page).toHaveURL(/\/admin\/AD-14\?scenario=recalculated/);
  await expect(page.locator(".product-canvas")).toContainText("作废后重算完成");
  await expect(page.locator(".product-canvas")).toContainText("80 / 11");
  await expect(page.locator(".product-canvas")).toContainText("60.61%");
  await expect(page.locator(".product-canvas")).toContainText("未通过");
});

test("voided-attempt facts stay identical across admin, mini-program and exam result views", async ({
  page,
}) => {
  const cases = [
    ["AD-15", "admin", "voided"],
    ["AD-14", "admin", "recalculated"],
    ["MP-11", "mini", "invalidated"],
    ["EX-05", "exam", "voided"],
  ];
  for (const [pageId, surface, scenario] of cases) {
    await page.goto(routeFor(pageId, surface, scenario, false));
    const canvas = page.locator(".product-canvas");
    await expect(canvas).toContainText("陈晓雨");
    await expect(canvas).toContainText("A02418");
    await expect(canvas).toContainText("72");
    await expect(canvas).toContainText("未通过");
    await expect(canvas).toContainText("1 / 2");
    await expect(canvas).not.toContainText("原成绩 76");
    await expect(canvas).not.toContainText("原 92");
  }
});

test("an in-progress attempt can be voided before scoring while a processing attempt remains blocked", async ({
  page,
}) => {
  await page.goto(routeFor("AD-15", "admin", "in-progress", false));
  const voidButton = page.getByRole("button", { name: "作废尝试 #2" });
  await expect(voidButton).toBeEnabled();
  await voidButton.click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("内部处置原因").fill("员工设备故障，进行中尝试无效");
  await dialog.getByLabel("员工可见说明").fill("本次尝试已作废并返还一次机会");
  await dialog.getByRole("button", { name: "确认" }).click();
  await expect(page).toHaveURL(/scenario=voided-active/);
  const canvas = page.locator(".product-canvas");
  await expect(canvas).toContainText("进行中尝试 #2 已作废");
  await expect(canvas).toContainText("未生成得分");
  await expect(canvas).not.toContainText("得分 96");

  await page.goto(routeFor("AD-15", "admin", "processing", false));
  await expect(
    page.getByRole("button", { name: "作废尝试 #2" }),
  ).toBeDisabled();
});

test("canceled exams expose only non-official participation history and block official exports", async ({
  page,
}) => {
  await page.goto(routeFor("AD-14", "admin", "canceled", false));
  const canvas = page.locator(".product-canvas");
  await expect(canvas).toContainText("取消后的非官方历史事实");
  await expect(canvas).not.toContainText("61.36%");
  await expect(canvas).not.toContainText("96");
  await expect(page.getByRole("button", { name: "生成导出" })).toBeDisabled();
});

test("unsettled attempts never expose a score, correctness or standard answers for the active attempt", async ({
  page,
}) => {
  for (const scenario of ["in-progress", "processing"]) {
    await page.goto(routeFor("AD-15", "admin", scenario, false));
    const canvas = page.locator(".product-canvas");
    await expect(canvas).toContainText("官方结果 72 · 未通过 · 尝试 #1");
    await expect(canvas).toContainText("得分待定");
    await expect(canvas).not.toContainText("员工答案 / 标准答案");
    await expect(canvas).not.toContainText("主动交卷并评分");
    const voidButton = page.getByRole("button", { name: "作废尝试 #2" });
    if (scenario === "in-progress") {
      await expect(voidButton).toBeEnabled();
    } else {
      await expect(voidButton).toBeDisabled();
    }
  }
});

test("result lock stays orthogonal to mini-program lifecycle and participation states", async ({
  page,
}) => {
  await page.goto(routeFor("MP-10", "mini", "locked", false));
  const canvas = page.locator(".product-canvas");
  await expect(canvas).toContainText("生命周期已结束");
  await expect(canvas).toContainText("运行状态正常");
  await expect(canvas).toContainText("本人参与已交卷");
  await expect(canvas).toContainText("考试机会1 / 2 次");
  await expect(canvas).not.toContainText("运行状态异常处理中");
  await expect(canvas).not.toContainText("参与状态未参加");
});

test("confirmed and closed outage states update time and lifecycle consistently", async ({
  page,
}) => {
  await page.goto(routeFor("AD-13", "admin", "confirmed", false));
  await expect(page.locator(".product-canvas")).toContainText(
    "08-12 18:18:42（原 18:00）",
  );
  await expect(page.locator(".product-canvas")).toContainText("结束阻断无");

  await page.goto(routeFor("AD-13", "admin", "closed", false));
  await expect(page.locator(".product-canvas")).toContainText("已取消");
  await expect(page.locator(".product-canvas")).toContainText("故障已关闭");
  await expect(page.locator(".product-canvas")).toContainText(
    "无需补偿（考试已取消）",
  );
  await expect(page.locator(".product-canvas")).not.toContainText("待确认");
});

test("key layouts do not overflow their target viewport", async ({ page }) => {
  const checks = [
    {
      id: "MP-02",
      surface: "mini",
      scenario: "standard",
      width: 320,
      height: 700,
    },
    {
      id: "MP-04",
      surface: "mini",
      scenario: "standard",
      width: 375,
      height: 812,
    },
    {
      id: "EX-04",
      surface: "exam",
      scenario: "standard",
      width: 1280,
      height: 720,
    },
    {
      id: "AD-13",
      surface: "admin",
      scenario: "standard",
      width: 1280,
      height: 720,
    },
  ];
  for (const check of checks) {
    await page.setViewportSize({ width: check.width, height: check.height });
    await page.goto(routeFor(check.id, check.surface, check.scenario, false));
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow, `${check.id} horizontal overflow`).toBeLessThanOrEqual(1);
  }

  await page.setViewportSize({ width: 320, height: 812 });
  await page.goto(routeFor("MP-02", "mini", "standard", true));
  const reviewOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(
    reviewOverflow,
    "320px review shell horizontal overflow",
  ).toBeLessThanOrEqual(1);

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(routeFor("EX-04", "exam", "standard", true));
  const examReviewOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(
    examReviewOverflow,
    "1280px exam review shell horizontal overflow",
  ).toBeLessThanOrEqual(1);

  for (const check of [
    { id: "EX-04", surface: "exam" },
    { id: "AD-13", surface: "admin" },
  ]) {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(routeFor(check.id, check.surface, "standard", false));
    const productHeight = await page
      .locator(check.surface === "exam" ? ".exam-prototype" : ".admin-app")
      .evaluate((element) =>
        Math.round(element.getBoundingClientRect().height),
      );
    expect(productHeight, `${check.id} product viewport height`).toBe(720);
  }

  await page.goto(routeFor("AD-13", "admin", "standard", false));
  const navFooter = await page.locator(".admin-nav__foot").boundingBox();
  expect(navFooter, "admin navigation footer should render").not.toBeNull();
  expect(
    Math.round((navFooter?.y ?? 721) + (navFooter?.height ?? 0)),
    "admin navigation footer should remain inside the 720px viewport",
  ).toBeLessThanOrEqual(720);
});
