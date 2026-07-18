# Skill-Author AUTO-VERIFY — Worklog

## Date
2026-07-18

## Overview
Closed the manual "does this authored skill actually produce the intended style?" loop
inside the daemon's `POST /api/media/skills/author`. After the LLM authors a skill, the
daemon now (fail-open) renders ONE sample image with the new skill's own `prompt_template`
and asks the moderation vision model whether the image matches the skill's declared style,
returning the verdict alongside the draft. Also improved the structural example the AI
inherits from: `featured` skill (or a backend-supplied `exampleId`) instead of the first
skill alphabetically.

## Files Changed
| File | Change |
|------|--------|
| `apps/daemon/src/routes/media.ts` | Added `verifySkillStyle()`, `isSkillAutoVerifyEnabled()`, `fillSkillTemplate()`, `withTimeout()`; wired auto-verify into `/skills/author` (adds optional `sample` field); changed example-skill selection to `exampleId → featured → samples[0]`; imported `type ImageModerationConfig`. |
| `apps/daemon/src/routes/media.test.ts` | +12 tests: `isSkillAutoVerifyEnabled` (2), `verifySkillStyle` unit (7, dep-injected), `POST /skills/author` integration (3, mocked LLM+image+vision). |

## Contract change (additive, non-breaking)
`POST /api/media/skills/author` response is now:
```jsonc
{
  "skill": { ...unchanged... },              // SAME as before — backend contract intact
  "sample": {                                 // NEW, OPTIONAL (present only when auto-verify runs)
    "imageUrl": "/api/projects/__skill_verify__/raw/<name>.png",  // daemon-relative; serve via existing /raw route
    "model": "qwen-image-max",                // image model used for the sample
    "styleMatch": { "match": true, "score": 0.95, "notes": "..." }  // vision verdict
    // On any failure/timeout instead: "degraded": true, "error": "...", (imageUrl may still be present)
    // In simulation mode: "simulated": true, styleMatch stubbed
  }
}
```
`sample` is omitted entirely when auto-verify is disabled. Backend `SkillAuthoringService`
keeps reading `skill` exactly as before.

## Key Decisions
1. **Fail-open everywhere** — mirrors `handleModerateImage`. Image-gen error, stub fallback,
   vision error/timeout/unparseable → `sample.degraded=true` but the skill draft is ALWAYS
   returned. Verify must never block skill creation.
2. **Example-skill priority `exampleId → featured → samples[0]`** — an explicit admin choice
   (backend `exampleId`) wins; otherwise the curated `featured:true` skill; else the previous
   alphabetical fallback. Goal: authored skill inherits the SHAPE of a quality skill.
3. **Reused the moderation vision config** (`resolveImageModerationConfig`, `claude-haiku-4.5`
   on xah.io) for the style-match call — no new provider wiring. Sample image is passed as a
   `data:` URI read off disk, so no public URL is needed.
4. **60s cap** on the verify step (`withTimeout`, never rejects → degraded on timeout). Image
   gen keeps running in the background but is ignored past the deadline.
5. **Config**: `SKILL_AUTHOR_AUTOVERIFY_ENABLED` (1/true/on | 0/false/off; default ON when
   `QWENCLOUD_API_KEY` or `OPENAI_API_KEY` present). Optional `SKILL_AUTHOR_VERIFY_MODEL`
   overrides the sample image model (default = registry default image model).
6. **Dependency injection** in `verifySkillStyle(skill, ctx, deps?)` so tests inject fake
   `generate`/`fetchFn`/`visionCfg` without `vi.mock`; the route calls it with no deps (real).

## Verification
- [x] TypeScript: `npx tsc --noEmit` → 0 errors
- [x] Tests: full daemon suite `vitest run` → **291 passed / 4 skipped / 0 failed** (was 279
      passed baseline; +12 new, none removed). `media.test.ts`: 22 passed.
- [x] Real end-to-end (live container, real QWENCLOUD + xah.io keys):
  - Authored `neon-cyberpunk-rain` / "Neon Cyberpunk Rain" (real LLM, status draft).
  - Sample rendered via `qwen-image-max` (real image at `/api/projects/__skill_verify__/raw/...png`).
  - Real vision verdict: `{ match: true, score: 0.95, notes: "...neon signs, wet reflective
    asphalt, synthwave aesthetic... minor deduction: fox subject slightly incongruous..." }`.
  - Also confirmed fail-open: when the sample model was an ill-suited one, `sample.degraded=true`
    with the provider error and the skill draft still returned.

## Handoff Notes
- **@backend needs to know**:
  - `POST /api/media/skills/author` now MAY return an extra `sample` object (shape above).
    `SkillAuthoringService` should read + persist/display it for the admin (sample image +
    match/score/notes) but must treat it as OPTIONAL — it is absent when verify is disabled
    and `degraded` when it couldn't run. `skill` is unchanged.
  - `sample.imageUrl` is daemon-relative (`/api/projects/__skill_verify__/raw/<file>`); build
    the full URL against the daemon base / proxy the same way as other daemon media.
  - Backend may pass `exampleId` (string, an existing skill id in the category) to steer which
    skill the AI copies structure from. Optional.
  - Env knobs live in the daemon: `SKILL_AUTHOR_AUTOVERIFY_ENABLED`, `SKILL_AUTHOR_VERIFY_MODEL`.
    The registry-default image model is OpenAI/ckey `gpt-image-2`; on this deployment that key
    is invalid, so to use real image gen set `SKILL_AUTHOR_VERIFY_MODEL` to a qwencloud model
    (e.g. `qwen-image-max`) — this is a deployment/config decision, not a code change.
- **@web needs to know**: eventual admin UI for skill authoring should surface `sample.imageUrl`
  + verdict (match/score/notes) so a human can accept/reject the draft at a glance.

## Status
✅ Completed
