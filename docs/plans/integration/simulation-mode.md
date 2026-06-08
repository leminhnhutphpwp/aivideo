# Simulation/Mock Mode — Design Plan

## Date
2026-06-04

## Overview
Add a toggle-able **Simulation Mode** to the daemon that replaces real AI media generation API calls with realistic fake file generation. This allows end-to-end testing of the full pipeline (frontend → Laravel → daemon → webhook → complete) without spending real money on API calls, while still producing visually inspectable output.

## Architecture

```
                          SIMULATION MODE OFF (default)
Frontend ──► Laravel ──► Daemon ──► QwenCloud/Runway/Kling APIs ──► Real files
                                         │
                          SIMULATION MODE ON
Frontend ──► Laravel ──► Daemon ──► SimulationProvider (wrapper)
                                         │
                                    ┌─────┴──────┐
                                    │  Latency    │  ← configurable sleep
                                    │  Simulator  │
                                    └─────┬──────┘
                                          │
                                    ┌─────┴──────┐
                                    │ Fake File   │  ← PNG/MP4 with visual content
                                    │ Generator   │
                                    └─────┬──────┘
                                          │
                                    writeFile + webhook (same as real)
```

## Current System Analysis

### Existing Stub Infrastructure (`src/media/providers/stub.ts`)
- Currently generates **empty/minimal** placeholder files:
  - **Images**: 1×1 pixel PNG (67 bytes) or SVG with prompt text
  - **Video**: Bare MP4 headers (32 bytes — no frames)
  - **Audio**: 0.5s silent WAV
- Activated when: (a) no renderer registered, or (b) real provider fails AND `MEDIA_ALLOW_STUBS=1`
- Controlled by env var: `MEDIA_ALLOW_STUBS=1`

### Gaps
1. Files are **not visually useful** — 1×1 pixel cannot be displayed for visual inspection
2. **No latency simulation** — returns instantly, so polling/progress UIs can't be tested
3. **No independent toggle** from the existing stub system — stubs only fire when a provider is missing or fails
4. **No way to force simulation** for already-configured, working providers (e.g., `qwencloud` with valid API key)

### Why Not Just Improve `stub.ts`?
The existing stub serves a different purpose: **graceful degradation when a provider is unavailable**. Simulation mode is different — it's an **intentional testing mode** that replaces all real API calls regardless of provider availability. Mixing them would couple concerns. Instead, we use a **wrapper/decorator pattern** that intercepts at the renderer resolution level.

## Config Approach

### Primary: Environment Variable (`SIMULATION_MODE`)
```env
# In apps/daemon/.env
SIMULATION_MODE=0              # 0=off, 1=on
SIMULATION_LATENCY_IMAGE=3000  # ms base delay for images (default: 3000)
SIMULATION_LATENCY_VIDEO=20000 # ms base delay for videos (default: 20000)
SIMULATION_LATENCY_AUDIO=2000  # ms base delay for audio (default: 2000)
SIMULATION_LATENCY_JITTER=0.3  # Random ±30% jitter multiplier (default: 0.3)
```

### Secondary: Runtime API Endpoint (for toggling without restart)
```
POST /api/media/simulation
Body: { enabled: boolean, latency?: { image?: number, video?: number, audio?: number, jitter?: number } }
GET  /api/media/simulation   → { enabled: boolean, latency: {...} }
```

The runtime toggle is stored in a JSON file (`media-simulation.json`) next to `media-config.json`, so it persists across daemon restarts. Env var takes precedence if explicitly set.

### Precedence
1. Env var `SIMULATION_MODE=1` → always on (for CI/testing)
2. Runtime config JSON → toggle-able via API (for interactive testing)
3. Default → off

## Mock Implementation

### 1. Simulation Provider Wrapper (`src/media/simulation/simulation-provider.ts`)

A **decorator** that wraps any real render function. It intercepts before the real API call happens.

