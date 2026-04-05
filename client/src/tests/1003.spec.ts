import { test, expect } from '@playwright/test';

test.describe('Canvas toolbar buttons', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('calendar button functions', async ({ page }) => {
    // Use the calendar window inside the canvas
    const calendar = page.locator('[data-testid="calendar-window"]').first();
    const openButton = page.getByRole('button', { name: 'Calendar' });

    // Open calendar
    await openButton.click();
    await expect(calendar).toBeVisible();

    // Close calendar
    const closeButton = calendar.getByRole('button', { name: 'Close' });
    await closeButton.click();
  });

  test('edit mode button functions', async ({ page }) => {
    const editButton = page.getByRole('button', { name: 'Edit Mode' });
    await editButton.click();

    const editToolbar = page.getByTestId('edit-window');
    await expect(editToolbar).toBeVisible();

    const exitButton = editToolbar.getByRole('button', { name: 'Exit Edit Mode' });
    await exitButton.click();
    await expect(editToolbar).toBeHidden();
  });

  test("draw garden bed", async ({ page }) => {
  await page.goto("http://localhost:3000");
  await page.getByRole('button', { name: 'Edit Mode' }).click();
  
  // Enable draw tool
  await page.getByTitle(/Draw/).click();
  
  const svg = page.locator("svg").first();
  await expect(svg).toBeVisible();
  
  const box = await svg.boundingBox();
  if (!box) throw new Error("SVG not found");
  
  const x = box.x + 200;
  const y = box.y + 200;
  
  await page.keyboard.down("Shift");
  
  // Draw the bed
  await page.mouse.click(x, y);
  await page.mouse.click(x + 120, y);
  await page.mouse.click(x + 120, y + 120);
  await page.mouse.click(x, y + 120);
  
  // Close the bed
  await page.mouse.click(x, y);
  
  await page.keyboard.up("Shift");
  
  // Wait for bed to finish
  const bed = page.locator('g > path').first();
  await expect(bed).toBeVisible({ timeout: 5000 });

  //Click bed to edit
  await bed.click();
  const bedInfoButton = page.getByRole('button', { name: 'Open bed details' });
  await expect(bedInfoButton).toBeVisible({ timeout: 5000 });
  await bedInfoButton.click();

  // Wait for bed plant window to appear
  const plantWindow = page.locator('[data-testid="bed-plant-window"]'); 
  await expect(plantWindow).toBeVisible({ timeout: 5000 });

  await plantWindow.getByRole('combobox').first().selectOption('Loam');
  await plantWindow.getByRole('combobox').nth(1).selectOption('Full Sun');
  await plantWindow.getByRole('combobox').nth(2).selectOption('Well-drained');
  await plantWindow.getByRole('combobox').nth(3).selectOption('Average');

  await plantWindow.getByRole('textbox', { name: 'ex. 12"' }).fill('12"');
  await plantWindow.getByRole('textbox', { name: 'ex. 6.0-' }).fill('6.5-7.0');

  await plantWindow.getByRole('textbox', { name: 'Add bed notes...' }).fill('Test notes for bed');

  await expect(plantWindow.getByRole('combobox').first()).toHaveValue('Loam');
  await expect(plantWindow.getByRole('combobox').nth(1)).toHaveValue('Full Sun');
  await expect(plantWindow.getByRole('combobox').nth(2)).toHaveValue('Well-drained');
  await expect(plantWindow.getByRole('combobox').nth(3)).toHaveValue('Average');
  await expect(plantWindow.getByRole('textbox', { name: 'ex. 6.0-' })).toHaveValue('6.5-7.0');
  await expect(plantWindow.getByRole('textbox', { name: 'Add bed notes...' })).toHaveValue('Test notes for bed');

  // Enter "rose" into search field
  const searchInput = plantWindow.getByRole('textbox', { name: 'Search plants to add...' });
  await searchInput.fill("rose");
  
  // Wait for API response
  await page.waitForResponse(
    response => response.url().includes('/api/perenual') && response.status() === 200,
    { timeout: 10000 }
  );
  
  // Select first element
  const firstResult = plantWindow.getByRole('listitem').first();
  await expect(firstResult).toBeVisible({ timeout: 10_000 });
  await firstResult.click();
  
  // Wait for plant to be added
  await page.waitForTimeout(1000); 
  
  // Delete the plant once added
  const deleteButton = plantWindow.getByRole('button', { name: '✕' });
  await expect(deleteButton).toBeVisible({ timeout: 5000 });
  await deleteButton.click();
  
  // Rename garden bed
  const renameInput = plantWindow.getByRole('heading', { name: 'Garden Bed' }); 
  await renameInput.click();
  await page.keyboard.type('My Test Bed');
  
  // Close the window 
  await plantWindow.locator('.text-green-800.hover\\:opacity-70').click();
  await expect(plantWindow).not.toBeVisible({ timeout: 5000 });
});
});
