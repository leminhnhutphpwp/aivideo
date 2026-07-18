# SSRF allowlist relax · image moderation endpoint · qwencloud edit check — Worklog

## Date
2026-07-18

## Overview
Three daemon-scoped items: (A) relaxed the LLM baseUrl SSRF guard so admin-configured
Custom-API LLM hosts on arbitrary public hosts are allowed (block only private/loopback/
link-local/metadata targets); (B) added `POST /api/media/moderate-image`, a vision-model
NSFW/violence/gore gate for the community feed (fail-open); (C) verified qwencloud image
edit (i2i) wiring — report only, no code change.

## Files Changed
| File | Change |
|------|--------|
| `apps/daemon/src/media/providers.ts` | (A) Rewrote `isAllowedLlmBaseUrl` — dropped the host name allowlist; now allows any public http(s) host, rejects only private/loopback/link-local/metadata via `isPrivateHostname`. Removed `KNOWN_LLM_HOSTS` set + populate loop + `LLM_ALLOWED_HOSTS` env. (B) Added `resolveImageModerationConfig()` + `ImageModerationConfig` type (env-driven vision provider config). |
| `apps/daemon/src/routes/media.ts` | (B) Added module-scope `handleModerateImage(req,res)` + route `POST /moderate-image`. Imports `resolveImageModerationConfig`. |
| `apps/daemon/src/media/providers.test.ts` | (A) Flipped the "unknown public host" case to now PASS; removed obsolete `LLM_ALLOWED_HOSTS` test; added a `100.64/10` CGNAT reject. (B) +4 tests for `resolveImageModerationConfig`. |
| `apps/daemon/src/routes/media.test.ts` | New — 10 tests for `handleModerateImage` (400 validation, simulation, unconfigured/disabled fail-open, safe/unsafe classification, fence tolerance, upstream error, unparseable, fetch throw). |

## Key Decisions
1. **(A) Block by IP class, not host name** — a name allowlist blocked legitimate
   Custom-API LLM hosts the admin configures. The real SSRF surface is internal
   *targets*, so we keep `isPrivateHostname` (localhost/127./10./172.16-31./192.168./
   169.254./100.64-127./::1/fe80::/fc00::) and permit every public host.
2. **(B) Vision provider = xah.io, model `claude-haiku-4.5`** — tested live on the
   provided key (see Verification). Both `claude-haiku-4.5` and `openai/gpt-5.6-luna`
   genuinely see the image and classify correctly; picked haiku (cheapest reliable
   Claude vision). Configurable via `IMAGE_MODERATION_MODEL`.
3. **(B) Fail-OPEN** — missing config / disabled / upstream error / unparseable reply
   → `{safe:true, degraded:true}`. Never block a user on a moderation glitch; backend
   applies its own final policy on top.
4. **(B) No hardcoded secret** — key read from `IMAGE_MODERATION_API_KEY` (falls back
   to `OPENAI_API_KEY`, which already points at xah.io). Default-on only when a key
   exists; force off with `IMAGE_MODERATION_ENABLED=0`.
5. **(B) Handler hoisted to module scope** so it is unit-testable with a mocked
   `global.fetch` (repo has no supertest; existing tests drive handlers directly).

## Verification
- [x] TypeScript: `npx tsc --noEmit` → exit 0
- [x] Tests: `npm test` → **168 passed / 4 skipped** (baseline 155 not reduced; +13 net new)
- [x] (A) private/loopback/link-local/metadata/CGNAT rejected; arbitrary public hosts allowed; non-http(s) + malformed rejected.
- [x] (B) LIVE test on xah.io key: generated a real landscape via `phuocanh421994/Wan2.7_Image`
      → DashScope OSS URL → moderated. `claude-haiku-4.5` and `openai/gpt-5.6-luna` both
      returned `{"safe":true,"reason":"phong cảnh núi/rừng/hồ…"}`. `gpt-5.6-terra` IGNORED
      the image (not vision); `gemini-*-flash` timed out / 400; `26479061/claude-haiku-4.5`
      is a "Kiro" system-prompted variant that refuses — avoid.

## Handoff Notes
- **@backend needs to know** — new daemon endpoint for community publish-time image moderation:
  - `POST /api/media/moderate-image`
  - Request body: `{ "imageUrl": "<http(s) URL or data:image/... URI>" }` (alias `image_url` accepted)
  - Response 200: `{ "safe": boolean, "reason"?: string, "model"?: string, "degraded"?: true, "simulated"?: true }`
  - Response 400: `{ "error": "..." }` when imageUrl missing/invalid
  - **Fail-open**: `degraded:true` means moderation could not run (disabled/unconfigured/upstream error/bad reply) and returned `safe:true` by default — backend should decide whether to trust it or hold for manual review.
  - Env to set on the daemon: `IMAGE_MODERATION_API_KEY=<xah.io key — see apps/daemon/.env, do NOT commit>` (falls back to `OPENAI_API_KEY`), optional `IMAGE_MODERATION_MODEL` (default `claude-haiku-4.5`; alt `openai/gpt-5.6-luna`), `IMAGE_MODERATION_BASE_URL` (default `https://api.xah.io/v1`), `IMAGE_MODERATION_ENABLED=0` to disable.
- **@backend (SSRF change)** — the daemon no longer restricts `llm.baseUrl` to a host allowlist; Custom-API LLM providers on any public host now pass. Private/internal targets are still rejected (SSRF still closed). The `LLM_ALLOWED_HOSTS` env is removed (no longer needed).
- **Qwencloud edit (Việc C — report only)**: image edit (i2i) IS wired — see below; masked inpaint is NOT.

## Item C — qwencloud image edit (i2i / inpaint) status
`renderQwenCloudImage` (`src/media/providers/qwencloud.ts:431`) handles BOTH t2i and i2i:
- Input images arrive via `ctx.imageRefs` / `ctx.imageRef`, populated from `image`/`images`
  in `generateMedia` (`src/media/index.ts:126-135`), dispatched by `qwencloud:image:*`
  (`src/media/index.ts:30`) whenever an input image is present.
- `qwen-image-*` / `z-image-*` (`:442`) → multimodal-generation endpoint (`:483`) with a
  messages `content` array of `{image:url}` parts + text instruction → **i2i edit wired**.
- `wan2.x` image (`:502`) → image-generation/generation with messages `content` when input
  images present (`:517-522`) → **i2i edit wired**.
- **Gap — masked inpaint is NOT wired**: models `qwen-image-2.0`, `qwen-image-2.0-pro`,
  `qwen-image-edit*`, `wan2.5-i2i-preview`, `qwen-image-edit` declare the `inpaint` cap
  (`src/media/providers.ts:55-60`) but the renderer sends NO mask. There is no `mask` /
  `maskRef` field on `MediaContext`, so true region-masked inpaint cannot be requested —
  only whole-image instruction edits work today. To add it: thread a mask input through
  `generateMedia` → `ctx` → the qwencloud edit body (DashScope image-edit `mask_image` /
  masked-edit function). Left for backend/owner to decide (verify exact per-model endpoint
  + mask param against DashScope docs with a real DASHSCOPE key before implementing).

## Status
✅ Completed (A + B implemented & tested; C = verified/reported, no code change)