```typescript
// Pseudocode — the decorator pattern
function withSimulation(renderFn: RenderFn, surface: string): RenderFn {
  return async (ctx, credentials, onProgress) => {
    if (!(await isSimulationEnabled())) {
      return renderFn(ctx, credentials, onProgress); // Pass through
    }

    // Simulate latency
    const delay = getSimulatedLatency(surface); // e.g., 3s for image, 20s for video
    const steps = surface === 'video' ? 3 : 2;
    for (let i = 0; i < steps; i++) {
      const stepMs = Math.round(delay / steps);
      await sleep(stepMs);
      if (onProgress) {
        const msgs = {
          image: ['Generating simulated image (step 1/2)...', 'Rendering final output (step 2/2)...'],
          video: ['Analyzing prompt for simulation...', 'Generating simulated frames...', 'Encoding final video...'],
          audio: ['Generating simulated audio...', 'Normalizing levels...'],
        };
        onProgress(msgs[surface]?.[i] ?? `Simulating... (step ${i + 1}/${steps})`);
      }
    }

    // Generate fake file
    const extension = surface === 'image' ? '.png' : surface === 'video' ? '.mp4' : '.mp3';
    return generateSimulatedFile(ctx, surface, extension);
  };
}
```

### 2. Integration into Render Registry (`src/media/index.ts`)

The render registry in `src/media/index.ts` (the `RENDER_REGISTRY` Map) is where we inject the simulation wrapper:

```typescript
const RENDER_REGISTRY = new Map<string, RenderFn>([
  ['qwencloud:video:*', withSimulation(renderQwenCloudVideo, 'video')],
  ['qwencloud:image:*', withSimulation(renderQwenCloudImage, 'image')],
  ['ckey:audio:speech', withSimulation(renderCKeyTTS, 'audio')],
  ['ckey:image:*', withSimulation(renderCKeyImage, 'image')],
  ['elevenlabs:audio:speech', withSimulation(renderElevenLabsTTS, 'audio')],
  ['elevenlabs:audio:sfx', withSimulation(renderElevenLabsSFX, 'audio')],
  ['cloudflare:image:*', withSimulation(renderCloudflareImage, 'image')],
]);
```

Alternatively, to keep the registry clean, the wrapping can happen at the import level or via a helper function that wraps all entries.

### 3. Fake File Generation (`src/media/simulation/generators.ts`)

#### Images: Colored PNG with Visual Markers
```
Resolution: Based on ctx.aspect (e.g., 1024×1024 for 1:1)
Content:
  - Gradient background (different hue per "seed" or hash of prompt)
  - Semi-transparent grid overlay (like a filmmaker's framing guide)
  - Text overlay:
    - Model name (e.g., "wan2.7-t2v")
    - First 80 chars of prompt
    - Aspect ratio badge (e.g., "16:9")
    - Generation timestamp
    - "SIMULATED" watermark
  - Color bars at bottom (like test pattern)
  - Dimensions label
```

Implementation: Use the **sharp** library (already commonly available in Node ecosystems, or we can use a pure-JS PNG generator like `pngjs`).

#### Videos: Animated MP4 with Frame Evolution
```
Resolution: Based on ctx.aspect (e.g., 1280×720 for 16:9)
Duration: ctx.length seconds (default 5)
Content per frame:
  - Background hue shifts smoothly over time (HSL animation)
  - Moving text scroll (prompt crawls across screen)
  - "SIMULATED" stamp that changes color
  - Frame counter overlay
  - Color bars at bottom
  - Audio track: 440Hz tone (optional)
```

Implementation: Use **FFmpeg** (already required by the daemon for voiceover merging) to generate a video from a series of images or use `ffmpeg`'s built-in test patterns:

```
ffmpeg -y -f lavfi -i "color=c=blue:size=1280x720:d=5,drawtext=...' \
       -f lavfi -i "anullsrc=r=44100:cl=mono" \
       -shortest output.mp4
```

We can shell out to FFmpeg (which the daemon already does via `child_process`).

#### Audio: Tone with Voice Label
```
Format: MP3 or WAV
Content:
  - 440Hz sine wave (A4 note) for the duration
  - Or white noise with band-pass filter
  - Audio level normalized to -12dB
```

Implementation: Use FFmpeg's `sine` filter or a WAV buffer generator (like existing `silentWav` but with actual sound).

#### File Size Targets
| Surface | Target Size | Rationale |
|---------|-------------|-----------|
| Image | 50-500 KB | Looks like a real generated image |
| Video (5s) | 200 KB - 2 MB | Looks like a short compressed clip |
| Audio (5s) | 50-200 KB | Looks like a real TTS/SFX output |

