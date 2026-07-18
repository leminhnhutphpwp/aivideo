import { test, expect, request as pwRequest } from '@playwright/test';
import { API_URL, minimalStoryboardPayload } from './helpers';

test.describe('Projects & storyboard creation', () => {
  test('projects page loads with a create action', async ({ page }) => {
    await page.goto('/projects');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // The "New Project" button links to the builder (target depends on tab).
    const createLink = page
      .locator('a[href="/studio"], a[href="/studio/storyboard/flow"]')
      .first();
    await expect(createLink).toBeVisible();
  });

  test('new-project button opens the storyboard builder', async ({ page }) => {
    await page.goto('/projects?type=storyboard');
    await page.locator('a[href="/studio/storyboard/flow"]').first().click();
    await expect(page).toHaveURL(/\/studio\/storyboard\/flow/, { timeout: 20_000 });
  });

  test('a storyboard created via the API appears in the projects list', async ({ page }) => {
    // Pull the JWT that storage state injected into localStorage.
    await page.goto('/projects');
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(token).toBeTruthy();

    const title = `E2E Storyboard ${Date.now()}`;
    const ctx = await pwRequest.newContext();
    const res = await ctx.post(`${API_URL}/api/storyboards`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      data: minimalStoryboardPayload(title),
    });
    expect(res.status(), await res.text()).toBe(201);
    await ctx.dispose();

    await page.goto('/projects?type=storyboard');
    await expect(page.getByText(title)).toBeVisible({ timeout: 15_000 });
  });
});
