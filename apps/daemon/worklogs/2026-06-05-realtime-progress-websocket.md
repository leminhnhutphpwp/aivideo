# Realtime Progress via WebSocket — Worklog

## Date
2026-06-05

## Overview
Added progress webhook support to the daemon so Laravel can receive realtime updates during media generation and push them via Reverb WebSockets.

## Files Changed
| File | Change |
|------|--------|
| `apps/daemon/src/services/task-manager.ts` | Added `progress` field to terminal webhook payload; added throttled `fireProgressWebhook()` function (3s throttle per task) that sends webhook with `status: 'running'` |
| `apps/daemon/src/routes/media.ts` | Imported `fireProgressWebhook` and call it from the `onProgress` callback after `appendTaskProgress` to fire progress webhooks during generation |

## Key Decisions
1. Progress webhooks are throttled to 3s per task to avoid flooding Laravel with too many requests
2. Terminal webhook payload now also includes the accumulated `progress` array
3. Progress webhook uses 1 retry (vs 3 for terminal) since progress updates are frequent and loss is acceptable

## Verification
- [x] tsc --noEmit: pass

## Handoff Notes
- **@backend needs to know**: Daemon now sends progress webhooks with `status: 'running'`, needs to handle them in `DaemonWebhookController`
