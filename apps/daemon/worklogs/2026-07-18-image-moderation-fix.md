# Image Moderation Fix — Default Vision Model + JSON Enforcement + Fallback — Worklog

## Date
2026-07-18

## Overview
Fixed image moderation (`POST /api/media/moderate-image`) which was a **silent no-op** — NSFW
images could never be blocked. Root cause: the default vision model `claude-haiku-4.5` on the
xah.io endpoint is proxied to a coding assistant ("Kiro") that refuses image analysis with prose
("I appreciate you reaching out…"). That prose failed `extractJsonFromLlm` → fail-open
`{safe:true, degraded:true}` on every image. Switched the default to a genuinely vision-capable
model (`openai/gpt-5.6-luna`), added `response_format: json_object`, a hardened anti-refusal
prompt, and a multi-model fallback chain that only fails open (loudly) after every model fails.

## Root Cause (verified via live probe, 2026-07-18)
Live tests against `https://api.xah.io/v1` with the daemon's real key:
- `claude-haiku-4.5` — returns prose refusal ("I'm Kiro, an AI development environment… I'm not
  set up to analyze images") on BOTH remote-URL and data-URI input. Never analyzes the image.
  Sometimes returns blind `{"safe":true,"reason":"No image provided"}` — i.e. safe verdict WITHOUT
  seeing the image. Either way → moderation no-op. **Disqualified.**
- `openai/gpt-5.6-luna` — **genuinely sees the image** (correctly described a test scene: "Cầu gỗ
  bên hồ trong rừng, phía xa có núi"), returns valid `{safe,reason}` JSON on both remote-URL and
  data-URI. Correctly emits `safe:false` when its criteria are met (verified with an inverted
  benign rule — no NSFW generated). **Chosen as default primary + fallback.**
- `gpt-5.6-luna` (no `openai/` prefix) and `gpt-5.6-terra` — 404 "Model chưa được bật cho thuê"
  (not enabled on this account). Not usable.

## Files Changed
| File | Change |
|------|--------|
| `apps/daemon/src/media/providers.ts` | `resolveImageModerationConfig()`: default model `claude-haiku-4.5` → `openai/gpt-5.6-luna`; added `fallbackModels` to `ImageModerationConfig` + new env `IMAGE_MODERATION_FALLBACK_MODELS` (comma-sep, de-duped against primary). Documented why haiku is excluded. |
| `apps/daemon/src/routes/media.ts` | Rewrote `handleModerateImage`: extracted `moderateImageOnce()` that tries primary + fallback models; added `response_format:{type:'json_object'}`; hardened `IMAGE_MODERATION_INSTRUCTION` (bare JSON, no prose/markdown/refusal, assert vision capability); degrade only after ALL models fail; on degrade log at **error** level with `modelsTried` + sample so backend can route to manual review. |
| `apps/daemon/src/media/providers.test.ts` | Updated default-model assertion (now gpt-5.6-luna, explicitly `not` haiku); added fallback-chain parse/de-dupe test. |
| `apps/daemon/src/routes/media.test.ts` | Updated `visionCfg` fixture + `beforeEach` model; added tests: response_format+image part is sent, fallback used when primary returns prose (real verdict, not degraded), degraded only after ALL models return prose. |

## Key Decisions
1. **Default = `openai/gpt-5.6-luna`** — only live-verified model that actually performs vision +
   content classification on this endpoint and returns stable JSON.
2. **Fallback chain, not single model** — a prose/refusal from model N moves to N+1 before failing
   open. Prevents a single flaky/refusing model from silently disabling moderation.
3. **`response_format: json_object`** — sent unconditionally; harmless if the provider ignores it,
   and `extractJsonFromLlm` still tolerates stray prose.
4. **Degrade logs at `error` (was `warn`)** with `modelsTried` — a degraded verdict is a security
   signal (untrusted safe), not routine noise.
5. **Still fail-open** — a real provider outage must not block publishing; the fix is to make
   "untrusted safe" visible (`degraded:true` + error log), not to hard-block.

## Verification
- [x] TypeScript: `npx tsc --noEmit` → 0 errors
- [x] Tests: `npx vitest run` → **295 passed / 4 skipped** (baseline 291 → +4 new tests, none regressed)
- [x] Live probe: `claude-haiku-4.5` refuses (prose "Kiro"); `openai/gpt-5.6-luna` sees images + returns JSON, both safe & safe:false paths
- [x] E2E through real `handleModerateImage` with real key on a real image →
  `{"safe":true,"reason":"Phong cảnh thiên nhiên… không chứa nội dung bị cấm.","model":"openai/gpt-5.6-luna"}` (real verdict, NOT degraded)

## Handoff Notes
- **@backend needs to know**:
  - Moderation now returns a **trustworthy** verdict for the normal case. When
    `POST /api/media/moderate-image` returns `degraded: true`, the verdict is UNTRUSTED (provider
    outage / all vision models refused). Recommend routing such assets to **"chờ duyệt" (manual
    review)** rather than trusting `safe:true`. The daemon logs these at ERROR level
    (`Image moderation DEGRADED — verdict untrusted, route to manual review`).
  - No API contract change — response shape is unchanged (`{safe, reason?, model?, degraded?}`).
    The `model` field now reports whichever model actually produced the verdict (primary or
    fallback).
- **@ops / env**: prod daemon `.env` should set `IMAGE_MODERATION_MODEL=openai/gpt-5.6-luna` (now
  also the code default). Optional `IMAGE_MODERATION_FALLBACK_MODELS` to extend the chain if more
  vision models get enabled on the xah.io account. **Do NOT use `claude-haiku-4.5`** — it does not
  do vision on this endpoint.

## Status
✅ Completed
