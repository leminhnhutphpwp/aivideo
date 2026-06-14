# Publish Button Integration — Worklog

## Date
2026-06-13

## Overview
Integrated community publish functionality into the storyboard viewer page. Added backend support for publishing/unpublishing storyboards (mirroring the existing render_jobs community flow) and connected it to the frontend viewer page with the existing PublishModal component.

## Files Changed

| File | Change |
|------|--------|
| `backend/database/migrations/2026_06_13_000001_add_community_fields_to_storyboards_table.php` | New migration: adds `visibility`, `published_at`, `tags` columns + index |
| `backend/app/Models/Storyboard.php` | Added `visibility`, `published_at`, `tags` to fillable/casts + `publish()`, `unpublish()`, `isPublished()` methods |
| `backend/app/Http/Controllers/API/StoryboardController.php` | Added `publish()` and `unpublish()` controller methods with Pro check, daily limit, validation |
| `backend/routes/api.php` | Added `PATCH /storyboards/{uuid}/publish` and `PATCH /storyboards/{uuid}/unpublish` routes |
| `apps/web/src/lib/api/storyboard-types.ts` | Added `visibility`, `published_at`, `tags` fields to Storyboard interface |
| `apps/web/src/lib/api/client.ts` | Added `communityPublishStoryboard()` and `communityUnpublishStoryboard()` API methods |
| `apps/web/src/app/(builder)/studio/storyboard/flow/[uuid]/page.tsx` | Added PublishModal integration, publish/unpublish buttons, state management |

## Key Decisions
1. **Mirrored RenderJob pattern** — Used same publish/unpublish logic from `CommunityController` (Pro check, daily limit via `CommunitySettings`, tag upsert)
2. **No creator_payout for storyboards** — Unlike render_jobs, storyboards don't have a buyback payout system, so `creator_payout` column was omitted
3. **Reused existing PublishModal** — The existing `PublishModal` component works with both render_jobs and storyboards (same props: `assetName`, `creditsCost`, `onConfirm`)
4. **Button placement** — Publish button appears in the toolbar after the "Tải về" (Download) button, before the delete divider; shows green "Đã đăng" when already published

## Verification
- [x] Migration ran successfully via `docker compose exec app php artisan migrate`
- [x] Backend container restarted
- [x] `npx tsc --noEmit` — 0 new errors (1 pre-existing in billing/types.ts)
- [x] Publish button renders on completed storyboard viewer

## Handoff Notes
- **@web needs to know**: API endpoints ready at `PATCH /api/storyboards/{uuid}/publish` and `PATCH /api/storyboards/{uuid}/unpublish`
- **API contract**: `publish` body accepts `{ visibility: 'sharing'|'public', tags?: string[] }`. Returns 403 for non-Pro, 429 for daily limit exceeded.
