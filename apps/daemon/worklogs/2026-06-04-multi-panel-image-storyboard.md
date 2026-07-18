# Multi-Panel Image Storyboard — Worklog

## Date
2026-06-04

## Overview
Added `shotType` and `multiPanelImage` support to MediaContext, routes, generateMedia pipeline, and QwenCloud R2V provider for the Multi-Panel image storyboard mode.

## Files Changed

| File | Change |
|------|--------|
| `src/media/types.ts` | Added `shotType?: 'single' \| 'multi'` and `multiPanelImage?: ImageRef` to `MediaContext` |
| `src/media/index.ts` | Accepts `shotType`/`multiPanelImage` args; resolves `multiPanelImage` via `resolveProjectImage`; passes to context |
| `src/media/providers/qwencloud.ts` | R2V handler: when `shotType === 'multi'`, sets `shot_type:'multi'` param, uses `multiPanelImage` as primary `reference_image`, skips normal `imageRef` as first_frame |
| `src/routes/media.ts` | Passthrough `shotType` and `multiPanelImage` from request body to generateMedia |

## Key Decisions
1. Multi-panel follows existing R2V code path — just adds `shot_type:'multi'` parameter + multiPanelImage as reference_image
2. When `shotType === 'multi'`, normal `imageRef` (first_frame) is skipped to avoid duplicate reference

## Verification
- [x] `cd apps/daemon && npx tsc --noEmit`: pass (0 errors)
