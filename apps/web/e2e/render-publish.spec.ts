import { test, expect, request as pwRequest, type APIRequestContext } from '@playwright/test';
import {
  API_URL,
  renderJobPayload,
  minimalStoryboardPayload,
  authTokenFromStorage,
  pollUntil,
} from './helpers';

/**
 * ── Tier 2: full async render → publish ─────────────────────────────────────
 * Exercises the real cross-service pipeline verified on 2026-06-19:
 *   web → laravel → queue → daemon → webhook → laravel
 *
 * REQUIRES the full stack up AND daemon simulation mode ON (fast, free,
 * deterministic — renders complete in seconds via fake media):
 *   • web :3000, backend :8000, daemon :7456, queue worker, redis/mysql/minio
 *   • daemon `/api/media/simulation` reports `enabled:true`
 *     (bring the stack up with `SIMULATION_MODE=1 docker compose ... up -d`)
 *
 * OPT-IN ONLY — set `E2E_TIER2=1`. Without it the suite skips: when simulation
 * is off, a render calls real AI providers (real credits + minutes of latency),
 * which must never run unattended. See backend `.env.docker` SIMULATION_MODE and
 * `backend/worklogs/2026-06-19-full-system-test-issues/SUMMARY.md`.
 */
const RUN_TIER2 = !!process.env.E2E_TIER2;
const TERMINAL_OK = ['completed', 'succeeded', 'done'];
const TERMINAL = [...TERMINAL_OK, 'failed', 'error', 'cancelled'];

test.describe('Render → publish (full-stack, tier 2)', () => {
  test.skip(!RUN_TIER2, 'Set E2E_TIER2=1 with the full stack + daemon simulation to run.');

  let ctx: APIRequestContext;

  test.beforeAll(async () => {
    ctx = await pwRequest.newContext();
  });

  test.afterAll(async () => {
    await ctx.dispose();
  });

  test('a render job renders, publishes, and surfaces in the community feed', async ({ page }) => {
    test.setTimeout(180_000);
    const token = await authTokenFromStorage(page);
    const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' };

    // 1. Create the render job.
    const created = await ctx.post(`${API_URL}/api/render-jobs`, {
      headers,
      data: renderJobPayload(`E2E publish ${Date.now()}`),
    });
    expect(created.status(), await created.text()).toBe(201);
    const uuid = (await created.json()).data.uuid as string;
    expect(uuid).toBeTruthy();

    // 2. Poll until the async pipeline (queue → daemon → webhook) finishes.
    const final = await pollUntil(
      async () => (await (await ctx.get(`${API_URL}/api/render-jobs/${uuid}`, { headers })).json()).data,
      (job) => TERMINAL.includes(job.status),
      { timeoutMs: 150_000, intervalMs: 3_000 },
    );
    expect(TERMINAL_OK, `render job ended in "${final.status}"`).toContain(final.status);

    // 3. Publish it to the community.
    const published = await ctx.patch(`${API_URL}/api/render-jobs/${uuid}/publish`, {
      headers: { ...headers, 'Content-Type': 'application/json' },
      data: { visibility: 'sharing' },
    });
    expect(published.status(), await published.text()).toBe(200);
    expect((await published.json()).data.visibility).toBe('sharing');

    // 4. It must appear in the public community feed.
    const items = await pollUntil(
      async () => {
        const body = await (await ctx.get(`${API_URL}/api/v1/community/assets`, { headers })).json();
        return (body.data?.items ?? body.data ?? []) as Array<{ uuid: string }>;
      },
      (list) => list.some((i) => i.uuid === uuid),
      { timeoutMs: 20_000, intervalMs: 2_000 },
    );
    expect(items.some((i) => i.uuid === uuid), 'published asset should appear in /community/assets').toBe(true);
  });

  test('a storyboard renders end-to-end to a completed final video', async ({ page }) => {
    test.setTimeout(180_000);
    const token = await authTokenFromStorage(page);
    const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' };

    // 1. Create a multi-scene storyboard.
    const created = await ctx.post(`${API_URL}/api/storyboards`, {
      headers,
      data: minimalStoryboardPayload(`E2E render ${Date.now()}`),
    });
    expect(created.status(), await created.text()).toBe(201);
    const uuid = (await created.json()).data.uuid as string;

    // 2. Kick off the render — every scene must queue.
    //    (Regression for issue #02: a stale named arg made every scene fail to
    //     queue while still returning HTTP 200.)
    const render = await ctx.post(`${API_URL}/api/storyboards/${uuid}/render`, { headers });
    expect(render.status(), await render.text()).toBe(200);
    const summary = (await render.json()).data;
    expect(summary.scenes_failed, 'no scene should fail to queue').toBe(0);
    expect(summary.scenes_queued).toBeGreaterThanOrEqual(1);

    // 3. Poll the storyboard until the pipeline finalizes (concat) the video.
    const final = await pollUntil(
      async () => (await (await ctx.get(`${API_URL}/api/storyboards/${uuid}`, { headers })).json()).data,
      (sb) => ['completed', 'failed'].includes(sb.status),
      { timeoutMs: 150_000, intervalMs: 3_000 },
    );
    expect(final.status, `storyboard ended in "${final.status}"`).toBe('completed');
    expect(final.output_path, 'a completed storyboard should expose a final video path').toBeTruthy();
  });
});
