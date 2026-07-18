# FLF "khôi phục nhà" — behavior-lock tests + live DashScope video verification — Worklog

## Date
2026-07-18

## Overview
Locked the FLF (first-frame → last-frame morph) request contract in `renderQwenCloudVideo`
with 5 new unit tests, then verified against **real DashScope** that the daemon's
`DASHSCOPE_API_KEY` has video-generation access and produces a genuine old→restored house
morph clip. All three priorities completed (no blocker).

## Files Changed
| File | Change |
|------|--------|
| `apps/daemon/src/media/providers/qwencloud.test.ts` | +5 FLF contract tests (new `describe` block) |
| `apps/daemon/scripts/flf-live-check.mjs` | New live verification script (t2i → i2i edit → wan i2v FLF → mp4) |
| `apps/daemon/scratchpad/flf/*` | Live artifacts: `flf_restoration.mp4`, `old.{png,jpg}`, `restored.{png,jpg}`, `frames/` |

## #1 — Behavior-lock tests (regression guard)
Added `renderQwenCloudVideo — FLF (first/last frame) contract` covering:
1. **wan2.7-i2v** sends BOTH `{type:'first_frame'}` and `{type:'last_frame'}` in `input.media` with correct URLs, via `/services/aigc/video-generation/video-synthesis`.
2. wan2.7-i2v prefers `dataUrl` over `abs` for frame URLs.
3. wan2.7-i2v omits `last_frame` when only first frame is provided (plain i2v).
4. **wan2.2 kf2v** sends `input.first_frame_url` + `input.last_frame_url` via `/services/aigc/image2video/video-synthesis`.
5. **wan2.6-i2v** sends first frame via `input.img_url` only (no last-frame plumbing on this branch).

## #2 — Live DASHSCOPE video access: CONFIRMED (no blocker)
- Base URL `https://dashscope-intl.aliyuncs.com/api/v1`, key tail `nJ2TidOE` (from container env; stubs=0, sim=0).
- **Async flow**: `POST .../video-generation/video-synthesis` with header `x-dashscope-async: enable` → `output.task_id` (status `PENDING`); poll `GET /tasks/{id}` → `RUNNING` → `SUCCEEDED` with `output.video_url`; download mp4.
- Model **`wan2.7-i2v-2026-04-25` accepted (HTTP 200) and SUCCEEDED** with first_frame+last_frame → **key HAS video permission**. Fallback `wan2.6-i2v` not needed.
- Frames passed as **base64 JPEG data URLs** (payload ~479 KB) — required because DashScope's own OSS result URLs return 403 when fed cross-service as image inputs.

## #3 — Real FLF clip: PRODUCED
- OLD frame (t2i `qwen-image-plus`): ruined abandoned house, cracked walls, broken roof, overgrown yard.
- RESTORED frame (i2i edit **`qwen-image-2.0-pro`**, source = old frame): restored house, new roof, fresh paint, clean yard, same composition.
- Video: `wan2.7-i2v-2026-04-25`, first=old, last=restored.
- **ffprobe**: H.264 **1928×1074** (~16:9), **30fps**, **150 frames / 5.06 s**, +AAC audio, **16.0 MB**, ~25 Mbps.
- **Morph verified** from extracted frames: t=0 ruined → t=2.5 genuine cross-dissolve (old broken-roof structure ghosts into new roof, cracked wall fades, yard greens) → t=4 fully restored matching last_frame.
- **Latency ~48 s** end-of-submit → SUCCEEDED (1080P, 5 s). Total pipeline (2 images + video) ~50 s.
- Artifacts: `apps/daemon/scratchpad/flf/flf_restoration.mp4` (+ frames, source images).

## Key Decisions
1. Base64 data URLs end-to-end — DashScope OSS result URLs 403 when re-fed as inputs; base64 is a daemon-supported path (`dataUrl`) and sidesteps it.
2. Edit model = `qwen-image-2.0-pro` — `qwen-image-plus` is t2i-only (rejects image input: "content parameter's length invalid").
3. JPEG-compress frames (≤1280w) before video submit to keep the base64 body small.

## Verification
- [x] TypeScript: `npx tsc --noEmit` → 0 errors
- [x] Tests: full daemon suite **300 passed / 4 skipped** (baseline 295 → +5 new FLF tests; none removed)
- [x] Live: real DashScope video task submitted, polled, downloaded, ffprobed; morph visually confirmed

## Handoff Notes
- **@daemon**: Latent gap — `wan2.6-i2v` is registered with caps hint "first/last frame" (`providers.ts:63`), but `renderQwenCloudVideo` only sends `img_url` (first frame) on the wan2.6 branch (`qwencloud.ts:262-269`); last_frame is dropped for wan2.6. Locked as-is by test #5. If wan2.6 FLF is desired, that branch needs last-frame support.
- **@backend**: FLF plumbing (`DaemonClient` `last_frame` → daemon `req.body.last_frame` → `lastFrameRef`) verified working via wan2.7-i2v. Production sends R2 public URLs; base64 `dataUrl` is also an accepted path.

## Status
✅ Completed
