# Simulation Mode — Worklog

## Date
2026-06-04

## Overview
Implemented Simulation Mode — a toggle-able feature that replaces real AI media generation API calls with fake file generation (colored PNGs, FFmpeg MP4s, sine WAVs). Uses decorator pattern wrapping RENDER_REGISTRY entries — zero changes to provider code.

## Files Changed

### New files (`src/media/simulation/`)
| File | Purpose |
|------|---------|
| `config.ts` | Env var + JSON file config reader/writer. Env `SIMULATION_MODE` takes precedence. |
| `simulator.ts` | `withSimulation()` decorator — pass-through when off, latency + progress when on |
| `generators-image.ts` | Pure-Buffer PNG generator (IHDR/IDAT chunks, CRC32) — gradient background + grid + text |
| `generators-video.ts` | FFmpeg-based MP4 with `textfile` drawtext overlay ("SIMULATED" + prompt) |
| `generators-audio.ts` | FFmpeg-based 440Hz sine WAV |
| `generators.ts` | Surface dispatch — routes to correct generator, adds `[SIMULATION]` providerNote tag |
| `index.ts` | Module entry — exports `isSimulationEnabled`, `getSimulationConfig`, `setSimulationConfig`, `withSimulation` |

### Modified files
| File | Change |
|------|--------|
| `src/media/index.ts` | Wrapped all 7 RENDER_REGISTRY entries with `withSimulation(renderFn, surface)` |
| `src/routes/media.ts` | Added `GET /api/media/simulation` (returns config) + `POST /api/media/simulation` (toggle runtime) |
| `.env` | Added `SIMULATION_MODE`, `SIMULATION_LATENCY_*` vars |
| `.env.example` | Same vars with explanations |

## Key Decisions
1. Env `SIMULATION_MODE=1` takes precedence over runtime JSON config (for CI/testing)
2. Latency defaults: image=3s, video=20s, audio=2s, jitter=±30%; clamped min 100ms
3. Progress messages in Vietnamese: 2 steps for image/audio, 3 steps for video
4. `providerNote` includes `[SIMULATION]` tag for downstream identification
5. FFmpeg required for video/audio (already available for voiceover)
6. Pure Buffer for PNG (no external deps needed)

## Verification
- [x] `cd apps/daemon && npx tsc --noEmit`: pass (0 errors)
- [x] 37/37 unit tests pass (3 skipped: need ffmpeg)
- [x] Fix applied: `getSimulationConfig()` now reads `fileCfg.enabled` instead of hardcoding false
- [x] Fix applied: video generator uses `textfile` instead of inline `text=` for FFmpeg drawtext (safe for special chars)
