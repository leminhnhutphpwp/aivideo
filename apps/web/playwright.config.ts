import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E config for the AI Video Platform web app.
 *
 * Tier 1 (runs green by default): auth + storyboard creation.
 *   Needs only web (:3000) + Laravel backend (:8000) running.
 * Tier 2 (render → publish): real full-stack pipeline in e2e/render-publish.spec.ts.
 *   Opt-in via E2E_TIER2=1 and needs the whole stack up with daemon simulation
 *   mode ON (daemon :7456 + queue worker + webhook). Skipped otherwise.
 *
 * Env overrides: E2E_BASE_URL (web), E2E_API_URL (backend),
 *   E2E_USER_EMAIL / E2E_USER_PASSWORD (seeded test user),
 *   E2E_TIER2=1 (enable the full-stack render→publish suite).
 */
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    // Logs in once via the real UI and persists the JWT to storage state.
    { name: 'setup', testMatch: /auth\.setup\.ts/ },

    // Auth specs must run WITHOUT a stored session (they test logging in).
    {
      name: 'auth-flow',
      testMatch: /auth\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // Everything else reuses the authenticated storage state.
    {
      name: 'authenticated',
      testMatch: /(create-storyboard|render-publish)\.spec\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/user.json' },
    },
  ],

  // Auto-start the Next.js dev server; reuse one already running locally.
  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
