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
  await input.fill("sunflower");

  // 4. Wait for debounce + results to load
  const firstLi = window.locator("#list li").first();
  await expect(firstLi).toBeVisible({ timeout: 10_000 });

  // 5. Click first result
  await firstLi.click();

  // 6. Wait for detail view to load
  // loadingPlant triggers "Loading plant details..."
  const loadingText = window.getByText("Loading plant details...", { exact: false });

  // Wait for loading to appear then disappear
  await expect(loadingText).toBeVisible({ timeout: 5000 });
  await expect(loadingText).not.toBeVisible({ timeout: 10000 });

 
  await expect(window.getByRole("button", { name: "Back" })).toBeVisible();
  await window.getByLabel("Close search").click();
  await expect(window).not.toBeVisible({ timeout: 5000 });
});
