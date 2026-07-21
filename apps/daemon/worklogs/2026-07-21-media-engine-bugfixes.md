# Media Engine Bug Fixes (7 issues) — Worklog

## Date
2026-07-21

## Overview
Fixed 7 reliability bugs in the Express media daemon: a cancel race causing status strands
and duplicate webhooks, an unbounded `liveTasks` memory leak, duplicate completion webhooks
replayed on every boot, a hung-ffmpeg deadlock in voiceover merge, and 3 provider-level
polling/error-formatting issues.

## Files Changed
| File | Change |
|------|--------|
| `src/routes/media.ts` | Fix 1 — guard `.then` and `.catch` of the `generateMedia` promise: return early if the task is already terminal (`done`/`failed`/`interrupted`), so a cancel mid-flight isn't overwritten and no 2nd terminal webhook fires |
| `src/services/task-manager.ts` | Fix 2 — evict terminal tasks from `liveTasks` in `notifyTaskWaiters` after a 60s grace timer (unref'd). Fix 3 — added `setWebhookDeliveredHandler` hook + fire it on delivery of TERMINAL webhooks only |
| `src/media/tasks.ts` | Fix 3 — added `webhook_delivered` column (CREATE TABLE + ALTER migration), `markMediaTaskWebhookDelivered()`, and filtered boot terminal re-fire query on `COALESCE(webhook_delivered,0)=0` |
| `src/server.ts` | Fix 3 — wired `setWebhookDeliveredHandler` → `markMediaTaskWebhookDelivered(db, id)` before boot reconciliation |
| `src/voiceover/manual.ts` | Fix 4 — added 5-min `setTimeout` that `SIGKILL`s ffmpeg + rejects; `clearTimeout` on close/error |
| `src/media/providers/qwencloud.ts` | Fix 5 — `if (pollErrors >= 5) throw` in the `!pollResp.ok` fallback branch. Fix 6 — fall back to exponential backoff when `Retry-After` parses to NaN |
| `src/media/providers/openai-generic.ts` | Fix 7 — `truncate(text, 240)` on the raw error body (imported `truncate` from `../render-utils.js`) |

## Key Decisions
1. **Terminal guard is an inline status check** (`'done'/'failed'/'interrupted'`) matching the
   existing style in media.ts (e.g. the wait handler) rather than importing a shared set —
   task-manager doesn't export one and the inline form is already the local convention.
2. **liveTasks eviction is deferred 60s, not immediate** — a late long-poll/GET consumer can
   still read the entry; terminal state is already persisted to SQLite and served from there.
   Timer is `unref()`d so it never holds the process open.
3. **`webhook_delivered` is a persisted flag set on terminal-webhook ACK**, wired via a db-bound
   hook set at boot. Progress ('running') webhooks reuse the same retry path, so the hook only
   fires when `task.status` is terminal. `updateMediaTask` doesn't touch the column, so the flag
   survives later progress/state persists; `insertMediaTask` defaults it to 0.
4. **ffmpeg merge timeout = 5 min** — a copy+aac remux is fast; 5 min is a generous hang ceiling
   (mirrors the SIGKILL+reject pattern in `render-utils.ts runHyperFramesRender`).

## Verification
- [x] TypeScript: `npx tsc --noEmit` → 0 errors
- [ ] Tests: not run (no unit tests target these paths; changes are behavioral guards)
- [ ] Manual check: not performed in this session

## Handoff Notes
- **@daemon / manager — SCHEMA CHANGE (fix 3):** added column
  `media_tasks.webhook_delivered INTEGER NOT NULL DEFAULT 0`. Applied idempotently in
  `migrateMediaTasks()` (in CREATE TABLE for fresh DBs + a guarded `ALTER TABLE` for existing
  ones, same pattern as `metadata_json`). No manual migration step needed — it runs on daemon
  boot. Requires a daemon rebuild/restart:
  `docker compose -f backend/docker-compose.dev.yml up -d --force-recreate daemon`.
- **@backend:** boot reconciliation now re-fires a terminal (`completed`/`failed`) webhook only
  if it was never ACKed. Normal completions that Laravel already received will NOT be replayed
  on daemon restart (previously up to 24h were). Interrupted-on-restart webhooks are unchanged.

## Status
✅ Completed
