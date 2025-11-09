import { test, expect } from '@playwright/test'

test('home link navigates', async ({ page }) => {
  await page.goto('http://localhost:3000')
  await page.click('a[href="/"]')
  await expect(page).toHaveURL('http://localhost:3000/')
})

test('login link navigates', async ({ page }) => {
  await page.goto('http://localhost:3000')
  await page.click('a[href="/handler/sign-up"]')
  await expect(page).toHaveURL('http://localhost:3000/handler/sign-up')
})
