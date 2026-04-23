import { test, expect } from "@playwright/test";

test("search and select plant", async ({ page }) => {
  await page.goto("http://localhost:3000");
  
  // click navbar
  await page.getByTitle('Search').click();
  
  // wait for window
  const window = page.locator("#search-window");
  await expect(window).toBeVisible();
  
  // search for plant
  const input = window.getByPlaceholder("Search for a plant...");
  await input.fill("rose");
  
  // wait for response
  await page.waitForResponse(
    response => response.url().includes('/api/perenual') && response.status() === 200,
    { timeout: 10000 }
  );
  
  // wait for results
  const firstLi = window.getByRole('listitem').first();
  await expect(firstLi).toBeVisible({ timeout: 10_000 });
  
  // click first result
  await firstLi.click();
  
  // detail view 
  const backButton = window.getByRole("button", { name: "Back" });
  await expect(backButton).toBeVisible({ timeout: 10_000 });
  
  // exit
  await window.getByLabel("Close search").click();
  await expect(window).not.toBeVisible({ timeout: 5000 });
});

test("filter plants by watering and zone", async ({ page }) => {
  await page.goto("http://localhost:3000");
  
  // Open search
  await page.getByTitle('Search').click();
  const window = page.locator("#search-window");
  await expect(window).toBeVisible();
  
  // use mock data
  await window.getByRole('button', { name: 'Mock data' }).click();

  // Show filters
  await window.getByRole('button', { name: 'Filters +' }).click();
  
  // Apply multiple filters
  await window.getByRole('combobox').first().selectOption("Average");
  await window.getByRole('combobox').nth(1).selectOption("Low");
  await window.getByRole('combobox').nth(2).selectOption("Perennial");
  await window.getByRole('combobox').nth(3).selectOption("Yes");
  await window.getByRole('combobox').nth(4).selectOption("Yes");
  await window.getByRole('combobox').nth(5).selectOption("Zone 6");

  // hey apple!
  
  // Verify 6 active filters
  await expect(window.getByText(/Clear 6/i)).toBeVisible();
  
  // Wait for filtered results
  await page.waitForTimeout(1500);
  
  // Clear filters
  await window.getByRole('button', { name: 'Clear' }).click();
  
  // Verify filters cleared
  await expect(window.getByRole('button', { name: 'Clear' })).toBeHidden();
  
  // Close search
  await window.getByLabel("Close search").click();
});