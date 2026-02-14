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
  await page.pause();
  await input.fill("rose");

  // 4. Wait for debounce + results to load
  const firstLi = window.getByRole('listitem').first();
  await expect(firstLi).toBeVisible({ timeout: 10_000 });

  // 5. Click first result
  await firstLi.click();

  // 6. Wait for detail view to load
  const loadingText = window.getByText("Loading plant details...", { exact: false });
 
  // 7. Exit
  await expect(window.getByRole("button", { name: "Back" })).toBeVisible();
  await window.getByLabel("Close search").click();
  await expect(window).not.toBeVisible({ timeout: 5000 });
});
