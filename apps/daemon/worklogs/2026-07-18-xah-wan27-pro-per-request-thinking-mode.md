# Wan 2.7 Image Pro + per-request thinking_mode (xah/DashScope) — Worklog

## Date
2026-07-18

## Overview
Wired the best-quality multi-panel storyboard image path in the daemon: added the
xah.io `Wan2.7_Image_Pro` model under the `openai` provider, and made DashScope
`thinking_mode` controllable PER REQUEST (`ctx.thinkingMode`) so only the slow
multi-panel call opts in — all other image generation stays fast. The DashScope
`parameters` body is now always-on in dev via `OPENAI_IMAGE_DASHSCOPE_PARAMS=1`.

## Files Changed
| File | Change |
|------|--------|
| `apps/daemon/src/media/types.ts` | Added `thinkingMode?: boolean` to `MediaContext` (next to `watermark`) |
| `apps/daemon/src/media/index.ts` | Added `thinkingMode?: boolean` to `generateMedia` args; threaded `thinkingMode: args.thinkingMode` into the ctx object |
| `apps/daemon/src/routes/media.ts` | Media generate route: pass `thinkingMode: req.body?.thinking_mode` into `generateMedia({...})` |
| `apps/daemon/src/media/providers/openai-generic.ts` | `renderOpenAIGenericImage`: `const thinking = ctx.thinkingMode ?? thinkingModeEnabled();` used in the DashScope `parameters.thinking_mode` (env fn kept as fallback default) |
| `apps/daemon/src/media/providers.ts` | Added model `xah-wan2.7-image-pro` (wire `phuocanh421994/Wan2.7_Image_Pro`) right after `wan2.7-image` under the `openai` provider |
| `backend/docker-compose.dev.yml` | Added `OPENAI_IMAGE_DASHSCOPE_PARAMS=1` to daemon `environment`. Did NOT set `OPENAI_IMAGE_THINKING_MODE` (stays per-request) |

## Key Decisions
1. `ctx.thinkingMode ?? thinkingModeEnabled()` — per-request value wins; env is the
   fallback default so existing behavior is preserved when the request omits it.
2. DashScope params env set in compose `environment` (not the `.env` file) — takes
   precedence and keeps the dev override explicit/visible.
3. Left qwencloud provider and all other models untouched, per instructions.

## Verification
- [x] TypeScript: `npx tsc --noEmit` → 0 errors
- [x] Daemon rebuilt: `docker compose -f backend/docker-compose.dev.yml up -d --force-recreate daemon` → started cleanly, listening on :7456
- [x] Env live in container: `OPENAI_IMAGE_DASHSCOPE_PARAMS=1`, `OPENAI_IMAGE_THINKING_MODE=` (empty, per-request)
- [x] Model registered: `IMAGE_MODELS` contains `xah-wan2.7-image-pro` → wire `phuocanh421994/Wan2.7_Image_Pro`, provider `openai`
- Note: startup WEBHOOK warnings (`ENOTFOUND app`) are pre-existing — the Laravel `app` container was not running; unrelated to this change.

## Handoff Notes
- **@backend needs to know**: daemon now accepts `thinking_mode` (boolean) in the media
  generate request body — forward it (as `thinking_mode`) when calling the daemon for the
  multi-panel storyboard image, and select model id `xah-wan2.7-image-pro` for that path.
  For all other image gen, omit `thinking_mode` to keep it fast.
- **@web needs to know**: new model id `xah-wan2.7-image-pro` (label "Wan 2.7 Image Pro").

## Status
✅ Completed