### 4. Latency Simulation

Configurable delay ranges to mimic real API behavior:

| Surface | Base Delay | Jitter | Realistic Range |
|---------|-----------|--------|-----------------|
| Image | 3,000 ms | ±30% | 2.1 - 3.9 seconds |
| Video | 20,000 ms | ±30% | 14 - 26 seconds |
| Audio | 2,000 ms | ±30% | 1.4 - 2.6 seconds |

The delay is split into `N` steps, each reporting progress via `onProgress`, so the frontend's polling UI fills up naturally.

### 5. Webhook Integration

No changes needed to the webhook flow. When simulation mode is on:
- `generateMedia()` returns a `RenderResult` with real bytes (fake but real file)
- The task completes normally with `status: 'done'`
- The webhook fires with the same payload structure as a real generation
- The `providerNote` includes `[SIMULATION]` tag for debugging

The only change: the `providerNote` is prefixed with `[SIMULATION]` so downstream consumers can distinguish simulation results.

## Provider Coverage

| Provider | Surface | Mock? | Priority |
|----------|---------|-------|----------|
| **qwencloud** | image, video | ✅ | P0 — primary provider |
| **ckey** | image, audio (TTS) | ✅ | P0 — TTS for voiceover |
| **elevenlabs** | audio (TTS, SFX) | ✅ | P0 — voiceover + SFX |
| **cloudflare** | image | ✅ | P1 — secondary image provider |
| **stub** | all | ❌ | Keep existing behavior |

## File Changes

### New Files to Create

| File | Purpose |
|------|---------|
| `apps/daemon/src/media/simulation/index.ts` | Module entry — exports `isSimulationEnabled()`, `getSimulationConfig()`, `withSimulation()` |
| `apps/daemon/src/media/simulation/config.ts` | Read/write simulation config from env + JSON file + runtime API |
| `apps/daemon/src/media/simulation/simulator.ts` | `withSimulation()` decorator, latency simulation, progress reporting |
| `apps/daemon/src/media/simulation/generators.ts` | Fake file generators for image, video, audio |
| `apps/daemon/src/media/simulation/generators-image.ts` | Image-specific: colored PNG with overlays via sharp/pngjs |
| `apps/daemon/src/media/simulation/generators-video.ts` | Video-specific: FFmpeg-based animated video with text overlays |
| `apps/daemon/src/media/simulation/generators-audio.ts` | Audio-specific: sine wave or tone WAV/MP3 |

### Files to Modify

| File | Change |
|------|--------|
| `apps/daemon/src/media/index.ts` | Wrap each `RENDER_REGISTRY` entry with `withSimulation()` |
| `apps/daemon/src/routes/media.ts` | Add `GET/POST /api/media/simulation` endpoints for runtime toggle |
| `apps/daemon/.env` | Add `SIMULATION_MODE`, `SIMULATION_LATENCY_*` vars |
| `apps/daemon/.env.example` | Add simulation mode vars with comments |
| `apps/daemon/src/media/render-utils.ts` | Export `sleep()` and `truncate()` if not already (they already are) |
| `apps/daemon/package.json` | Add dependency: `pngjs` or `sharp` for image generation |

### Files to Not Modify

| File | Reason |
|------|--------|
| `apps/daemon/src/media/providers/stub.ts` | Keep existing stub behavior for unregistered providers |
| `apps/daemon/src/media/providers/qwencloud.ts` | No changes — simulation wraps at registry level |
| `apps/daemon/src/services/task-manager.ts` | No changes — webhook flow is identical |
| `backend/app/Http/Controllers/API/DaemonWebhookController.php` | No changes — same payload shape |
| `apps/web/*` | No changes — frontend is agnostic |

## Database Changes
None. Simulation config is stored in JSON file + env vars, not SQLite.

## Edge Cases

