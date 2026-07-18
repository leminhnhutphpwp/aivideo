/** Shared constants, payload builders, and flows for E2E specs. */
import { type Page, expect } from '@playwright/test';

/** Laravel backend base URL (no trailing slash). */
export const API_URL = process.env.E2E_API_URL || 'http://localhost:8000';

/** Persisted authenticated storage state (created by auth.setup.ts). */
export const AUTH_STATE = 'e2e/.auth/user.json';

/**
 * Seeded test user (DatabaseSeeder: Pro plan, full credits, email verified).
 * Override via env for other environments.
 */
export const TEST_USER = {
  email: process.env.E2E_USER_EMAIL || 'minhnhut147nb@gmail.com',
  password: process.env.E2E_USER_PASSWORD || 'Test@1234',
};

/**
 * Logs in through the real login UI as the seeded test user.
 *
 * Asserts on the persisted JWT rather than the post-login redirect: `setAuth`
 * writes localStorage `auth_token` before navigating, so the token is the
 * reliable success signal even when the /dashboard redirect is slow under load.
 * The submit is wrapped in `toPass` to absorb the React hydration race on a
 * freshly-compiled Next.js dev page (the Enter handler may not be wired yet).
 */
export async function loginViaUi(page: Page): Promise<void> {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(TEST_USER.email);
  await page.locator('input[type="password"]').fill(TEST_USER.password);

  await expect(async () => {
    await page.locator('input[type="password"]').press('Enter');
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(token, 'JWT should be stored after a successful login').toBeTruthy();
  }).toPass({ timeout: 25_000 });
}

/**
 * Minimal valid POST /api/storyboards payload — mirrors the shape exercised
 * by backend StoryboardControllerTest. Defaults to a multi_scene storyboard.
 */
export function minimalStoryboardPayload(title: string) {
  return {
    title,
    video_type: 'ugc_review',
    scenes: [
      {
        prompt: 'E2E generated scene',
        duration_seconds: 5,
        aspect_ratio: '16:9',
        resolution: '720p',
      },
    ],
  };
}

/**
 * Minimal valid POST /api/render-jobs payload — the single-render path that is
 * publishable to the community feed. Verified end-to-end on 2026-06-19.
 */
export function renderJobPayload(prompt = 'E2E render job') {
  return {
    prompt,
    capability: 't2v',
    video_type: 'text_to_video',
    duration_seconds: 5,
    aspect_ratio: '16:9',
    resolution: '720p',
  };
}

/**
 * Reads the JWT that the persisted storage state injected into localStorage.
 * Use for API-driven specs that act as the authenticated user via pwRequest.
 */
export async function authTokenFromStorage(page: Page): Promise<string> {
  await page.goto('/projects');
  const token = await page.evaluate(() => localStorage.getItem('auth_token'));
  expect(token, 'storage state should carry a JWT').toBeTruthy();
  return token as string;
}

/**
 * Polls `read` every `intervalMs` until `done` is satisfied or `timeoutMs`
 * elapses, then returns the last value read (so the caller can assert on it for
 * a useful failure message). For async cross-service flows (render → webhook).
 */
export async function pollUntil<T>(
  read: () => Promise<T>,
  done: (value: T) => boolean,
  { timeoutMs = 90_000, intervalMs = 3_000 }: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<T> {
  const start = Date.now();
  let last = await read();
  while (!done(last) && Date.now() - start < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    last = await read();
  }
  return last;
}
