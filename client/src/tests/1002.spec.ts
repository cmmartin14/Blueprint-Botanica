import { test, expect } from '@playwright/test'

test('home link navigates', async ({ page }) => {
  await page.goto('http://localhost:3000')
  await page.click('a[href="/"]')
  await expect(page).toHaveURL('http://localhost:3000/')
})

test('login link navigates', async ({ page }) => {
  await page.goto('http://localhost:3000')
  const link = page.locator('a[href="/handler/sign-up"]')
  await link.waitFor({ state: 'visible', timeout: 10000 })
  
  // Wait for navigation to complete before clicking
  await Promise.all([
    page.waitForURL('http://localhost:3000/handler/sign-up', { timeout: 10000 }),
    link.click()
  ])
  
  await expect(page).toHaveURL('http://localhost:3000/handler/sign-up')
})