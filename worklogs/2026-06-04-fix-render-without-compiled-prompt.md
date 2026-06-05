# Bug Fix: Render Without Compiled Prompt — Worklog

## Date
2026-06-04

## Overview
**Bug**: User at `/studio/storyboard/flow/{uuid}` (viewer page) clicking "Render" gets error: "Storyboard has no compiled prompt. Please compile the prompt first."

**Root Cause**: The viewer page directly called `laravel.renderStoryboard(uuid)` without first checking if the storyboard's `compiled_prompt` was set for `single_flow` or `storyboard_image` modes. The editor (`multi-scene-editor.tsx`) had this check, but the viewer (`[uuid]/page.tsx`) did not.

**Fix**: Two-part approach — frontend auto-compile before render + backend safety net.

## Files Changed

| File | Change |
|------|--------|
| `apps/web/src/app/(builder)/studio/storyboard/flow/[uuid]/page.tsx` | Added auto-compile check before render — if `single_flow`/`storyboard_image` mode and no `compiled_prompt`, calls `laravel.compilePrompt(uuid)` first with loading toast |
| `backend/app/Http/Controllers/API/StoryboardController.php` | Added safety net in `render()` method — auto-compiles prompt if `single_flow`/`storyboard_image` mode and `compiled_prompt` is empty, before `markAsRendering()` |

## Key Decisions

1. **Frontend-first approach**: User experience is better with immediate feedback ("Đang compile prompt...") before render starts
2. **Backend safety net**: Even if frontend fails to check, the backend now auto-compiles rather than throwing an error
3. **Used existing patterns**: Followed the same compile check pattern from `multi-scene-editor.tsx` (lines 368-371)
4. **'info' toast variant**: Used `addToast('Đang compile prompt...', 'info')` — the `info` variant is already supported by the toast store

## Verification

- [x] `cd apps/web && npx tsc --noEmit` — 0 errors
- [x] `docker exec backend-app-1 php artisan test --filter="RenderJob|Storyboard"` — 116 passed, 4 pre-existing failures
- [x] All StoryboardController tests pass (including render, compile prompt, etc.)

## Handoff Notes

- No new API endpoints were added — reused existing `compilePrompt` and `renderStoryboard` endpoints
- Backend safety net is transparent to frontend — no response format changes
- Pre-existing test failures (4) are unrelated: RenderJobServiceTest mock issues, PricingConflictAnalysisTest calculation, StoryboardTest analyze storyboard enriched_prompt assertion
