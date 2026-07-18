import { test, expect } from '@playwright/test';
import { loginViaUi } from './helpers';

test.describe('Authentication', () => {
  test('login page renders the form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('valid credentials authenticate the user', async ({ page }) => {
    await loginViaUi(page);
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(token).toBeTruthy();
  });

  test('invalid credentials stay on /login and store no token', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill('nobody@example.com');
    await page.locator('input[type="password"]').fill('definitely-wrong');

    // Retry submit until the login request actually fires (absorbs the
    // hydration race), then assert it was rejected.
    await expect(async () => {
      const respPromise = page
        .waitForResponse((r) => r.url().includes('/api/auth/login'), { timeout: 3_000 })
        .catch(() => null);
      await page.locator('input[type="password"]').press('Enter');
      expect(await respPromise).not.toBeNull();
    }).toPass({ timeout: 20_000 });

    await expect(page).toHaveURL(/\/login/);
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(token).toBeNull();
  });
});
