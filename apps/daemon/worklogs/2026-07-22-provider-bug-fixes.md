# Provider Bug Fixes (cloudflare / ckey / index / models / render-utils) — Worklog

## Date
2026-07-22

## Overview
Fixed 7 provider-layer bugs in the Express media daemon: zero-byte guards, a
default audioKind that mapped to an empty model set, hardcoded reference filename,
missing aspect-ratio sizes, and a fragile label-based model lookup.

## Files Changed
| File | Change |
|------|--------|
| `src/media/providers/cloudflare.ts` | i2i: added zero-byte guard mirroring t2i; derive reference filename extension from `imageData.mime` (jpg/webp/gif/png) instead of hardcoded `.png` |
| `src/media/providers/ckey.ts` | `renderCKeyImage`: added zero-byte guards in both the URL-download and base64 branches; added explicit 4:3 (`1408x1056`) and 3:4 (`1056x1408`) sizes so they no longer silently fall back to square |
| `src/media/index.ts` | `resolvedAudioKind` default `'music'` → `'speech'` (music has no registered models) |
| `src/media/models.ts` | `modelsForSurface` audio default `'music'` → `'speech'` (both `k` and fallback); `findMediaModel` now matches by `id` only (dropped `|| m.label === id`) |
| `src/media/render-utils.ts` | `bytesFromOpenAICompatibleData` url branch: added zero-byte guard (note: this helper is currently unreferenced/dead code — guard added for safety, not deleted) |

## Key Decisions
1. `findMediaModel` id-only match — verified via grep the sole caller (`index.ts:88`) passes a resolved model id/alias, never a label. No consumer relied on label lookup.
2. Default audioKind → `'speech'` in both `index.ts` and `models.ts` — `AUDIO_MODELS_BY_KIND.music` is always `[]` (no provider model has the `music` cap), so the old default guaranteed a confusing "audio · music. Allowed: ." throw for audio requests without an explicit kind/providerId. `speech` is the broadly-registered (tts) kind.
3. render-utils url-branch guard kept the helper intact (dead code, out of scope to delete per task instructions).

## Verification
- [x] TypeScript: `npx tsc --noEmit` → 0 errors
- [ ] Tests: not run (small guard/config patches, no test-behavior change)
- [x] Manual check: grep confirmed `findMediaModel` has one caller passing an id

## Handoff Notes
- **@backend needs to know**: audio media requests that reach the daemon without an explicit `audioKind`/`provider_id` now default to `speech` (previously errored on the empty `music` set). If any caller intentionally omitted audioKind expecting music-kind behavior, it should pass an explicit kind — but no music-cap models exist, so this only removes a spurious throw.

## Status
✅ Completed
