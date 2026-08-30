import { test, expect } from '@playwright/test'

test('exam open save submit and result', async ({ page }) => {
  test.skip(!process.env.E2E_WITH_BACKEND, 'Set E2E_WITH_BACKEND=1 and start backend on :8088')

  await page.goto('/login')
  await page.getByPlaceholder('请输入员工号').fill('EXAM001')
  await page.getByPlaceholder('请输入密码').fill('Admin@123')
  await page.getByRole('button', { name: '登录' }).click()
  await expect(page).toHaveURL(/tasks/, { timeout: 15_000 })

  await page.getByRole('link', { name: '查看详情' }).first().click()
  await expect(page).toHaveURL(/\/exams\//)

  const start = page.getByRole('button', { name: /开始考试|继续考试/ })
  await expect(start).toBeVisible()
  await start.click()
  await expect(page).toHaveURL(/\/attempts\//, { timeout: 15_000 })

  const option = page.locator('.option-label').first()
  await option.click()
  await page.waitForTimeout(800)

  await page.getByRole('button', { name: '交卷' }).click()
  await expect(page).toHaveURL(/\/result/, { timeout: 15_000 })
})
