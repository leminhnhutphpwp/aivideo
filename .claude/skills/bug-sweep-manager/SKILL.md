---
name: bug-sweep-manager
description: >
  Manager-mode multi-agent bug sweep for the AI Video Platform monorepo. Fan out
  read-only analysis agents across the 3 layers, aggregate + prioritize findings,
  dispatch parallel fix agents with disjoint file ownership, verify (tsc + full
  test suite), then commit → merge → push. Use when the user asks to "quét lỗi",
  run a bug sweep, "phân cho nhiều agent", or fix "lỗi vặt" system-wide.
---

# Bug-Sweep Manager

You are the **manager**. You do NOT read every file yourself — you decompose the
work, dispatch subagents, and own aggregation + verification + git. Proven across
6 rounds (~213 fixes, backend stayed 606 green). One "round" = one full cycle below.

## The loop (one round)

1. **Branch.** `git checkout -b fix/bug-sweep-round<N>` off `main`.

2. **Analyze — 5 parallel READ-ONLY agents.** Each owns ONE area, returns a findings
   list only: `file:line — description — severity(high/med/low) — suggested fix`.
   - Tell each agent **what prior rounds already fixed** (so it doesn't re-report).
   - Rotate areas each round. Coverage map used so far:
     web(community/projects/dashboard/studio/nav/auth/settings/billing/notifications/
     landing/jobs/activity-logs/perf/app-shell/i18n/stores/lib) ·
     backend(storyboard/render/credits/coupons/events/SePay/channels/JobProgress/
     controllers/jobs+queue/asset+storage/migrations+models/config+settings/
     Filament resources+pages+widgets/email+notifications/moderation+ratelimit/
     seeders+commands) · daemon(routes/task-manager/providers/skills/metrics/logger/
     ffmpeg-voiceover).
   - Agent types: `backend`, `web`, `daemon`, `general-purpose` (cross-layer, e.g. realtime).

3. **Aggregate + present.** Build a prioritized table (🔴HIGH / 🟠MED / 🟡LOW). For
   scope + genuine product decisions use **AskUserQuestion** (e.g. "fix all vs
   High+Med"; "relabel vs reroute"). Flag anything only the owner can supply
   (legal data, secrets, business tolerances) — never invent it.

4. **Fix — 5 parallel agents, DISJOINT file ownership.** This is the #1 rule: give
   each agent a cluster of files **no other agent touches** → zero merge conflicts.
   - List each fix with `file:line` + the agreed fix in the prompt.
   - Verify per-agent: web/daemon agents run `tsc` on their scope; **backend agents
     run `php -l` ONLY — NOT `php artisan test`** (concurrent runs share the test DB
     and collide). The MANAGER runs the full suite once at the end.
   - Migrations: agent WRITES the migration; manager RUNS it in the sweep.

5. **Final sweep (manager).**
   - `cd apps/web && npx tsc --noEmit` · `cd apps/daemon && npx tsc --noEmit` (expect 0).
   - `docker exec aivideo-app-1 php artisan migrate --force` if a migration was added.
   - Restart daemon if `apps/daemon/src` changed (tsx has no hot-reload):
     `docker compose -f backend/docker-compose.dev.yml up -d --force-recreate --no-deps daemon`.
   - `docker exec aivideo-app-1 php artisan test` — full suite, expect green.
   - **Expect security/behavior fixes to break tests that encoded the OLD behavior**
     (e.g. raw-path leak removal, published-guards). Update those tests to the new
     correct behavior — do NOT weaken the fix.

6. **Ship.** Commit thematically (one commit per layer: backend / daemon / web),
   each ending with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
   Update `task-status.md`. `git checkout main && git merge --no-ff` → delete branch →
   `git push origin main` (only when the user has authorized the cycle).

## Gotchas that actually bit us (check for these)

- **Agent-introduced regressions** — always run the full suite AFTER the fix agents:
  - `app()->environment()` inside a `config/*.php` file → fatal "Class env does not
    exist" at bootstrap. Use `env('APP_ENV')` in config files.
  - A promoted job property named `$job` collides with `InteractsWithQueue::$job`
    (fatal at class composition). Rename to `$renderJob`.
  - A new settings/data migration + a test that already raw-seeds the same rows →
    UniqueConstraintViolation. Remove the test's manual seed.
  - Filament override visibility must match parent (`public function getSaved...`).
- **`| tail` on a background build** buffers until EOF → empty output mid-build. Use
  `docker compose --progress plain ... build` streamed, or poll for the image.
- **Carbon 3** `now()->diffInX($past)` is **signed/negative** → clamps/comparisons
  silently break. Use `$past->diffInX(now())` or `abs(...)`. (Bit us 3×.)
- **`| grep` on the test command** can hide the summary — read the raw tail if a run
  "exits 0" but shows nothing (a fatal aborts before the `Tests:` line).
- Don't `git add -A` — the repo carries junk "filename 2/3" sync-duplicates; stage
  explicit paths.

## Scale + stop signal

5 analyze + 5 fix agents per round is the sweet spot. Diminishing returns are real:
rounds 1–5 found HIGH/MED bugs; by round 6 it was mostly MED/LOW. When a round yields
no HIGH and mostly nitpicks, **recommend stopping**.

## Project-specific verify commands (see root CLAUDE.md)

```
cd apps/web    && npx tsc --noEmit          # 0 errors
cd apps/daemon && npx tsc --noEmit          # 0 errors
docker exec aivideo-app-1 php artisan test  # full suite green
```
Never `migrate:fresh`/`db:wipe` (real test data). Vietnamese is the UI locale.
