// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './src/tests',
  testMatch: '**/*.spec.ts',
  timeout: 30 * 1000,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list']],
  use: {
    headless: true,
    baseURL: 'http://localhost:3000', 
  },
});