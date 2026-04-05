import { test, expect } from "@playwright/test";

test("calendar weather search and close", async ({ page }) => {
  await page.goto("http://localhost:3000");
  
  const calendar = page.locator('[data-testid="calendar-window"]').first();
  
  // navbar calendar button 
  await page.getByRole('button', { name: 'Calendar' }).click();
  
  // window appears
  await expect(calendar).toBeVisible({ timeout: 5000 });
  
  // search "dallas" 
  const input = calendar.getByPlaceholder("Search city (e.g., Denton, US)");
  await input.fill("dallas");
  
  // wait for weather API response
  await Promise.all([
    page.waitForResponse(
      response => {
        const url = response.url();
        return (url.includes('weather') || url.includes('api')) && response.status() === 200;
      },
      { timeout: 15000 }
    ),
    calendar.getByRole("button", { name: "Search" }).click()
  ]);
  
  // results
  await expect(
    calendar.getByText("Current", { exact: false })
  ).toBeVisible({ timeout: 10_000 });
  
  // close window
  await calendar.getByLabel("Close").click();
});