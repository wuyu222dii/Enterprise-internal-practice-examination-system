import { test, expect } from '@playwright/test'

test('login page shows admin form', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: '管理后台' })).toBeVisible()
  await expect(page.getByPlaceholder('请输入员工号')).toBeVisible()
  await expect(page.getByRole('button', { name: '登录' })).toBeVisible()
})

test('login with backend redirects to departments', async ({ page }) => {
  test.skip(!process.env.E2E_WITH_BACKEND, 'Set E2E_WITH_BACKEND=1 and start backend on :8088')

  await page.goto('/login')
  await page.getByPlaceholder('请输入员工号').fill('ADMIN001')
  await page.getByPlaceholder('请输入密码').fill('Admin@123')
  await page.getByRole('button', { name: '登录' }).click()

  await expect(page).toHaveURL(/change-password|departments/, { timeout: 10_000 })
})
