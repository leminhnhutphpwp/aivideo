# Video-Direction Skills — Academic Review & Vocab Compliance — Worklog

## Date
2026-07-18

## Overview
Reviewed all 17 `apps/skills/video-direction/*/SKILL.md` style skills for academic
(cinematography) accuracy, schema completeness, controlled-vocabulary compliance, and
trend currency. Fixed off-vocab presets that would silently break the studio dropdowns,
completed the `none` schema, upgraded weak placeholder references, and clarified the
review vs UGC-testimonial overlap. Trend currency validated via web search (2026).

## Context / key finding
`apps/daemon/src/routes/media.ts:304-309` requires `camera_presets`, `lighting_presets`,
AND `mood_tones` to be chosen **verbatim** from `STUDIO_VOCAB` (`studio-vocab.json`) —
otherwise "the dropdowns filter to empty". The loader (`skills/loader.ts`) does NOT
validate, so off-vocab values load fine but break the UI mapping. Two skills carried
off-vocab presets; several carried off-vocab `mood_tones`.

Studio vocab (source of truth):
- camera: Fixed, Pan Left, Pan Right, Zoom In, Zoom Out, Dolly, Tracking, Crane Up, Crane Down, Handheld
- lighting: Natural, Golden Hour, Studio Soft, Dramatic, Neon, Moody, Backlit, Silhouette, Rim Light
- mood: Dramatic, Happy, Mysterious, Dark, Romantic, Peaceful, Energetic, Melancholic

## Files Changed
| File | Change |
|------|--------|
| `video-direction/vertical-short/SKILL.md` | camera `Whip Pan`→`Pan Right`; lighting `Ring Light`/`LED RGB`→`Studio Soft`/`Neon`(+`Dramatic`); mood dropped `Funny`/`Viral`→`[Energetic,Happy,Dramatic]`; body bullets updated to match (techniques kept in prose) |
| `video-direction/ugc-testimonial/SKILL.md` | mood off-vocab `Friendly`/`Warm`/`Credible`→`[Happy,Peaceful,Energetic]`; "Hot trend 2025-2026" → 2026-current phrasing (phone-shot/authentic still dominant) |
| `video-direction/none/SKILL.md` | added missing `example_prompt_vi: ""` (schema completeness) |
| `video-direction/explainer/SKILL.md` | mood `Romantic`→`Energetic` (semantic fit; both in-vocab) |
| `video-direction/social-ad/SKILL.md` | mood `Romantic`→`Dramatic` (semantic fit; both in-vocab) |
| `video-direction/review/SKILL.md` | references: generic placeholders → real (MKBHD, Unbox Therapy, Vật Vờ Studio, LTT); added "khác gì Testimonial UGC" distinction note (product-focused vs person-focused) |
| `video-direction/travel/SKILL.md` | references → real (Beautiful Destinations, Sam Kolder, Nas Daily, Khoai Lang Thang) |
| `video-direction/event/SKILL.md` | references → real (Stillmotion, Ray Roman, Joe Simon, SDE style) |
| `video-direction/food/SKILL.md` | references → concrete (Chef's Table, Bon Appétit, Ẩm Thực Mẹ Làm, foody.vn) |

## Key Decisions
1. Enforced vocab on all three preset fields (not just camera/lighting) — confirmed by
   media.ts that `mood_tones` is equally dropdown-bound. Off-vocab = broken UI.
2. `Whip Pan`→`Pan Right`, `Ring Light`→`Studio Soft`, `LED RGB`→`Neon`: closest in-vocab
   equivalents; the original technique names are retained in the descriptive prose so no
   creative intent is lost.
3. No new skill added. The 12 remaining genres already cover the mainstream; the task's
   candidate gaps (unboxing→review, tutorial→explainer, before-after→ugc/review) are
   covered. `real-estate/property-tour` is the only arguably-distinct uncovered genre —
   left as a recommendation, not added, to avoid gold-plating.
4. Upgraded generic non-references (review/travel/event/food) to real named references for
   consistency with strong skills (cinematic, brand-cinematic-doc). Kept platform-aesthetic
   references (social-ad/vertical-short) as-is — valid as aesthetic pointers.

## Verification
- [x] YAML: all 17 parse valid; all schema fields present (incl. `none.example_prompt_vi`).
- [x] Vocab compliance: automated check across all 17 → 0 off-vocab values in camera/lighting/mood.
- [x] Daemon reload: `POST /api/media/skills/reload` → `{"ok":true}`; `GET /api/media/skills?include_draft=1` returns 17 video_directions with fixes reflected live.
- [x] Trend currency validated via WebSearch (2026): quiet luxury, GRWM/"With Me", ASMR/silent, UGC/phone-shot authenticity all confirmed current.
- Note: reload must target `127.0.0.1` inside container, not `localhost` (node binds IPv4 0.0.0.0; `localhost`→IPv6 refuses).

## Handoff Notes
- **@web needs to know**: `ugc-testimonial`, `vertical-short`, `explainer`, `social-ad`
  mood/preset sets changed. These are all in-vocab so `options.ts` dropdowns map cleanly;
  no `vocab-sync.test.ts` impact (studio-vocab.json unchanged).
- **@daemon needs to know**: only skill markdown changed; no code/loader changes. `none`
  now emits `example_prompt_vi: ""`.

## Status
✅ Completed
