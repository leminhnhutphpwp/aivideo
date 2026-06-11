---
name: simulation-mode
description: Toggle-able daemon mode that replaces real AI media API calls with fake file generation for free end-to-end testing
---

# Simulation Mode

## Purpose
Toggle-able mode that replaces real AI media generation API calls with fake file generation. Enables end-to-end testing without spending money on API calls.

## How It Works
A **decorator pattern** wraps each provider in `RENDER_REGISTRY` (`src/media/index.ts`). When simulation is enabled, the decorator:
1. Simulates realistic latency (configurable)
2. Reports progress in Vietnamese (2 steps image/audio, 3 steps video)
3. Generates a fake but valid file (PNG/MP4/WAV) with visual markers
4. Task completes normally → webhook fires with `[SIMULATION]` in providerNote

When disabled: passes through to the real provider (no overhead).

## Toggle Methods

### 1. Environment Variable (for CI/testing — takes precedence)
```env
SIMULATION_MODE=1              # Enable
SIMULATION_LATENCY_IMAGE=3000  # ms (default)
SIMULATION_LATENCY_VIDEO=20000 # ms (default)
SIMULATION_LATENCY_AUDIO=2000  # ms (default)
SIMULATION_LATENCY_JITTER=0.3  # ±30% random variance (default)
```

### 2. Dev Script (runtime toggle, no restart needed)
```bash
bash scripts/dev.sh simulate on      # Enable
bash scripts/dev.sh simulate off     # Disable
bash scripts/dev.sh simulate status  # Check
```

### 3. Direct API (runtime)
```bash
curl -X POST http://localhost:7456/api/media/simulation \
  -H 'Content-Type: application/json' \
  -d '{"enabled":true}'
curl http://localhost:7456/api/media/simulation  # GET status
```

## Fake File Details

| Surface | Format | Content | Size |
|---------|--------|---------|------|
| Image | PNG | Gradient background + grid + "SIMULATED" text + prompt excerpt | 50-500 KB |
| Video | MP4 | Blue background + scrolling "SIMULATED" + prompt via FFmpeg `drawtext` | 200 KB - 2 MB |
| Audio | WAV | 440Hz sine tone | 50-200 KB |

## Architecture
```
                   SIMULATION MODE ON
RENDER_REGISTRY → withSimulation() wrapper → latency → generateFakeFile → writeFile + webhook
                                                              │
                   SIMULATION MODE OFF (pass-through)
RENDER_REGISTRY → withSimulation() wrapper → real provider (qwencloud, ckey, etc.)
```

## Files
| File | Purpose |
|------|---------|
| `apps/daemon/src/media/simulation/config.ts` | Env + JSON file config reader/writer |
| `apps/daemon/src/media/simulation/simulator.ts` | `withSimulation()` decorator + latency |
| `apps/daemon/src/media/simulation/generators.ts` | Surface dispatch |
| `apps/daemon/src/media/simulation/generators-image.ts` | Pure-Buffer PNG generator |
| `apps/daemon/src/media/simulation/generators-video.ts` | FFmpeg MP4 generator |
| `apps/daemon/src/media/simulation/generators-audio.ts` | FFmpeg WAV sine generator |
| `apps/daemon/src/media/simulation/index.ts` | Module exports |

## Rules
1. **Env var takes precedence** over runtime config (for CI/testing)
2. **Zero changes** to provider code — simulation wraps at registry level
3. Latency clamped to min 100ms; jitter clamped to [0, 1]
4. `providerNote` includes `[SIMULATION]` tag for downstream identification
5. Bad/missing JSON config → treated as off (no crash)
6. FFmpeg required for video/audio generation (already available for voiceover)
