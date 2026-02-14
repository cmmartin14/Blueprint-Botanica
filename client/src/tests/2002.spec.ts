import { test, expect } from "@playwright/test";

test("search and select plant", async ({ page }) => {
  // Enable network logging
  page.on('request', request => {
    console.log('→ REQUEST:', request.method(), request.url());
  });
  
  page.on('response', response => {
    console.log('← RESPONSE:', response.status(), response.url());
  });
  
  page.on('requestfailed', request => {
    console.log('✗ REQUEST FAILED:', request.url(), request.failure()?.errorText);
  });
  
  await page.goto("http://localhost:3000");
  
  // 1. Click the navbar search icon
  console.log('Clicking search button...');
  await page.getByTestId("search-button").click();
  
  // 2. Wait for search window to appear
  const window = page.locator("#search-window");
  await expect(window).toBeVisible();
  console.log('Search window visible');
  
  // 3. Type into search input
  const input = window.getByPlaceholder("Search for a plant...");
  console.log('Filling search input with "rose"...');
  await input.fill("rose");
  
  // 4. Wait for debounce and any network activity
  console.log('Waiting for debounce and network activity...');
  await page.waitForTimeout(1500);
  
  // Try to catch any API response
  try {
    const response = await page.waitForResponse(
      response => {
        const url = response.url();
        const matches = url.includes('plant') || url.includes('search') || url.includes('api');
        if (matches) {
          console.log('Found matching API response:', url);
        }
        return matches;
      },
      { timeout: 5000 }
    );
    console.log('API Response Status:', response.status());
    const body = await response.text();
    console.log('API Response Body:', body.substring(0, 200)); // First 200 chars
  } catch (error) {
    console.log('No API call detected or timeout - might be client-side search');
  }
  
  // 5. Check what list items exist
  const allItems = window.getByRole('listitem');
  const count = await allItems.count();
  console.log(`Found ${count} list items in search results`);
  
  // If no results, take screenshot and log HTML
  if (count === 0) {
    const windowHTML = await window.innerHTML();
    console.log('Search window HTML:', windowHTML);
    await page.screenshot({ 
      path: 'test-results/no-search-results.png', 
      fullPage: true 
    });
    console.log('Screenshot saved to test-results/no-search-results.png');
  }
  
  const firstLi = allItems.first();
  console.log('Waiting for first list item to be visible...');
  await expect(firstLi).toBeVisible({ timeout: 10_000 });
  
  // 6. Click first result
  console.log('Clicking first result...');
  await firstLi.click();
  
  // 7. Wait for detail view to load
  const backButton = window.getByRole("button", { name: "Back" });
  console.log('Waiting for Back button...');
  await expect(backButton).toBeVisible({ timeout: 10_000 });
  
  // 8. Exit
  console.log('Closing search window...');
  await window.getByLabel("Close search").click();
  await expect(window).not.toBeVisible({ timeout: 5000 });
  console.log('Test completed successfully');
});