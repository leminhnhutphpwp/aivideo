# Image-Direction Style Skills — Academic Review & Quality Pass — Worklog

## Date
2026-07-18

## Overview
Reviewed all 27 image-direction style skills in `apps/skills/image-direction/*/SKILL.md` for schema consistency, academic accuracy, prompt-template correctness, and locale quality. Fixed 8 skills, added 1 new skill (`line-art-sketch`, draft) to fill a clear gap. All 28 SKILL.md files now parse as valid YAML with the full standard schema and no non-standard prompt placeholders.

## Files Changed
| File | Change |
|------|--------|
| `image-direction/none/SKILL.md` | Added missing `default_negative` (minimal generic quality guard) — was the only schema-incomplete skill |
| `image-direction/hyper-surrealism/SKILL.md` | Removed non-standard `{details}` placeholder from `prompt_template` (would leak literally in fallback path); dropped awkward "unnatural physics violation" token from `default_negative` |
| `image-direction/vaporwave-synthwave/SKILL.md` | Fixed entirely un-accented Vietnamese in `description`, `example_prompt_vi`, body; fixed "thiên thần (angel) Apollo" → "thần Apollo" + Greek/Roman consistency; removed non-standard `{colors}` placeholder → static "neon pink and cyan" |
| `image-direction/3d-render/SKILL.md` | Fixed missing Vietnamese diacritics in `description` + body |
| `image-direction/pixel-art/SKILL.md` | Fixed missing Vietnamese diacritics in `description` + body |
| `image-direction/typography-text/SKILL.md` | Fixed factual error: "double 'f' ligature in 'yourself'" — the word has no double f; replaced with an accurate 'y' descender swash + kerning reference (EN + VI) |
| `image-direction/retro-futurism-atomic-age/SKILL.md` | Fixed era-inconsistent keyword `1920s-1950s sci-fi` → `1950s-60s sci-fi` (Atomic Age; matches the skill's stated 1950-60 framing) |
| `image-direction/realistic/SKILL.md` | Clarified positioning vs `photorealism` and `natural-photo` in description + body to reduce the 3-way overlap (no option deleted) |
| `image-direction/line-art-sketch/SKILL.md` | NEW draft skill — pen-and-ink / graphite line art & sketch. Genuine gap (painterly styles existed, pure line/hatching did not) |

## Key Decisions
1. Non-standard placeholders (`{details}`, `{colors}`) removed — the daemon fallback in `image-contract.ts` only substitutes `{subject}/{style}/{mood}/{negative}`, so any other `{...}` would appear verbatim in generated prompts. Real bug, now fixed.
2. `none` gets a truly minimal/generic `default_negative` only (quality guards, no style bias) — matches "no style applied" intent; note the pipeline skips `none` for direction/skillContext anyway, so this is schema-completeness + safety, not behavior change.
3. Added only ONE new skill (line-art-sketch) despite other candidate gaps (pop-art, flat-vector, double-exposure) — those risk overlap with existing skills; line art was the clearest zero-overlap gap. Marked `status: draft` for admin approval.
4. Kept the realistic/photorealism/natural-photo trio as three separate UI options (all valid) but sharpened their descriptions so they read as distinct: Photorealism = macro/hyperreal render-grade; Realistic = documentary/editorial; Natural Photo = candid, un-AI for ads/social.
5. Academic content across the set was already strong — art-history/technique terms (impasto, chiaroscuro, cross-hatching, googie, raygun gothic, Aardman, Kodak Portra/Cinestill, cold-pressed paper, orthographic isometric, outrun) checked and found accurate; no fabricated artist/movement names.

## Verification
- [x] YAML/schema: node + js-yaml audit — all 28 files parse, 0 missing required fields, 0 non-standard placeholders
- [x] Daemon reload: `POST /api/media/skills/reload` → `{"ok":true}`; `GET /api/media/skills?include_draft=1` returns 28 image_directions incl. `line-art-sketch`
- [x] Container mount `/skills` reflects host edits (docker cp confirmed new file present); edited `none.default_negative` live via API
- [x] Locale preserved: label/description VI, label_en EN, bilingual examples intact

## Handoff Notes
- **@daemon needs to know**: new draft skill `line-art-sketch` and edits are already reloaded in `backend-daemon-1`. No restart required (reload endpoint used). If daemon restarts, skills reload from `/skills` mount automatically.
- **@backend / admin**: 4 skills are `status: draft` and need admin approval to surface for end users if desired: `line-art-sketch` (new), plus pre-existing drafts unchanged (`hyper-surrealism`, `analog-film-vintage`, `isometric-miniature`, `retro-futurism-atomic-age`, `tilt-shift-miniature`, `vaporwave-synthwave`, `y2k-chrome`, `watercolor-illustration`).

## Status
✅ Completed
