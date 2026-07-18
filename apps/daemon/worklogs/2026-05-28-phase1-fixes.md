# Phase 1 Critical Fixes — Daemon Worklog

## Date
2026-05-28

## Overview
Extended daemon from 4 providers to 5 by adding ElevenLabs (TTS + SFX). Fixed hardcoded empty arrays for `music`/`sfx` in `AUDIO_MODELS_BY_KIND`. Fixed hardcoded voice default. Added ElevenLabs voices to registry.

## Files Changed

| File | Change |
|------|--------|
| `apps/daemon/src/media/providers.ts:86-99` | Added ElevenLabs provider entry (2 models: `elevenlabs-v3` tts, `elevenlabs-sfx` sfx) |
| `apps/daemon/src/media/models.ts:44-56` | Changed `sfx: []` and `music: []` from hardcoded empty to dynamic filter from `ALL_PROVIDERS` |
| `apps/daemon/src/media/providers/elevenlabs.ts` | **NEW** — `renderElevenLabsTTS()` and `renderElevenLabsSFX()` implementation |
| `apps/daemon/src/media/index.ts:20,109-116` | Added import + 2 dispatch branches for ElevenLabs TTS + SFX |
| `apps/daemon/src/voice/registry.ts:19-22` | Added ElevenLabs static voice entries (Rachel, Domi) |
| `apps/daemon/src/routes/media.ts:356` | Changed hardcoded `'vi-VN-Standard-A'` to provider-aware default (`ckey → vi-VN-NamMinhNeural`, `elevenlabs → 21m00Tcm4TlvDq8ikWAM`) |

## Key Decisions

1. **ElevenLabs SFX** uses `eleven_text_to_sound_v2` model map — maps from `elevenlabs-sfx` model ID
2. **ElevenLabs TTS** defaults to `eleven_turbo_v2_5` for models not in `ELEVENLABS_TTS_MODEL_MAP` (fallback)
3. **SFX prompt limits** enforced via `clampElevenLabsSfxDuration()` and `clampElevenLabsSfxPromptInfluence()` from `render-utils.ts`
4. **Voice default** now respects the configured TTS provider via `getDefaultProvider()` — avoids using Google TTS voice ID for ElevenLabs
5. **`music: []` kept as dynamic filter** — automatically picks up any model with `music` cap from any provider (future-proof)

## Provider Stats After Change

| Metric | Before | After |
|---|---|---|
| Providers | 4 | **5** (added ElevenLabs) |
| Total models | 32 | **34** |
| VIDEO models | 13 | 13 |
| IMAGE models | 18 | 18 |
| AUDIO models | 1 (speech only) | **4** (speech: 2, sfx: 1, music: 0) |
| SFX models | 0 | **1** (elevenlabs-sfx) |

## Verification

- [x] `npx tsc --noEmit`: No errors
- [x] `node scripts/verify-media-models.mjs`: PASS (34 models in sync)
- [x] Manual check: `sfx` filter returns `elevenlabs-sfx` from CKey provider (dynamic)
- [x] Manual check: `music` filter returns empty (no provider has music models yet — expected)

## Handoff Notes

- **@web needs to know**: 2 new voice providers available — ElevenLabs TTS (elevenlabs-v3) and ElevenLabs SFX (elevenlabs-sfx). Audio voice selector UI should now list ElevenLabs voices.
- **@backend needs to know**: `ModelSelector.php` already updated with ElevenLabs models. Run `docker exec backend-app-1 php artisan db:seed --class=PricingSystemSeeder` to add pricing entries if needed.
