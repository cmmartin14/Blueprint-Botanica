import { test, expect } from '@playwright/test';

test.describe('Calendar Reminders', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to the homepage and open the calendar
    await page.goto('http://localhost:3000/');
    await page.getByRole('button', { name: 'Calendar' }).click();
  });

  test('should show validation error for invalid date', async ({ page }) => {
    // Fill reminder details with an invalid/past date
    await page.getByRole('textbox', { name: 'Jot down a reminder or' }).fill('reminder');
    await page.getByRole('textbox', { name: 'Send reminder to specific' }).fill('test@test.com');
    await page.locator('input[type="datetime-local"]').fill('0001-01-01T01:01');
    
    // Attempt to save and dismiss the validation message
    await page.getByTestId('calendar-window').getByRole('button', { name: 'Save' }).click();
    await page.getByRole('button', { name: 'Dismiss' }).click();
  });

  test('should create and then delete a reminder', async ({ page }) => {
    // Fill reminder details with a future date
    await page.locator('input[type="datetime-local"]').fill('2027-01-01T01:01');
    await page.getByRole('textbox', { name: 'Send reminder to specific' }).fill('test@test.com');
    await page.getByRole('textbox', { name: 'Jot down a reminder or' }).fill('reminder');
    
    // Save the reminder
    await page.getByTestId('calendar-window').getByRole('button', { name: 'Save' }).click();

    // Find and click the created reminder in the calendar
    await page.getByText('reminderJan').click();
    
    // Delete the reminder
    await page.getByRole('button', { name: 'Delete Note' }).first().click();
  });

});
