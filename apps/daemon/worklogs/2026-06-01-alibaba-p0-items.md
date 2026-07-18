# Alibaba P0 Items — Batch Polling, Task Cancel, Seed

## Date
2026-06-01

## Overview
Implemented 3 remaining P0 best practices from alibaba-model-studio-analysis.md.

## Files Changed
| File | Change |
|------|--------|
| `apps/daemon/src/media/providers/qwencloud.ts` | batchQueryTasks(), pollTaskBatched(), PollingCoordinator, seed param |
| `apps/daemon/src/media/types.ts` | Added seed?: number to MediaContext |
| `apps/daemon/src/routes/media.ts` | POST /tasks/:id/cancel endpoint |
| `backend/app/Http/Controllers/API/RenderJobController.php` | cancelTask() method |
| `backend/routes/api.php` | POST /render-jobs/{id}/cancel route |
| `backend/database/migrations/*_add_seed_to_storyboard_scenes.php` | seed column |
| `apps/web/src/app/(builder)/studio/storyboard/flow/multi-scene/property-panel-camera.tsx` | seed input |
| `apps/web/src/app/(dashboard)/studio/video/[feature]/page.tsx` | Cancel button |

## Key Decisions
1. Batch polling uses 2s window to collect concurrent tasks
2. Task cancellation validates status before cancelling
3. Seed is optional — empty = random

## Verification
- [x] tsc --noEmit daemon: 0 errors
- [x] tsc --noEmit web: 0 errors
- [x] Backend tests: 19/19 passed

## Handoff Notes
- @backend: New endpoint POST /render-jobs/{id}/cancel
- @web: Cancel button on viewer page, seed input in camera panel
