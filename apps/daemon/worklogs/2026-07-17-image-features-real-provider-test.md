# Image Features — Real Provider (xah.io / DashScope) End-to-End Test — Worklog

## Date
2026-07-17

## Overview
Wired a real OpenAI-compatible image provider (xah.io, backed by Alibaba DashScope,
model `phuocanh421994/Wan2.7_Image`) into the daemon and ran every image action
end-to-end **through the daemon** (not raw curl) with stubs and simulation disabled, to
prove the product generates real images. Text-to-image works at full 2048-class
resolution across all aspects; image edit/inpaint is unsupported by this model (the
provider returns 404 for `/images/edits`) and now fails loudly instead of silently
stubbing.

## Image surface of the daemon (Step 1 findings)
- **Single generate endpoint** handles all image actions:
  `POST /api/media/projects/:id/media/generate` with `surface:'image'`.
  Params select the action: `prompt` (t2i), `image`/`images` (i2i edit), model caps
  drive inpaint. There is **no separate edit/inpaint/upscale/thumbnail endpoint** — it
  is one dispatch surface. Poll via `GET /api/media/tasks/:id` / `POST .../wait`.
- **Provider dispatch** (`src/media/index.ts` `RENDER_REGISTRY`): image renderers are
  `qwencloud:image:*`, `ckey:image:*`, `cloudflare:image:*`, and
  `openai:generic:image:*`. `resolveRenderer()` selects the generic OpenAI renderer when
  the request carries `protocol:'openai'`.
- **Which adapter is OpenAI `/v1/images/generations`-shaped?** `openai-generic.ts` (pure
  OpenAI, `data[].url`) and `ckey.ts` (OpenAI shape too). `qwencloud.ts` uses DashScope
  **native** endpoints (`/services/aigc/...`), not the OpenAI route. `cloudflare.ts` uses
  a bespoke Worker shape. → **`openai-generic` is the correct slot for xah.io.**
- **"Multi-panel image"**: the daemon has no distinct multi-panel image generator — the
  `storyboard_image` mode composes one grid prompt in the backend and calls plain t2i.
  `ctx.multiPanelImage` is an **input** reference for R2V video, not image generation.

## Provider contract learned (direct probes, before coding)
- `POST /v1/images/generations`: **t2i only**. Accepts both flat OpenAI `size:"1024x1024"`
  and DashScope `parameters:{size:"2048*2048", n, watermark, thinking_mode}`. Non-square
  star sizes accepted (2560*1440, 1440*2560). Always returns `data[].url` (a ~24h OSS
  link); `response_format:"b64_json"` is ignored (still returns url).
- `POST /v1/images/edits`: **HTTP 404** — "Model không hỗ trợ route images/edits" — the
  `Wan2.7_Image` model has no edit/inpaint route.

## Files Changed
| File | Change |
|------|--------|
| `apps/daemon/src/media/providers/openai-generic.ts` | Image adapter: map `ctx.aspect` → pixel size (1:1→2048², 16:9→2560×1440, 9:16→1440×2560, 4:3/3:4 variants); send DashScope-style `parameters` object (star size, `watermark`, `thinking_mode`) when `OPENAI_IMAGE_DASHSCOPE_PARAMS=1`, else keep the flat OpenAI body. Optional `OPENAI_IMAGE_SIZE` fixed-size override. Previously hardcoded `1024x1024`. |
| `apps/daemon/src/media/config.ts` | Added `openai: ['OPENAI_API_KEY']` to `ENV_KEYS` so the daemon self-resolves the provider key from env (base URL already handled by `readEnvBaseUrl('openai')` → `OPENAI_BASE_URL`). |
| `apps/daemon/.env` (gitignored) | Added `OPENAI_API_KEY` / `OPENAI_BASE_URL=https://api.xah.io/v1` / `OPENAI_IMAGE_DASHSCOPE_PARAMS=1`; set `MEDIA_ALLOW_STUBS=0` and `SIMULATION_MODE=0`. Key lives only here (untracked). |

