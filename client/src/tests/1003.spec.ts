import { test, expect } from '@playwright/test';

test.describe('Canvas toolbar buttons', () => {
  test.beforeEach(async ({ page }) => {

    await page.goto('http://localhost:3000');
  });

  test('calendar button functions', async ({ page }) => {
    const calendar = page.getByTestId('calendar-window').filter({ has: page.locator(':visible') });

    // open calendar
    await page.getByTestId('calendar').click();
    await expect(calendar).toBeVisible();

    // close calendar
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(calendar).toBeHidden();

  });

  test('edit mode button functions', async ({ page }) => {
    const editButton = page.getByTestId('edit-button');
    await editButton.click();

    // Edit toolbar should be visible
    const editToolbar = page.getByTestId('edit-window');
    await expect(editToolbar).toBeVisible();

    // Exit edit mode
    await editToolbar.getByRole('button', { name: 'Exit Edit Mode' }).click();
    await expect(editToolbar).toBeHidden();
  });
});
