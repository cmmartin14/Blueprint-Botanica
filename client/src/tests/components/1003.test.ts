import { test, expect } from '@playwright/test';

test.describe('Navbar navigation', () => {
  test('clicking Home navigates to the home page', async ({ page }) => {
    await page.goto('http://localhost:3000/test-page');

    await page.getByRole('link', { name: /home/i }).click();

    await expect(page).toHaveURL('http://localhost:3000/');

  });
});
