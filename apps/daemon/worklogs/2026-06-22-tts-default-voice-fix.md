# TTS default-voice regression fix — Worklog

## Date
2026-06-22

## Overview
Re-running the daemon suite after the 2026-06-22 studio sprint surfaced **5 failing tests** in
`ckey.test.ts` + `elevenlabs.test.ts`. Root cause: commit `d5c591d` accidentally changed the
CKey and ElevenLabs TTS providers to **throw** when `ctx.voice` is empty, instead of falling
back to a default voice. Restored the default-voice fallback so a TTS render with no explicit
voice succeeds again — a consistent contract across all TTS providers.

## Investigation (why "restore default", not "update tests")
- `d5c591d` diff: `voiceId = (ctx.voice && ctx.voice.trim()) || 'vi-VN-NamMinhNeural'` (CKey) and
  `|| ELEVENLABS_DEFAULT_VOICE_ID` (ElevenLabs) were replaced with `if (!voiceId) throw …`.
- **Same commit** added `openai-generic.ts`, whose TTS uses `voice: ctx.voice || 'alloy'` — it
  kept a default. So the require-voice behavior was an inconsistency within one commit, not a
  deliberate contract change.
- `elevenlabs.ts` still **imported `ELEVENLABS_DEFAULT_VOICE_ID` but no longer used it** (dead
  import) — a tell-tale of an incomplete refactor.
- The render pipeline passes `voice: voice || ''` (`media/index.ts:144`) — empty voice is a
  legitimate value at the provider boundary, so a default is required for the no-voice path.
- The `/tts` HTTP route also defaults (`req.body?.voice || 'alloy'`).
- The (untouched) tests assert defaults: CKey → `vi-VN-NamMinhNeural`, ElevenLabs →
  `21m00Tcm4TlvDq8ikWAM`.

→ Restoring the default is the correct, consistent fix.

## Files Changed
| File | Change |
|------|--------|
| `src/media/render-utils.ts` | Added `export const CKEY_DEFAULT_VOICE_ID = 'vi-VN-NamMinhNeural'` (named constant, matching the ElevenLabs/SenseAudio convention). |
| `src/media/providers/ckey.ts` | Import `CKEY_DEFAULT_VOICE_ID`; `voiceId = (ctx.voice && ctx.voice.trim()) || CKEY_DEFAULT_VOICE_ID` (removed the `throw`). |
| `src/media/providers/elevenlabs.ts` | `voiceId = (ctx.voice && ctx.voice.trim()) || ELEVENLABS_DEFAULT_VOICE_ID` (removed the `throw`; the previously dead import is now used). |

Kept the new `if (!credentials.baseUrl) throw` guards from `d5c591d` — those are a sound safety
net (baseUrl is always populated by `resolveProviderConfig`'s `defaultBaseUrl` fallback) and are
unrelated to the voice regression.

## Key Decisions
1. **Restore default voice (not update tests)** — the pipeline allows empty voice, the sibling
   `openai-generic` provider already defaults, and the dead import proves intent. Requiring a
   voice would hard-fail real no-voice TTS renders.
2. **Named constant `CKEY_DEFAULT_VOICE_ID`** instead of an inline literal — matches
   `ELEVENLABS_DEFAULT_VOICE_ID` / `SENSEAUDIO_DEFAULT_VOICE_ID` in `render-utils.ts`.

## Verification
- [x] TypeScript: `npx tsc --noEmit` → 0 errors.
- [x] Tests: targeted `ckey.test.ts` + `elevenlabs.test.ts` → 21 passed, 0 failed.
- [x] Tests: full daemon suite → **142 passed, 4 skipped, 0 failed** (8 files) — back to baseline.

## Handoff Notes
- **@daemon needs to know**: the running `backend-daemon-1` container must be rebuilt to pick up
  the `src/` change: `docker compose -f backend/docker-compose.dev.yml up -d --force-recreate daemon`.
- Not committed — awaiting owner.

## Status
✅ Completed
