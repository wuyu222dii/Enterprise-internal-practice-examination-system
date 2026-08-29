import { expect, test } from "@playwright/test";

const captures = [
  {
    id: "MP-02",
    surface: "mini",
    scenario: "standard",
    width: 375,
    height: 812,
    file: "01-mini-home.png",
  },
  {
    id: "MP-04",
    surface: "mini",
    scenario: "incorrect",
    width: 375,
    height: 812,
    file: "02-mini-practice-feedback.png",
  },
  {
    id: "MP-10",
    surface: "mini",
    scenario: "paused",
    width: 375,
    height: 812,
    file: "03-mini-formal-task-paused.png",
  },
  {
    id: "EX-04",
    surface: "exam",
    scenario: "standard",
    width: 1440,
    height: 900,
    file: "04-exam-workbench.png",
  },
  {
    id: "EX-04",
    surface: "exam",
    scenario: "paused",
    width: 1280,
    height: 720,
    file: "05-exam-paused.png",
  },
  {
    id: "AD-09",
    surface: "admin",
    scenario: "partial",
    width: 1440,
    height: 900,
    file: "06-admin-import-preview.png",
  },
  {
    id: "AD-11",
    surface: "admin",
    scenario: "standard",
    width: 1440,
    height: 900,
    file: "07-admin-exam-wizard.png",
  },
  {
    id: "AD-13",
    surface: "admin",
    scenario: "pending",
    width: 1440,
    height: 900,
    file: "08-admin-outage.png",
  },
  {
    id: "AD-14",
    surface: "admin",
    scenario: "standard",
    width: 1440,
    height: 900,
    file: "09-admin-results.png",
  },
  {
    id: "MP-04",
    surface: "mini",
    scenario: "standard",
    width: 320,
    height: 700,
    file: "10-mini-narrow.png",
  },
  {
    id: "AD-14",
    surface: "admin",
    scenario: "locked",
    width: 1440,
    height: 900,
    file: "11-admin-result-locked.png",
  },
];

test("capture representative review images", async ({ page }) => {
  for (const capture of captures) {
    await page.setViewportSize({
      width: capture.width,
      height: capture.height,
    });
    await page.goto(
      `/${capture.surface}/${capture.id}?scenario=${encodeURIComponent(capture.scenario)}&review=0`,
    );
    await expect(page.locator(".product-canvas")).toBeVisible();
    await page.screenshot({
      path: `artifacts/screenshots/${capture.file}`,
      fullPage: true,
    });
  }
});
