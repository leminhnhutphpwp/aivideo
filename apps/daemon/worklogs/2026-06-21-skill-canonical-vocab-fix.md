# Fix broken skill dropdowns — canonical preset vocabulary — Worklog

## Date
2026-06-21

## Overview
Selecting an AI-authored video skill (e.g. ASMR) left the studio's Style/Mood/Camera/Lighting
dropdowns empty or icon-less. Root cause: the video studio filters fixed global option lists
by the skill's `camera_presets`/`lighting_presets`/`mood_tones`, so a skill MUST use those exact
canonical values — but the AI authoring prompt told the LLM to "invent fresh values", so it
produced `Slow Push In`, `Soft Window Light`, `Relaxing`… which match nothing → empty filters.

## Root cause
`apps/web/.../studio/video/[feature]/page.tsx` does
`CAMERA_OPTIONS.filter(o => preset.cameraPresets.includes(o.value))` (same for mood/lighting),
where CAMERA/LIGHTING/MOOD_OPTIONS are fixed vocabularies in `options.ts`. Original skills
(beauty, cinematic) use canonical values; the AI-generated ones did not. Style uses a hardcoded
`STYLE_SUGGESTIONS[id]` map with no entry for new skills.

## Files Changed
| File | Change |
|------|--------|
| `apps/skills/video-direction/{asmr-slow-pour,brand-cinematic-doc,cozy-with-me,stop-motion-claymation}/SKILL.md` | Remapped `camera_presets`/`lighting_presets`/`mood_tones` to canonical values (e.g. Slow Push In→Dolly, Soft Window Light→Natural, Relaxing→Peaceful). |
| `apps/web/src/components/studio/options.ts` | Added `STYLE_SUGGESTIONS` entries for the 4 new video skills so the Style dropdown filters sensibly. |
| `apps/daemon/src/routes/media.ts` (`/skills/author`) | Added a CONTROLLED VOCABULARY block to the authoring prompt for video-direction (camera/lighting/mood MUST be picked verbatim from the canonical lists; other fields stay fresh) + a `status: "draft"` rule. |

## Key Decisions
1. **Map skills to the canonical vocabulary** (the studio's design) rather than widening the
   global option lists (which the render pipeline also depends on).
2. **Constrain authoring at the prompt** so future AI skills are born correct — the daemon's
   vocab block must stay in sync with `options.ts`.
3. Image-direction skills are unaffected (the image studio uses the skill itself as the Style;
   no per-skill camera/lighting/mood dropdowns).

## Verification
- [x] Daemon + web `npx tsc --noEmit` → 0 errors. Daemon rebuilt.
- [x] Daemon reload → the 4 fixed skills expose canonical `cameraPresets`/`lightingPresets`/`moodTones`.
- [x] End-to-end author test (then deleted): new video skill `horror-thriller-flicker` →
  camera `[Handheld, Dolly, Zoom In]`, lighting `[Moody, Dramatic, Silhouette]`, mood
  `[Dark, Mysterious, Dramatic]` — **all canonical** — and `status: draft`.

## Status
✅ Completed (not committed — awaiting owner)