| Case | Behavior |
|------|----------|
| Env var `SIMULATION_MODE=1` but runtime config says `false` | Env wins (CI mode) |
| Env var unset, runtime config missing (first run) | Simulation off (default safe) |
| Latency = 0 or negative | Clamp to 100ms minimum |
| Bad JSON in `media-simulation.json` | Treat as off, log warning, don't crash |
| Simulation on + real provider API key missing | Simulation handles it (doesn't need API key) |
| Simulation on + provider throws before simulation check | Exception propagates normally — simulation only wraps at registry level |
| Frontend polls during simulated delay | Works normally — `notifyTaskWaiters()` signals after each progress step |
| Concurrent simulation tasks | Each gets independent delay + random jitter; works fine |

## Risks & Trade-offs

| Risk | Mitigation |
|------|------------|
| FFmpeg dependency for video generation | Already required by voiceover system — no new infra |
| sharp/pngjs dependency adds deploy size | Only needed in dev/test; could be moved to devDependencies or replaced with pure-JS approach |
| Simulation config file contention | Single writer (runtime API) + single reader (simulation check) — no race in practice |
| People forget to turn off simulation | Env var `SIMULATION_MODE=0` in production .env; runtime config resets on deploy |
| Simulated latency makes tests slow | Tests can set `SIMULATION_LATENCY_*` to 100ms or use `SIMULATION_MODE=0` |

## Testing Approach

### 1. Unit Tests
- `isSimulationEnabled()` returns correct value for env var + config combinations
- `getSimulatedLatency()` returns clamped, jittered values within expected range
- `withSimulation()` passes through when mode is off
- `withSimulation()` intercepts when mode is on
- File generators produce valid PNG/MP3/MP4 headers

### 2. Integration Test (via daemon API)
```
# Enable simulation
curl -X POST http://localhost:7456/api/media/simulation -H 'Content-Type: application/json' -d '{"enabled":true}'

# Generate an image (no API key needed)
curl -X POST http://localhost:7456/api/projects/{id}/media/generate \
  -H 'Content-Type: application/json' \
  -d '{"surface":"image","model":"wan2.7-image-pro","prompt":"A futuristic city at sunset"}'

# Verify: task completes, file exists, file is valid PNG > 10KB
```

### 3. End-to-End Flow (via @tester)
1. Enable simulation mode
2. Create a storyboard in frontend
3. Submit render request
4. Observe: loading states, polling progress, completion
5. Verify: rendered image/video appears in results, has visual content
6. Verify: webhook was received by Laravel, RenderJob marked complete
7. Verify: no external API calls were made (check daemon logs)

### 4. Tester Script
Create `apps/daemon/scripts/test-simulation.mjs` that:
1. Starts daemon with `SIMULATION_MODE=1`
2. Creates a project
3. Submits image generation → verifies output
4. Submits video generation → verifies output  
5. Submits audio generation → verifies output
6. Reports pass/fail

## Effort Estimate

| Task | Layer | Est. Time | Details |
|------|-------|-----------|---------|
| 1 | daemon | 1h | Create `config.ts` — env var + JSON file read/write + runtime state |
| 2 | daemon | 1.5h | Create `simulator.ts` — `withSimulation()` decorator, latency logic, progress |
| 3 | daemon | 1.5h | Create `generators-image.ts` — realistic PNG generation with sharp/pngjs |
| 4 | daemon | 2h | Create `generators-video.ts` — FFmpeg-based animated video generation |
| 5 | daemon | 0.5h | Create `generators-audio.ts` — tone/noise audio generation |
| 6 | daemon | 0.5h | Create `index.ts` — module entry point, exports |
| 7 | daemon | 0.5h | Modify `src/media/index.ts` — wrap registry entries |
| 8 | daemon | 0.5h | Modify `src/routes/media.ts` — add simulation toggle API |
| 9 | daemon | 0.25h | Update `.env` and `.env.example` — new vars |
| 10 | daemon | 0.5h | Create test script `scripts/test-simulation.mjs` |
| 11 | testing | 1h | End-to-end verification with @tester |
| **Total** | | **9.75h** | |

## Implementation Order

```
1. config.ts          — foundation (all other code depends on this)
2. simulator.ts       — core decorator logic
3. generators-image.ts — image fake files (higher priority than video)
4. generators.ts       — surface dispatch + shared utilities
5. index.ts            — module entry point
6. Modify index.ts (media) — wire up registry wrappers
7. generators-video.ts  — video fake files
8. generators-audio.ts  — audio fake files
9. Modify routes/media.ts — simulation toggle API
10. .env + .env.example updates
11. Test script + verification
```

Steps 1–6 are the **core** (can be verified without FFmpeg). Steps 7–8 add video/audio support.
