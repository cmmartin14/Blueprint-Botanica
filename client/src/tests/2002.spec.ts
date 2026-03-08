import { test, expect } from "@playwright/test";

test("search and select plant", async ({ page }) => {
  await page.goto("http://localhost:3000");
  
  // click navbar
  await page.getByTestId("search-button").click();
  
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
  await page.getByTestId("search-button").click();
  const window = page.locator("#search-window");
  await expect(window).toBeVisible();
  
  // Search for a broad term to get many results
  const input = window.getByPlaceholder("Search for a plant...");
  await input.fill("plant");
  
  // Wait for response
  await page.waitForResponse(
    response => response.url().includes('/api/perenual') && response.status() === 200,
    { timeout: 10000 }
  );
  
  // Wait for results
  await expect(window.getByRole('listitem').first()).toBeVisible({ timeout: 10_000 });
  
  // Show filters
  await window.getByText(/Show Filters/i).click();
  
  // Apply multiple filters
  await window.getByRole('combobox').first().selectOption("Average");
  await window.getByRole('combobox').nth(1).selectOption("7");
  await window.getByRole('combobox').nth(3).selectOption("Perennial");
  await window.getByRole('combobox').nth(5).selectOption("Yes");
  
  // Verify 4 active filters
  await expect(window.getByText(/4 active/i)).toBeVisible();
  
  // Wait for filtered results
  await page.waitForTimeout(1500);
  
  // Clear filters
  await window.getByText(/Clear All Filters/i).click();
  
  // Verify filters cleared
  await expect(window.getByText(/0 active/i)).toBeVisible();
  
  // Close search
  await window.getByLabel("Close search").click();
});