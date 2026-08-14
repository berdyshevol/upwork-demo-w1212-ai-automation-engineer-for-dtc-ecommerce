import { defineConfig, devices } from '@playwright/test';

// Defaults to 3000. Override with PORT=3210 pnpm test when another app owns 3000,
// otherwise Playwright would silently reuse that foreign server.
const port = Number(process.env.PORT ?? 3000);

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `pnpm dev --port ${port}`,
    port,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
