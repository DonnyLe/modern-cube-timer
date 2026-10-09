import { defineConfig, devices } from '@playwright/test';
import { execFileSync } from 'node:child_process';
// Playwright Firefox cannot access its app-data directory on macOS 27.
// Keep Firefox enabled on other platforms, including Linux CI.
const skipFirefox =
  process.platform === 'darwin' &&
  Number(
    execFileSync('/usr/bin/sw_vers', ['-productVersion'], { encoding: 'utf8' })
      .trim()
      .split('.')[0],
  ) === 27;
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
      },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 1000 } },
    },
  ].filter((project) => !skipFirefox || project.name !== 'firefox'),
});
