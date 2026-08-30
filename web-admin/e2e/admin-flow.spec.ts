import { test, expect } from '@playwright/test'

test('admin login then import, wizard and monitor', async ({ page }) => {
  test.skip(!process.env.E2E_WITH_BACKEND, 'Set E2E_WITH_BACKEND=1 and start backend on :8088')

  await page.goto('/login')
  await page.getByPlaceholder('请输入员工号').fill('ADMIN001')
  await page.getByPlaceholder('请输入密码').fill('Admin@123')
  await page.getByRole('button', { name: '登录' }).click()

  await expect(page).toHaveURL(/change-password|departments/, { timeout: 15_000 })
  if (page.url().includes('change-password')) {
    await page.getByLabel('当前密码').fill('Admin@123')
    await page.getByLabel('新密码').fill('Admin@12345')
    await page.getByLabel('确认新密码').fill('Admin@12345')
    await page.getByRole('button', { name: '确认修改' }).click()
    await expect(page).toHaveURL(/departments/, { timeout: 15_000 })
  }

  await page.getByRole('link', { name: '题目导入' }).click()
  await expect(page.getByRole('heading', { name: /题目导入|导题/ })).toBeVisible()

  await page.getByRole('link', { name: '考试管理' }).click()
  await expect(page.getByRole('heading', { name: '考试管理' })).toBeVisible()
  await page.getByRole('link', { name: '创建考试' }).click()
  await expect(page).toHaveURL(/exams\/wizard/)

  await page.getByRole('link', { name: '考试监控' }).click()
  await expect(page.getByRole('heading', { name: '考试监控' })).toBeVisible()
})
