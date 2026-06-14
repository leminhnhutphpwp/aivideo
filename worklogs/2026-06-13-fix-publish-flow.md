# Fix Publish Flow — Revert Storyboard, Add to RenderJob

## Date
2026-06-13

## Overview
Reverted incorrect Storyboard publish changes (community features operate on RenderJobs, NOT Storyboards). Removed all publish-related code from Storyboard model, controller, routes, API client, types, and viewer page. Added publish functionality to Jobs page and Project detail page where RenderJobs are displayed.

## Files Changed

| File | Change |
|------|--------|
| `backend/database/migrations/2026_06_13_000001_add_community_fields_to_storyboards_table.php` | Deleted |
| `backend/app/Models/Storyboard.php` | Removed `visibility`, `published_at`, `tags` from `$fillable` and `$casts`; removed `publish()`, `unpublish()`, `isPublished()` methods |
| `backend/app/Http/Controllers/API/StoryboardController.php` | Removed `publish()`, `unpublish()` methods; removed `CommunitySettings` import |
| `backend/routes/api.php` | Removed `PATCH /storyboards/{uuid}/publish` and `PATCH /storyboards/{uuid}/unpublish` routes |
| `apps/web/src/lib/api/client.ts` | Removed `communityPublishStoryboard()` and `communityUnpublishStoryboard()` methods |
| `apps/web/src/lib/api/storyboard-types.ts` | Removed `visibility`, `published_at`, `tags` from Storyboard interface |
| `apps/web/src/app/(builder)/studio/storyboard/flow/[uuid]/page.tsx` | Removed publish modal state, `isPublished` computed, `handleUnpublish`, publish buttons, PublishModal import/render, `Share2` import |
| `apps/web/src/components/projects/types.ts` | Added `visibility`, `published_at`, `tags`, `credits_cost` to `RenderJobRecord` |
| `apps/web/src/app/(dashboard)/jobs/page.tsx` | Added PublishModal, toast store; added publish/unpublish buttons and modal to each completed job card |
| `apps/web/src/components/projects/job-history.tsx` | Added PublishModal, toast store; added publish/unpublish buttons and modal to each completed render job in history |
| `apps/web/src/app/(dashboard)/projects/[id]/page.tsx` | Added PublishModal import (publish is handled via JobHistory component) |

## Key Decisions
1. Community features operate on RenderJobs (individual assets), NOT Storyboards — per architecture spec
2. Publish buttons appear only on completed jobs (status = 'completed'/'done')
3. Both Jobs page and Project detail page now support publish via the existing `communityPublish()` / `communityUnpublish()` client methods (which target `/render-jobs/{uuid}/publish`)
4. Manually dropped `visibility`, `published_at`, `tags` columns from `storyboards` table since migration file was deleted before rollback could find it

## Verification
- [x] `docker exec backend-app-1 php artisan test --filter="Community"` — 48 passed, 1 skipped (pre-existing)
- [x] `cd apps/web && npx tsc --noEmit` — 1 pre-existing error in billing types (not related to this change)
- [x] Database columns `visibility`, `published_at`, `tags` removed from `storyboards` table

## Handoff Notes
- **@backend**: Storyboard publish endpoints (`PATCH /storyboards/{uuid}/publish`, `PATCH /storyboards/{uuid}/unpublish`) are removed. RenderJob publish endpoints remain at `PATCH /render-jobs/{uuid}/publish` and `PATCH /render-jobs/{uuid}/unpublish`
- **@web**: Publish buttons now appear on Jobs page and Project detail page (JobHistory) for completed RenderJobs
