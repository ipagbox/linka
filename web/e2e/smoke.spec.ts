import { test, expect } from '@playwright/test'

test('home page loads and shows Linka heading', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /linka/i })).toBeVisible()
})

test('home page shows placeholder message', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText(/private messaging/i)).toBeVisible()
})
