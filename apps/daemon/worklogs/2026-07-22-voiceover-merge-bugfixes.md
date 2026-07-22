# Voiceover / Merge Bugfixes — Worklog

## Date
2026-07-22

## Overview
Fixed three voiceover/merge bugs in the Express media daemon: a corrupt partial output
left on disk when the ffmpeg merge fails, provider metadata being clobbered on a successful
merge, and simulation duration not guarding against `0`/`NaN`.

## Files Changed
| File | Change |
|------|--------|
| `src/voiceover/manual.ts` | Added `cleanupPartial()` (`fs.rmSync(outputPath, { force: true })`) called on every `mergeAudioVideo` failure path — SIGKILL timeout, non-zero exit, stat failure, and spawn error — so no half-merged `voiceover-*.mp4` survives. |
| `src/routes/media.ts` | Merge block (~1071): replaced `meta = { ...merged }` with a selective merge that keeps the real video provider metadata (`model`, `providerId`, `providerNote`, `warnings`, etc.) and only overwrites file identity (`name`/`size`/`mtime`/`mime`) from the merged output. |
| `src/media/simulation/generators-video.ts` | `duration` now uses `Number.isFinite(ctx.length) && ctx.length > 0 ? ctx.length : 5` instead of `ctx.length ?? 5`. |
| `src/media/simulation/generators-audio.ts` | `duration` now uses `Number.isFinite(ctx.duration) && ctx.duration > 0 ? ctx.duration : 3` instead of `ctx.duration ?? 3`. |

## Key Decisions
1. Clean up the partial file inside `mergeAudioVideo` (not in the media.ts catch) — reason: keeps the cleanup guaranteed on all failure exits and localizes the concern to the function that created the file.
2. Spread original `meta` first, then overwrite only file-identity fields — reason: preserves any provider fields present on the completed webhook payload without enumerating them exhaustively.

## Verification
- [x] TypeScript: `npx tsc --noEmit` → 0 errors
- [ ] Tests: not run (scoped bugfix)
- [ ] Manual check: not run

## Status
✅ Completed