## Test results (through the daemon, host instance :7466, stubs OFF, simulation OFF)
Dispatch: `model:'phuocanh421994/Wan2.7_Image'`, `provider_id:'openai'`, `protocol:'openai'`.

| Image action | Result | HTTP/latency | Output |
|---|---|---|---|
| text-to-image 1:1 | ✅ REAL | done, 31.7s | PNG **2048×2048**, 8.95 MB |
| text-to-image 16:9 | ✅ REAL | done, 22.6s | PNG **2560×1440**, 6.48 MB |
| text-to-image 9:16 | ✅ REAL | done, 27.1s | PNG **1440×2560**, 7.66 MB |
| image edit / i2i (`image` ref) | ❌ unsupported by model | failed, 6.0s | provider 404 `images/edits`; task fails cleanly, **no stub fallback** |
| inpaint | ❌ unsupported by model | — | same `/images/edits` route → 404 |

`providerNote` on successes = `openai-generic/phuocanh421994/Wan2.7_Image · N bytes`,
`stub=false`, `providerId=openai`. Saved bytes re-fetched via
`/api/projects/:id/raw/:file` and confirmed valid PNG (sig `89504e47`) — real images, not
stub placeholders.

## Key Decisions
1. **Used `openai-generic` (protocol `openai`), not `ckey`** — `ckey` is the live
   Vietnamese TTS/LLM provider; repointing its base URL/key would break TTS. `openai-generic`
   is the free generic OpenAI-compatible slot.
2. **DashScope `parameters` passthrough is env-gated** (`OPENAI_IMAGE_DASHSCOPE_PARAMS`) so a
   vanilla OpenAI endpoint still receives a clean flat body — xah.io needs the nested object
   for `watermark`/`thinking_mode`/star-size; real OpenAI would 400 on it.
3. **Daemon resolves the key from env** (added `ENV_KEYS.openai`) so test/prod calls carry no
   secret in the request body. Laravel may still inject inline `credentials` — both paths work.
4. **Stubs off = loud failures** — the edit 404 surfaced as a failed task, proving there is no
   silent fake fallback masking provider errors.

## Verification
- [x] TypeScript: `npx tsc --noEmit` → **0 errors**.
- [x] Real E2E: 3 t2i aspects produced real multi-MB PNGs at correct dimensions through the
      daemon; edit failed loudly (provider 404, no stub).
- [x] Container safety: daemon container's `node_modules` is an anonymous volume (isolated);
      host `npm rebuild better-sqlite3` (needed to run on host Node 22) does not affect it.

## Handoff Notes
- **@backend needs to know**: to route image jobs to this provider, call the daemon generate
  endpoint with `model:'phuocanh421994/Wan2.7_Image'`, `provider_id:'openai'`,
  `protocol:'openai'`. The daemon reads the key from its own `.env` (`OPENAI_API_KEY`), or you
  may inject `credentials:{apiKey,baseUrl}` inline. **This model is text-to-image ONLY** — do
  not route edit/inpaint/i2i to it (keep those on qwencloud `qwen-image-edit*` / cloudflare).
  The container loads `apps/daemon/.env` as env_file, so it picks up this config on recreation.
- **Production TODO for the image path**:
  1. **Re-host the OSS url** — the daemon already downloads the image bytes and saves them
     locally (verified), so the ~24h OSS link is not exposed; ensure the normal R2/S3 upload
     path runs on these bytes.
  2. **Aspect sizes for 4:3 / 3:4** (2048×1536 / 1536×2048) were not probed against the model —
     verify before relying on them; 1:1 / 16:9 / 9:16 are confirmed.
  3. `watermark:false` + `thinking_mode:true` are sent; expose per-request overrides if the
     product needs them.
  4. Consider registering this as a first-class provider/model in `providers.ts` (currently a
     dynamic model via `provider_id`) if it should appear in `/api/media/models` and the UI.

## Status
✅ Completed — text-to-image proven real end-to-end through the daemon; edit/inpaint
correctly identified as unsupported by this specific model (adapter fails loudly, no stub).
