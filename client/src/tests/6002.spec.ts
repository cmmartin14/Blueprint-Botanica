import { test, expect } from '@playwright/test';

// To run the full suite, grab any garden ID from the URL when you open a garden
// in the app, then: TEST_GARDEN_ID=<id> npx playwright test src/tests/6002.spec.ts
const GARDEN_ID = process.env.TEST_GARDEN_ID ?? '';

test.describe('Garden view page', () => {

  test('shows not-found page for unknown garden id', async ({ page }) => {
    await page.goto('http://localhost:3000/garden/nonexistent-id-00000/view');
    await expect(page.locator('text=404')).toBeVisible();
  });

  test.describe('with a real garden id', () => {
    test.skip(!GARDEN_ID, 'Set TEST_GARDEN_ID env var to run these tests');

    test('renders garden name and summary stats', async ({ page }) => {
      await page.goto(`http://localhost:3000/garden/${GARDEN_ID}/view`);

      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('text=/bed/i')).toBeVisible();
      await expect(page.locator('text=/plant/i')).toBeVisible();
    });

    test('renders the SVG garden map', async ({ page }) => {
      await page.goto(`http://localhost:3000/garden/${GARDEN_ID}/view`);

      await expect(page.locator('svg')).toBeVisible();
    });

    test('Save as PDF button and Edit link are visible', async ({ page }) => {
      await page.goto(`http://localhost:3000/garden/${GARDEN_ID}/view`);

      await expect(page.getByRole('button', { name: /save as pdf/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /edit/i })).toBeVisible();
    });

    test('Edit link navigates to home', async ({ page }) => {
      await page.goto(`http://localhost:3000/garden/${GARDEN_ID}/view`);

      await page.getByRole('link', { name: /edit/i }).click();
      await expect(page).toHaveURL('http://localhost:3000/');
    });
  });

});
