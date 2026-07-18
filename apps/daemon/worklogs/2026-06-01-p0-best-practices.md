# 3 P0 Best Practices from Alibaba Analysis — Worklog

## Date
2026-06-01

## Overview
Implemented 3 P0 best practices from Alibaba analysis: Batch Polling, Task Cancellation, and Seed Parameter. All TypeScript checks pass, all 19 backend tests pass.

## Files Changed

| File | Change |
|------|--------|
| `apps/daemon/src/media/types.ts` | Added `seed?: number` to MediaContext type |
| `apps/daemon/src/media/index.ts` | Added `seed` to generateMedia args and pass to ctx |
| `apps/daemon/src/media/providers/qwencloud.ts` | Added `batchQueryTasks()`, `pollTaskBatched()`, polling coordinator; seed support for video/image; batched poll loops |
| `apps/daemon/src/routes/media.ts` | Added `POST /tasks/:id/cancel` endpoint; passed seed to generateMedia |
| `backend/app/Http/Controllers/API/DaemonProxyController.php` | Added `cancelTask()` proxy method; added `seed` to safeData |
| `backend/app/Http/Controllers/API/RenderJobController.php` | Existing cancel method already handled task cancellation |
| `backend/app/Http/Controllers/API/StoryboardController.php` | Added `cancel()` method for storyboard cancellation |
| `backend/app/Models/StoryboardScene.php` | Added `seed` to fillable and casts |
| `backend/routes/api.php` | Added `POST /render-jobs/{id}/cancel`, `POST /storyboards/{id}/cancel`, `POST /daemon/media/tasks/{id}/cancel` routes |
| `backend/database/migrations/2026_06_01_225143_add_seed_to_storyboard_scenes_table.php` | New migration: adds `seed` column to storyboard_scenes |
| `backend/app/Services/StoryboardRenderer.php` | Pass seed to daemon in `renderSceneGenerate()` and `renderScene()` |
| `apps/web/src/lib/api/client.ts` | Added `cancelRenderJob()`, `cancelDaemonTask()`, `cancelStoryboard()` |
| `apps/web/src/lib/api/storyboard-types.ts` | Added `seed?: number` to SceneFormData |
| `apps/web/src/app/(builder)/studio/storyboard/flow/multi-scene/property-panel-camera.tsx` | Added seed input field (optional, placeholder "Để trống = random") |
| `apps/web/src/app/(builder)/studio/storyboard/flow/multi-scene/property-panel.tsx` | Pass seed to PropertyPanelCamera |
| `apps/web/src/app/(builder)/studio/storyboard/flow/[uuid]/page.tsx` | Added cancel button (shows during analyzing/rendering states) |

## Key Decisions

1. **Batch Polling**: Implemented a `PollingCoordinator` that batches concurrent task polls into single DashScope API calls. Batches are flushed every 2s. Falls back to single-poll on errors or when only one task is active.

2. **Task Cancellation**: 
   - Backend: RenderJobController.cancel() already existed; added StoryboardController.cancel() which cancels pending render jobs and releases reserved credits
   - Daemon: Added POST /tasks/:id/cancel endpoint that marks task as interrupted and calls DashScope cancel API
   - Frontend: Cancel button appears during analyzing/rendering states on the viewer page

3. **Seed Parameter**: Added as optional field at every layer — MediaContext type → daemon route → qwencloud provider params → StoryboardScene model → frontend property panel. Empty = random (provider default).

## Verification
- [x] tsc --noEmit (daemon): 0 errors
- [x] tsc --noEmit (web): 0 errors
- [x] Tests: 19/19 passed (RenderJobPipelineTest + RenderJobTest)

## Handoff Notes
- **@web needs to know**: New client methods `cancelRenderJob()`, `cancelStoryboard()`, `cancelDaemonTask()`. Seed input added to camera property panel.
- **@backend needs to know**: Migration needed: `php artisan migrate` for `seed` column on `storyboard_scenes`. New routes: `POST /storyboards/{uuid}/cancel`, `POST /daemon/media/tasks/{taskId}/cancel`.
