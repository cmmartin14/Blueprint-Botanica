// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './src/tests',  // points to your test files
  testMatch: '**/*.spec.ts',
  timeout: 30 * 1000,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list']],
  use: {
    headless: true,
  },
  webServer: {
    command: 'npm run build && npm run start',
    url: 'http://localhost:3000',
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
  },
});
