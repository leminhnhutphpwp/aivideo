# Implement Remaining UI & Backend Tasks — Worklog

## Date
2026-06-04

## Overview
Implemented all remaining pending tasks across the frontend and backend: competitor comparison pricing section, multi-panel image generation (frontend & backend), 2-stage render pipeline, and wan2.7-image model sync to pricing.

## Files Changed

### Task 1: Competitor Comparison Section on Pricing Page

| File | Change |
|------|--------|
| `apps/web/src/components/billing/CompetitorComparison.tsx` | **New**: Full comparison table — Wavise vs Kling vs Runway vs Pika with 11 feature rows |
| `apps/web/src/app/(dashboard)/billing/pricing/page.tsx` | Added `CompetitorComparison` below `PricingPlans` |

### Task 2: Multi-Panel Image Phase 2 — Web Tasks

| File | Change |
|------|--------|
| `apps/web/src/app/(builder)/studio/storyboard/flow/storyboard-image/storyboard-image-panel.tsx` | Added `onGenerateMultiPanel` / `generatingMultiPanel` props + "Tạo ảnh multi-panel từ AI" button with loading spinner |
| `apps/web/src/app/(builder)/studio/storyboard/flow/multi-scene/multi-scene-editor.tsx` | Added `handleGenerateMultiPanel` callback, `generatingMultiPanel` state, passes new props to `StoryboardImagePanel` |
| `apps/web/src/lib/api/client.ts` | Added `generateMultiPanelImage(uuid)` → POST to backend endpoint, returns `{ multi_panel_image, status }` |

### Task 3: Multi-Panel Image Phase 2 — Backend Tasks

| File | Change |
|------|--------|
| `backend/app/Services/AiPromptCompiler.php` | Added `compileForImage()` — compiles scenes into a comic-strip-style multi-panel image prompt |
| `backend/app/Http/Controllers/API/StoryboardController.php` | Added `generateMultiPanelImage()` — new controller method that compiles image prompt, calls daemon T2I (wan2.7-image-pro), downloads result, stores as `multi_panel_image` |
| `backend/routes/api.php` | Added route `POST /api/storyboards/{uuid}/generate-multi-panel-image` |
| `backend/app/Services/StoryboardRenderer.php` | Updated `renderSingleFlow()` with 2-stage pipeline: auto-generates multi-panel image if `shot_type === 'multi'` and `multi_panel_image` is empty, then proceeds with normal R2V render. Added `generateMultiPanelImage()` helper |
| `backend/app/Services/ModelSelector.php` | Added `image_multi_panel` → `wan2.7-image-pro` to `DEFAULT_MODELS` |
| `backend/database/seeders/PricingSystemSeeder.php` | Added `image_multi_panel` → `wan2.7-image-pro` to all 3 quality tier `model_mapping` configs |

## Key Decisions

1. **Generate button appears conditionally**: Only when `sceneCount > 0` and `multiPanelImageUrl` is null — prevents confusion on empty storyboards
2. **2-stage pipeline is automatic**: If user has multi-panel storyboard mode but no uploaded/generated image, `renderSingleFlow` auto-generates it synchronously (waits up to 120s for daemon T2I task)
3. **Daemon API key reused**: Multi-panel image generation uses existing `wan2.7-image-pro` via daemon's `generateMedia` with `t2i` capability
4. **Pricing model sync**: Added `image_multi_panel` as a separate video type code to quality tiers, distinct from `image_generation`, to allow future per-model pricing

## Verification

- [x] tsc --noEmit: pass (0 errors)
- [x] PHP lint: all 6 modified files pass
- [x] Backend storyboard tests: 57/57 pass
- [x] Backend render pipeline tests: 10/10 pass
- [x] Backend total: 92/93 pass (1 pre-existing PricingConflictAnalysisTest failure — unrelated)

## Handoff Notes

- **@web**: The `CompetitorComparison` component is standalone and ready. The "Tạo ảnh multi-panel từ AI" button uses `laravel.generateMultiPanelImage(uuid)` which requires the storyboard to be saved first.
- **@backend**: The new endpoint `POST /api/storyboards/{uuid}/generate-multi-panel-image` uses daemon T2I model `wan2.7-image-pro`. 120s timeout is set for the task wait. If the daemon is not running or task fails, the endpoint returns 500 with error message.
- **@daemon**: Multi-panel image generation goes through existing `generateMedia` flow with `t2i` capability. The `wan2.7-image-pro` model must be available in the daemon's `models.ts`.
