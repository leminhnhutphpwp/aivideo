# Wan 2.7 Image — First-Class Model Registration + thinking_mode default + aspect probe — Worklog

## Date
2026-07-17

## Overview
Promoted the xah.io/DashScope `Wan2.7_Image` provider (previously a dynamic model reachable
only via `provider_id:openai` + `protocol:openai`) to a **first-class registered model** in the
daemon registry under a new `openai` provider, with clean internal id **`wan2.7-image`** and a
`wireModel` mapping to the real API id. Disabled DashScope `thinking_mode` by default (big
latency win) while keeping it opt-in via env. Probed the two unverified aspects (4:3, 3:4) with
real generations — both pass — so the model is confirmed for all 5 aspects.

## Files Changed
| File | Change |
|------|--------|
| `apps/daemon/src/media/providers.ts` | Added `wireModel?`/`aspects?` to `ProviderModel`; added new `openai` provider (`OpenAI-compatible (xah.io)`, `defaultBaseUrl: https://api.xah.io/v1`, `apiKeyEnv: OPENAI_API_KEY`) with one model `wan2.7-image` (`caps: ['t2i']`, `wireModel: 'phuocanh421994/Wan2.7_Image'`). |
| `apps/daemon/src/media/models.ts` | Added `wireModel?`/`aspects?` to `MediaModel` type so the derivation spreads carry them into `IMAGE_MODELS`/`findMediaModel`. |
| `apps/daemon/src/media/index.ts` | `wireModel = def.wireModel \|\| def.id` (line ~106) so the clean id is sent to the API as the real wire id; added `openai:image:*` and `openai:audio:*` to `RENDER_REGISTRY` so provider `openai` routes to the generic renderer **without** the caller passing `protocol`. |
| `apps/daemon/src/media/providers/openai-generic.ts` | New `thinkingModeEnabled()` (env `OPENAI_IMAGE_THINKING_MODE`, default OFF); `thinking_mode` now sent as `thinkingModeEnabled()` instead of hardcoded `true`. `watermark:false` behaviour unchanged. |

## Key Decisions
1. **New `openai` provider (not folded into qwencloud)** — qwencloud uses DashScope *native*
   endpoints; xah.io is OpenAI `/v1/images/generations`-shaped, so it belongs to the generic
   `openai` renderer. Credentials self-resolve via the existing `ENV_KEYS.openai` +
   `readEnvBaseUrl('openai')` + the provider's new `defaultBaseUrl`.
2. **`wireModel` field, not a model alias** — keeps a clean, stable internal id (`wan2.7-image`)
   that `findMediaModel` matches directly, while sending `phuocanh421994/Wan2.7_Image` on the
   wire. Aliases resolve *before* `findMediaModel`, which would have broken first-class matching.
3. **`openai:image:*` registry entry** so a registered model routes by provider id alone — the
   backend can call with just `model:'wan2.7-image'` (no `provider_id`/`protocol`).
4. **thinking_mode OFF by default** — measured 22–32s with it on vs **8.6–13.3s off** for the
   same model; opt back in with `OPENAI_IMAGE_THINKING_MODE=1`.
5. **t2i only** — the model has no `/images/edits` route (404), so `caps:['t2i']` — no i2i/inpaint.

## Verification (real runs, stubs OFF, simulation OFF)
- [x] TypeScript: `npx tsc --noEmit` → **0 errors**.
- [x] Daemon tests: `vitest run` → **142 passed / 4 skipped**.
- [x] **First-class E2E through `generateMedia()`** with `model:'wan2.7-image'` and NO
      `provider_id`/`protocol`: `providerId=openai`, `intentionalStub=false`,
      `usedStubFallback=false`, providerNote `openai-generic/phuocanh421994/Wan2.7_Image`,
      real **2048×2048** PNG (8.78 MB, sig 89504e47), 13.3s. Proves registration + provider-id
      routing + wireModel mapping + thinking-off all work.
- [x] **Aspect probe (real, via the actual adapter):**
      - 4:3 → OK, PNG **2048×1536**, 5.96 MB, 10.6s
      - 3:4 → OK, PNG **1536×2048**, 4.61 MB, 8.6s
      All 5 aspects (1:1, 16:9, 9:16, 4:3, 3:4) now confirmed → no per-model `aspects` restriction.
- [x] Registry: `findMediaModel('wan2.7-image')` → `{provider:'openai', wireModel:'phuocanh421994/Wan2.7_Image', caps:['t2i']}`; present in `IMAGE_MODELS`/`getImageModels`; `/api/media/models` `surfaces.image` includes `t2i`, `aspects` = all 5.
- [~] `verify-media-models.mjs`: daemon side clean (6 providers, 19 image models). Reports **1
      expected cross-layer drift** — `wan2.7-image` must be added to backend
      `media_providers.php` (see Handoff). This is inherent: any first-class daemon model needs a
      matching backend config entry. Goes green once backend syncs.

## Handoff Notes
- **Internal model code = `wan2.7-image`** (provider `openai`, wire id `phuocanh421994/Wan2.7_Image`).
- **@backend needs to add** to `backend/config/media_providers.php` so `verify-media-models.mjs`
  passes and the model is offered to the UI. Minimal additive entry (confirm label/cost_hint):
  ```php
  'openai' => [
      'label' => 'OpenAI-compatible (xah.io)',
      'default_base_url' => 'https://api.xah.io/v1',
      'api_key_env' => 'OPENAI_API_KEY',
      'models' => [
          'wan2.7-image' => ['capabilities' => ['t2i'], 'cost_hint' => '<confirm>'],
      ],
  ],
  ```
  Then map `wan2.7-image` into `Plan.model_mapping` (PlanSeeder) as needed. Backend can call the
  daemon with just `model:'wan2.7-image'` — no `provider_id`/`protocol` required (still accepted).
- **t2i ONLY** — do not route edit/inpaint/i2i to `wan2.7-image` (no `/images/edits`).

## Status
✅ Completed (daemon) — model registered first-class, thinking_mode default-off, all 5 aspects
confirmed real. ⏳ Backend `media_providers.php` sync pending for verify-green (parent-owned).
