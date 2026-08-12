import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

// Two servers on two ports, because two ports are two origins. The whole library
// exists for the cross-origin case, so the tests have to run in it: the parent
// page loads from PARENT_PORT and every child frame from CHILD_PORT, which makes
// contentDocument unreachable exactly as it is in production.
export const PARENT_PORT = 9331;
export const CHILD_PORT = 9332;
// 127.0.0.1 rather than localhost so the child is cross-SITE, not merely
// cross-origin: third-party cookie rules key off the site, and two ports of
// localhost are the same site.
export const childOrigin = `http://127.0.0.1:${CHILD_PORT}`;

export default defineConfig({
  testDir: './test',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? '50%' : undefined,
  timeout: 30_000,
  expect: { timeout: 7_500 },
  reporter: isCI ? [['list'], ['junit', { outputFile: 'test-results/junit.xml' }]] : [['list']],
  use: {
    baseURL: `http://localhost:${PARENT_PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: [
    {
      command: `pnpm serve --no-port-switching --no-clipboard -l ${PARENT_PORT} .`,
      url: `http://localhost:${PARENT_PORT}/test/pages/parent.html`,
      reuseExistingServer: !isCI,
    },
    {
      command: `pnpm serve --no-port-switching --no-clipboard -l ${CHILD_PORT} .`,
      url: `http://localhost:${CHILD_PORT}/test/pages/child.html`,
      reuseExistingServer: !isCI,
    },
  ],
});
