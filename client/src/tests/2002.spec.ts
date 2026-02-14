import { test, expect } from "@playwright/test";

test("search and select plant", async ({ page }) => {
  await page.goto("http://localhost:3000");
  
  // 1. Click the navbar search icon
  await page.getByTestId("search-button").click();
  
  // 2. Wait for search window to appear
  const window = page.locator("#search-window");
  await expect(window).toBeVisible();
  
  // 3. Type into search input
  const input = window.getByPlaceholder("Search for a plant...");
  await input.fill("rose");
  
  // 4. Wait for API response before checking for results
  await page.waitForResponse(
    response => {
      const url = response.url();
      return (url.includes('/api/') || url.includes('/search') || url.includes('plant')) 
        && response.status() === 200;
    },
    { timeout: 15000 }
  ).catch(() => {
    // If no API call detected, just wait a bit for debounce
    return page.waitForTimeout(1000);
  });
  
  // 5. Now wait for results to appear
  const firstLi = window.getByRole('listitem').first();
  await expect(firstLi).toBeVisible({ timeout: 10_000 });
  
  // 6. Click first result
  await firstLi.click();
  
  // 7. Wait for detail view to load (optional: wait for loading to disappear)
  const backButton = window.getByRole("button", { name: "Back" });
  await expect(backButton).toBeVisible({ timeout: 10_000 });
  
  // 8. Exit
  await window.getByLabel("Close search").click();
  await expect(window).not.toBeVisible({ timeout: 5000 });
});