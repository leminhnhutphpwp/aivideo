# System Skills — Outdated / Inconsistent Fixes — Worklog

## Date
2026-07-18

## Overview
Fixed outdated and self-contradictory content in the system skills under `apps/skills/`
(the library the daemon loads to guide AI prompt/storyboard generation). Corrected stale
pricing docs, aligned the video-contract provider/model list with the real catalog
(`media_providers.php`), resolved the HappyHorse "removed vs still-in-config" contradiction,
made the storyboard scene-count consistent, and cleaned up 3 dead placeholder categories.
Only the `video-*` system-skill folders were touched (NOT `image-direction/*` or
`video-direction/*` — owned by other agents).

## Files Changed
| File | Change |
|------|--------|
| `apps/skills/video-contract/PRICING-LOGIC.md` | Full rewrite to current reality. Added top banner: source of truth = `PricingCalculator` + DB. Fixed base credits (video 1500/1875/2250/1125; **image 200 flat**), duration curve (5s=1.10, 8s=1.76, 10s=2.20, 15s=3.30), resolution (720p=1.0, 1080p=1.8), noted quality/provider multipliers now come from Plan (not fixed tiers), exchange = `CreditSetting::exchangeRate()` default 1 credit=10 VND. Removed false "HappyHorse REMOVED". Date 2026-06-01 → 2026-07-18. (File is NOT loaded by daemon loader.) |
| `apps/skills/video-contract/SKILL.md` | Replaced the "Provider Adaptation" section. Removed providers absent from `media_providers.php` (Volcengine/Seedance, Grok Imagine, Kling, HyperFrames) and the non-existent `wan2.2-s2v`. Rewrote around the real catalog: qwencloud PRIMARY (Wan2.6/2.7 with dated 2.7 IDs, happyhorse-1.0-*, wan2.1-vace-plus, wan2.2-animate-*, image models), openai `wan2.7-image` (t2i-only), ckey/elevenlabs/cloudflare for audio/aux images. Added "must match media_providers.php" note. |
| `apps/skills/video-storyboard/SKILL.md` | L19 "multiple scenes (3–20)" → "(2–20)" to match L84 "Scenes: 2–20" and reality (backend `scenes` validation `max:20`; web AI-draft requires ≥2 scenes). |
| `apps/skills/video-brand/` | **Deleted** (dead placeholder — see decisions). |
| `apps/skills/video-post-process/` | **Deleted** (dead placeholder). |
| `apps/skills/video-repurpose/` | **Deleted** (dead placeholder). |

## Key Decisions

### Pricing doc (truth sources verified)
- `PricingSystemSeeder.php`: image_generation/image_editing `base_credits=200` (flat);
  text_to_video/image_to_video=1500, reference_to_video/storyboard_video=1875,
  video_editing=1125, character_animation=2250.
- `DurationTier` active only 5/8/10/15s with the multipliers above (3s/30s NOT active).
- `PricingCalculator`: images are `isFlatFee` → duration/resolution/quality/provider
  multipliers skipped. Quality/provider multipliers pulled from the current `Plan`, not
  a static tier table (seeder mucs 4 & 5 = "managed inside Plans").
- Exchange rate is a DB setting (`CreditSetting::exchangeRate()`), `vnd = credits / rate`;
  default 0.1 ⇒ 1 credit = 10 VND. Did NOT hardcode margin tables in the doc.

### HappyHorse contradiction → resolved toward config
`media_providers.php:40-43` still ships `happyhorse-1.0-t2v/-i2v/-r2v/-video-edit`.
Config is truth: both PRICING-LOGIC.md and SKILL.md now state HappyHorse is still available
(higher cost, "cân nhắc kỹ") instead of "removed". No model removed from config.

### 4 dead categories — evaluation & verdict
None of `video-brand`, `video-marketing-psychology`, `video-post-process`, `video-repurpose`
are in `SkillService::DAEMON_CATEGORIES`, have a loader function, or are referenced anywhere in
`apps/daemon/src` or `backend/app` (only `SkillService` mentions categories at all). Admin can
edit them but nothing consumes them. All are git-tracked in the `apps/` repo (recoverable).

- **DELETE `video-brand`** — describes an unbuilt brand-lock/compliance engine (pixel-palette
  matching, compliance reports) and even references the also-dead `video-post-process`.
  Aspirational placeholder for a subsystem that doesn't exist.
- **DELETE `video-post-process`** — describes an unbuilt post-processing pipeline (caption
  burn-in, thumbnail picker, transcoder). Not in current daemon scope; no consumer.
- **DELETE `video-repurpose`** — describes an unbuilt long-form→short-form import pipeline
  (blog/podcast/VOD ingestion, diarization). Far from MVP; no consumer.
- **KEEP `video-marketing-psychology`** — the only one with immediately reusable value: its
  AIDA/PAS frameworks, hook patterns, and color/framing/motion-psychology guidance map
  directly onto the **existing** storyboard scene-sequencing flow. Worth wiring as LLM
  guidance rather than deleting.

#### To wire `video-marketing-psychology` (for SKILLS-C/D agent)
1. `backend/app/Services/SkillService.php` — add to `DAEMON_CATEGORIES`:
   `'video-marketing-psychology' => 'single'`.
2. `apps/daemon/src/skills/loader.ts` — add
   `export function loadVideoMarketingPsychology(baseDir?) { return loadSingleSkill('video-marketing-psychology', baseDir); }`
   and export it from `apps/daemon/src/skills/index.ts`.
3. `apps/daemon/src/routes/media.ts` — call `loadVideoMarketingPsychology()` alongside the
   existing `loadVideoContract()/loadVideoStoryboard()` (~L195-198) and inject its `body`
   into the storyboard/compose LLM prompt.

## Verification
- [x] YAML frontmatter: parsed all `SKILL.md` with js-yaml (loader's parser) → **57 OK / 0 BAD**
  (incl. all edited files; image-direction/video-direction unaffected).
- [x] Daemon reload: `POST /api/media/skills/reload` → `{"ok":true}` (clean re-parse).
- [x] `GET /api/media/skills` returns without error; top keys intact
  (video_directions, image_directions, contract, discovery, compose, storyboard). Dead
  categories never surfaced here (confirming zero consumption).
- [x] Container live-mounts `apps/skills` → `/skills`: edited contract body present
  (`grep happyhorse /skills/video-contract/SKILL.md` = FOUND); deleted dirs gone (only
  `video-marketing-psychology` remains of the four).
- Note: no code changed, so no tsc/php test run needed. Docs/skills-content only.

## Handoff Notes
- **@daemon / SKILLS-C/D**: `video-marketing-psychology` is intentionally KEPT but still
  unwired — see the 3-step wiring list above. The other three dead categories were removed.
- **@backend**: pricing narrative in `PRICING-LOGIC.md` now matches `PricingSystemSeeder` +
  `PricingCalculator`. If pricing changes, update that doc (it explicitly defers to the
  calculator/DB as source of truth).
- **@web**: no UI impact; studio only ever received the first-paragraph `desc` from the
  contract skill, not the full (now-corrected) body.

## Status
✅ Completed
