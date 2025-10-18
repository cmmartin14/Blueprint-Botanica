// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'src/tests/components',  // points to your test files
  timeout: 30 * 1000,
  retries: 0,
  reporter: [['list']],
  use: {
    headless: true,
  },
});
