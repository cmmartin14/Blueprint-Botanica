import { test, expect } from "@playwright/test";

test("calendar weather search and close", async ({ page }) => {
  await page.goto("http://localhost:3000");
  const calendar = page.locator('[data-testid="calendar-window"]').first();
  // 1. Click the navbar calendar button 
  await expect(calendar).toBeHidden();
  await page.getByTestId("calendar-button").click();
  

  // 2. Calendar window appears
  await expect(calendar).toBeVisible({ timeout: 5000 });

  // 3. Type "dallas" into the city search input
  const input = calendar.getByPlaceholder("Search city (e.g., Denton, US)");
  await input.fill("dallas");

  // 4. Click Search
  await calendar.getByRole("button", { name: "Search" }).click();

  // 5. Wait for results
  await expect(
    calendar.getByText("Current", { exact: false })
  ).toBeVisible({ timeout: 10_000 });

  // 6. Close the calendar window
  await calendar.getByLabel("Close").click();

  // 7. Ensure the window disappears
  await expect(calendar).not.toBeVisible({ timeout: 5000 });
});
