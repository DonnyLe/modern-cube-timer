import { defineConfig, devices } from '@playwright/test';
import { firefoxLaunchOptions } from './scripts/playwright-firefox';
const production = process.env.PLAYWRIGHT_PRODUCTION === '1';
const port = production ? 4173 : 5173;
export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  use: { baseURL: `http://127.0.0.1:${port}`, trace: 'retain-on-failure' },
  webServer: {
    command: production ? `bun run preview --port ${port}` : `bun run dev --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1440, height: 1000 },
        launchOptions: firefoxLaunchOptions(),
      },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 1000 } },
    },
  ],
});
