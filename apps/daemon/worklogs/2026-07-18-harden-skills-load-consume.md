# Harden daemon skills load/consume — Worklog

## Date
2026-07-18

## Overview
Hardened the daemon's skill load/consume path: stopped `status: draft` style skills
from leaking into the generation pipeline, made the video-direction mapper symmetric
with image-direction (no more `undefined` fields), wired the orphaned
`video-marketing-psychology` system skill so it loads and appears in `GET /media/skills`,
and added a schema-validation vitest that gates the entire real skill corpus.

## Files Changed
| File | Change |
|------|--------|
| `apps/daemon/src/skills/loader.ts` | Added `isPublishedSkill(skill)` helper (mirrors `/media/skills` draft rule) + `loadVideoMarketingPsychology()` single-skill loader |
| `apps/daemon/src/skills/index.ts` | Re-export `loadVideoMarketingPsychology`, `isPublishedSkill` |
| `apps/daemon/src/prompts/video-directions.ts` | `ensureLoaded()` now `.filter(isPublishedSkill)`; `skillToDirection` gets `?? []` / `?? '{subject}'` fallbacks on every field (symmetry with image-directions) |
| `apps/daemon/src/prompts/image-directions.ts` | `ensureLoaded()` now `.filter(isPublishedSkill)` — draft styles no longer consumed |
| `apps/daemon/src/routes/media.ts` | Import + wire `marketing_psychology: buildMeta|null` into `GET /media/skills`; `when_to_use` in `buildMeta`/`buildTypeMeta` falls back to `best_for` (was always empty) |
| `apps/daemon/src/skills/loader.test.ts` | NEW — schema gate over the real corpus (111 tests) |

## Key Decisions
1. **Shared `isPublishedSkill` helper** in loader — single source for the "absent status ⇒ published, `draft` hidden" rule, reused by both direction consumers so it can't drift from `GET /media/skills`.
2. **`when_to_use ?? best_for`** rather than dropping the field — keeps the API shape (`string[]`) but populates it (no style skill defines `when_to_use`).
3. **Family-specific placeholder allow-list in the test** — image = `{subject,style,mood,negative}`; video also allows `{camera,lighting}` (legitimately resolved from studio presets). Blocks the `{details}/{colors}` class of bug.
4. **Video-direction vocab assertion** — `camera_presets`/`lighting_presets`/`mood_tones` must be ⊆ `studio-vocab.json`; an off-vocab value silently empties a studio dropdown.

## Verification
- [x] TypeScript: `npx tsc --noEmit` → 0 errors
- [x] Tests: `npm test` → **279 passed / 4 skipped / 0 failed** (168 baseline + 111 new; none reduced)
- [x] Draft-leak blocked (runtime check): `IMAGE_DIRECTIONS` 28→19, `VIDEO_DIRECTIONS` 17→13 — the 9 image + 4 video drafts (incl. `line-art-sketch`) are no longer consumed, matching the studio's hidden set.
- [x] `loadVideoMarketingPsychology()` loads `id: video-marketing-psychology`; now present in `GET /media/skills` under `marketing_psychology`.

## Handoff Notes
- **@backend needs to know**: `GET /media/skills` now returns a new top-level key `marketing_psychology` (buildMeta shape, or `null` if hidden). As planned, add `video-marketing-psychology` to `DAEMON_CATEGORIES='single'` in SkillService so backend recognizes it as a single skill.
- **@web needs to know**: no shape change to existing keys; `when_to_use` may now be populated (from `best_for`) where it was previously always `[]`. New optional `marketing_psychology` object available.

## Status
✅ Completed
