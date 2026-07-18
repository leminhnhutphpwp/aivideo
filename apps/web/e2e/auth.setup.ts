import { test as setup, expect, request } from '@playwright/test';
import { API_URL, TEST_USER, AUTH_STATE } from './helpers';

/**
 * Establishes an authenticated session for the rest of the suite.
 *
 * Authenticates via the API (deterministic — avoids the flaky post-login UI
 * redirect) and injects the JWT into localStorage exactly where the app reads
 * it (`auth_token`), then snapshots storage state for authenticated specs.
 * The real UI login flow is covered separately in auth.spec.ts.
 */
setup('authenticate', async ({ page }) => {
  const ctx = await request.newContext();
  const res = await ctx.post(`${API_URL}/api/auth/login`, {
    headers: { Accept: 'application/json' },
    data: { email: TEST_USER.email, password: TEST_USER.password },
  });
  expect(res.status(), await res.text()).toBe(200);
  const token = (await res.json())?.data?.token;
  await ctx.dispose();
  expect(token, 'login response should contain a JWT').toBeTruthy();

  await page.goto('/login');
  await page.evaluate((t) => localStorage.setItem('auth_token', t), token);
  await page.context().storageState({ path: AUTH_STATE });
});
