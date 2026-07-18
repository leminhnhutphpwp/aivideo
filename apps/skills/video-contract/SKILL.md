---
id: video-contract
label: Hợp đồng tạo video
label_en: Video Generation Contract
category: contract
---

# Video Generation Contract

## Purpose

Defines how raw user input (prompt + style + mood + camera + lighting) is enriched into a provider-ready prompt. This is the load-bearing layer between user intent and the video model.

## Prompt Enrichment Rules

1. **Original prompt first** — user's raw description is the core content
2. **Quality suffix** — style/mood/camera/lighting keywords are appended at the END as "director's notes" (AI video models weight trailing keywords heavily)
3. **Keyword order** — style first, mood next, camera after, lighting last
4. **Negative constraints** — add `avoid: x, y, z` when input has negative prompt

## Quality Gate (Anti-Slop)

### P0 — Reject (score ≥ 6)
These patterns indicate the prompt cannot produce useful output:
- **Empty prompt** — no words at all
- **Meta-instructions** — "make video", "create video", "generate video"
- **Punctuation only** — no meaningful content
- **Test placeholders** — "test", "test video"

### P1 — Warn (score ≥ 2)
These patterns indicate quality issues:
- **Too short** — < 15 characters lacks visual detail
- **Filler text** — "lorem ipsum", "placeholder"
- **Subjective adjectives** — "beautiful", "amazing", "impressive" — replace with specific visual terms
- **Generic quality tags** — "4k", "8k", "high quality" — models are already optimized for these

### P2 — Suggest (score ≥ 1)
These patterns indicate room for improvement:
- **Short prompt** — < 80 characters; adding detail helps the model
- **Missing visual detail** — no clear subject, setting, or action

## Provider Adaptation

> Providers/models below MUST match `backend/config/media_providers.php` — the source of
> truth. Don't reference providers that aren't in the catalog. **qwencloud is the primary
> (and only) video provider.**

### Qwen Cloud / DashScope (PRIMARY — video + most images)
- **Video models**:
  - Wan2.6 — `wan2.6-t2v`, `wan2.6-i2v`, `wan2.6-r2v` (t2v/i2v/r2v, audio-capable, ~$0.07/s)
  - Wan2.7 — `wan2.7-t2v-2026-04-25`, `wan2.7-i2v-2026-04-25`, `wan2.7-r2v`,
    `wan2.7-videoedit` (audio-capable, ~$0.10/s; note the **dated** t2v/i2v model IDs)
  - HappyHorse — `happyhorse-1.0-t2v` / `-i2v` / `-r2v` / `-video-edit`
    (audio-capable, higher cost ~$0.10+/s — cân nhắc kỹ)
  - `wan2.1-vace-plus` (t2v/i2v), `wan2.2-animate-move` / `wan2.2-animate-mix` (character animation)
- **Image models** (flat-fee): `z-image-turbo` (default t2i), `wan2.6-t2i`,
  `qwen-image-max` / `-plus` / `-2.0` / `-2.0-pro`, `qwen-image-edit` / `-edit-plus` / `-edit-max`,
  `wan2.5-i2i-preview`, `wan2.7-image-pro` (multi-panel default)
- **prompt_extend**: auto-rewrite short prompts for Wan t2v (enabled by default)
- **Negative prompt**: supported — use to exclude unwanted content
- **Image input**: `first_frame`, `last_frame`, reference video (r2v)
- **Resolution**: 720P / 1080P (subject to plan limits & model support)
- **Audio**: Wan2.6/2.7 + HappyHorse expose audio-capable variants

### OpenAI-compatible (xah.io)
- `wan2.7-image` — **text-to-image only** (no `/images/edits` → edit calls are guarded/422)

### Audio & auxiliary image providers
- **CKey** — `tts-1` (TTS), `thanhnhan9023/gpt-image-2` (image)
- **ElevenLabs** — `elevenlabs-v3` (TTS), `elevenlabs-sfx` (SFX)
- **Cloudflare Workers AI** — image gen (`cf-sdxl-lightning`, `cf-flux-2-klein`,
  `cf-phoenix-1.0`, `cf-lucid-origin`, `cf-dreamshaper`, `cf-sd-img2img`)

## ⚠️ MANDATORY: Search Model API Docs Before Implementing

When adding or modifying features for a specific model (Wan2.7, Wan2.6, etc.):

1. **ALWAYS search the official API documentation first** — never assume parameters
2. **Check what parameters the model actually supports** — names, types, required vs optional
3. **Verify valid combinations** — e.g., first_frame + last_frame + driving_audio may not all be valid together
4. **Don't assume — verify with official docs** — model capabilities change between versions

### Example: Wan2.7 I2V (DashScope)
- `first_frame` — starting image (required for I2V)
- `last_frame` — ending image (optional)
- `driving_audio` — lip-sync audio (optional)
- `first_clip` — video continuation from previous clip
- These are NOT interchangeable with Wan2.6 parameters

### Where to find docs:
- Alibaba Cloud Model Studio: https://help.aliyun.com/zh/model-studio/
- DashScope API: https://dashscope.console.aliyun.com/ → API docs
- CKey: check provider dashboard

### Anti-patterns to avoid:
- ❌ Copying parameters from one model to another without checking
- ❌ Assuming "if model X supports it, model Y does too"
- ❌ Implementing features based on chat/LLM knowledge without verifying current API state
- ❌ Using parameter names that "sound right" instead of official names

## Parameter Validation

- Supported aspect ratios: `1:1`, `16:9`, `9:16`, `4:3`, `3:4`
- Supported video lengths: `3`, `5`, `8`, `10`, `15`, `30` seconds
- Maximum prompt length: 2000 characters
- Minimum effective prompt: 15 meaningful characters
- Unsupported ratios clamp to 16:9
- Unsupported lengths clamp to nearest value
