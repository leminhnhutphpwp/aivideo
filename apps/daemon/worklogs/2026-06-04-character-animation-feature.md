# Character Animation Feature — Daemon Worklog

## Date
2026-06-04

## Overview
Implemented full `wan2.2-animate-move` and `wan2.2-animate-mix` support. The feature was previously wired into routing/pricing but the core generation logic was missing — it fell through to generic video handler with wrong endpoint, missing `video_url`, and missing `mode` parameter.

## Files Changed
| File | Change |
|------|--------|
| `src/media/types.ts` | Added `videoRef: ImageRef \| null` and `mode?: string` to `MediaContext` |
| `src/media/index.ts` | Added `videoRef`, `mode` params to `generateMedia()` — resolves video file, passes to context |
| `src/media/providers/qwencloud.ts` | Added `isAnimate` detection; animate-specific params (`mode`, `watermark`), input handling (`image_url` + `video_url`), correct endpoint (`image2video/video-synthesis`) |
| `src/routes/media.ts` | Passthrough `videoRef` and `mode` from request body |

## Key Decisions
1. **`mode` field**: Added as generic `mode?: string` to `MediaContext` — extensible to other providers
2. **`videoRef`**: Separate from `imageRef`/`lastFrameRef` — animate models need both `image_url` (character) + `video_url` (motion reference)
3. **`prompt_extend` deleted** for animate models (purely visual reference based, no text prompt benefits)
4. **Watermark hardcoded `false`** — consistent with other models
5. **Duration not set** — API infers from input video duration

## Verification
- [x] `npx tsc --noEmit` — 0 errors
- [x] Model sync — PASS (35 models)
- [x] Backend tests — 19/19 RenderJob tests pass

## Handoff Notes
- **@web**: New params `videoRef` and `mode` available in `daemon.generate()` call
- Frontend sends `videoRef` (uploaded video filename) + `mode` (`wan-std`/`wan-pro`)
