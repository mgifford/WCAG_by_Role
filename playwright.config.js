import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PORT || 4173);

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    // Serve the repository root so /dist/ exercises a nested GitHub Pages-style path.
    baseURL: process.env.BASE_URL || `http://127.0.0.1:${port}/dist/`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `python3 -m http.server ${port} --directory .`,
    url: `http://127.0.0.1:${port}/dist/`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
