import { test, expect } from '@playwright/test';

test.describe('Canvas toolbar buttons', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('calendar button functions', async ({ page }) => {
    // Use the calendar window inside the canvas
    const calendar = page.locator('[data-testid="calendar-window"]').first();
    const openButton = page.getByTestId('calendar-button');

    // Initially hidden
    await expect(calendar).toBeHidden();

    // Open calendar
    await openButton.click();
    await expect(calendar).toBeVisible();

    // Close calendar
    const closeButton = calendar.getByRole('button', { name: 'Close' });
    await closeButton.click();
    await expect(calendar).toBeHidden();
  });

  test('edit mode button functions', async ({ page }) => {
    const editButton = page.getByTestId('edit-button');
    await editButton.click();

    const editToolbar = page.getByTestId('edit-window');
    await expect(editToolbar).toBeVisible();

    const exitButton = editToolbar.getByRole('button', { name: 'Exit Edit Mode' });
    await exitButton.click();
    await expect(editToolbar).toBeHidden();
  });
});
