# Media Daemon Bugfixes (projects / task-manager / media routes) — Worklog

## Date
2026-07-21

## Overview
Fixed 7 bugs across the Express media engine: a path-traversal boundary bug, webhook 4xx
mis-classification, a progress-webhook map leak, a dead 201 status, unguarded JSON.parse,
an incomplete raw-serve MIME map, and missing upstream `r.ok` checks on LLM fetches.

## Files Changed
| File | Change |
|------|--------|
| `src/routes/projects.ts` | `safeJoin` now uses a `path.sep` boundary (no sibling-prefix escape); `mapProject` + PATCH merge JSON.parse wrapped via new `safeParseJson`; `POST /` returns 201 from insert `.changes`; extracted the rich `MIME` table to route scope and reused it in `GET /:id/raw/:file` |
| `src/services/task-manager.ts` | `sendHttpRequest` returns `{ ok, retryable }` — 2xx/3xx=ok, 4xx=non-retryable error, 5xx/network=retryable; retry loop logs 4xx as ERROR and does not retry; `fireWebhook` deletes the `lastProgressWebhook` entry on terminal state |
| `src/routes/media.ts` | Added `if (!r.ok)` upstream-status checks (log + generic 502) to both LLM branches in `/skills/author`, `/enhance-prompt`, `/ai-draft` — no raw provider text leaked |

## Key Decisions
1. `safeJoin` fix mirrors the existing `projectDirFor` boundary logic (`p !== b && !p.startsWith(b + path.sep)`) for consistency.
2. Introduced a `retryable` flag rather than status-code checks in the retry loop, so the delivery classification lives in one place (`sendHttpRequest`).
3. LLM upstream failures return a generic `502 { error: 'AI provider unavailable' }` and log the status only — never the provider response body — to avoid leaking upstream text.
4. Hoisted the `MIME` map to `createProjectRoutes` scope (function declaration / const hoisting keeps `mapProject`→`safeParseJson` valid at call time).

## Verification
- [x] TypeScript: `npx tsc --noEmit` → 0 errors
- [ ] Tests: not run (type-level change; no test harness invoked)
- [ ] Manual check: not performed

## Handoff Notes
- **@backend needs to know**: The daemon now treats a webhook callback returning 4xx (e.g. rejected HMAC / 422 validation) as a permanent ERROR-logged failure with NO retry — previously these were silently logged as "sent". If Laravel's webhook endpoint returns 401/403/422, the daemon will log an error and stop. Ensure the callback returns 2xx on success.

## Status
✅ Completed
