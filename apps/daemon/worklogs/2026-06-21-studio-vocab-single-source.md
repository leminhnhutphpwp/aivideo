# Studio controlled vocabulary — single source of truth — Worklog

## Date
2026-06-21

## Overview
The canonical camera/lighting/mood/style values lived in two places — the daemon's skill-
authoring prompt (hardcoded) and the web's `options.ts` — risking drift. Consolidated them into
ONE JSON source that the daemon consumes directly, plus a web test that fails if `options.ts`
ever diverges from it.

## Files Changed
| File | Change |
|------|--------|
| `apps/daemon/src/media/studio-vocab.json` | **NEW — the single source**: `{ camera, lighting, mood, style }` value lists. |
| `apps/daemon/src/media/vocab.ts` | **NEW**: loads the JSON, exports `STUDIO_VOCAB`. |
| `apps/daemon/src/routes/media.ts` | `/skills/author` vocab constraint now built from `STUDIO_VOCAB` (no inline list); new `GET /media/vocab` endpoint exposes it. |
| `apps/web/src/components/studio/__tests__/vocab-sync.test.ts` | **NEW**: reads `studio-vocab.json` and asserts `CAMERA/LIGHTING/MOOD/STYLE_OPTIONS` values match (ignoring UI placeholders) — fails on drift. |

## Key Decisions
1. **JSON is the source; the daemon owns it** (it's the generation authority + already reads
   `/skills` data). The web keeps icons/labels (presentation) but its option *values* are now
   guarded against the JSON by a test — so there's one authoritative value list.
2. **Test-enforced sync** rather than a runtime cross-app import (web is Next.js, daemon is
   Node — no shared module). The web vitest reads the daemon JSON via `process.cwd()/../daemon/...`.
3. The sync test already paid off — it caught that `STYLE_OPTIONS` carries an empty
   placeholder value, which the test now correctly ignores.

## Verification
- [x] Daemon + web `npx tsc --noEmit` → 0 errors.
- [x] `npx vitest run vocab-sync` → 4/4 pass (camera/lighting/mood/style).
- [x] Daemon rebuilt, starts clean (vocab.ts reads the JSON). `GET /media/vocab` →
  camera 10, lighting 9, mood 8, style 10 with correct values.
- [x] Authoring prompt constraint is rendered from `STUDIO_VOCAB` (same values as before, now
  single-sourced).

## How to change the vocabulary now
Edit `apps/daemon/src/media/studio-vocab.json` (daemon picks it up on restart). If the change
also needs a new studio dropdown option, update `options.ts` too — the vocab-sync test will
remind you if they drift.

## Status
✅ Completed (not committed — awaiting owner)
