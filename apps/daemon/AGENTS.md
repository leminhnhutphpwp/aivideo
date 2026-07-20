# Daemon — Media Engine

> **⚠️ MANDATORY — Strictly enforced**:
> This agent handles **ONLY** `apps/daemon/` (Express media engine).
> **DO NOT** touch `backend/` or `apps/web/`.

## Cross-References

| Purpose | Path |
|---------|------|
| OpenCode skills | `.opencode/skills/` |
| Architecture | `docs/architecture.md` |
| Conventions | `docs/conventions.md` |
| Laravel backend — DO NOT EDIT | `backend/` |
| Web frontend — DO NOT EDIT | `apps/web/` |
| Backend work logs (handoff) | `backend/worklogs/` |

## Quick Start

```bash
npm run build   # Compile TypeScript
npm run dev     # Dev mode (tsx src/standalone.ts)
npm start       # Production (node dist/standalone.js)
```

Port: 7456

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | /api/health | Health check |
| GET | /api/version | Version |
| GET/POST | /api/projects | List/Create projects |
| GET/PATCH | /api/projects/:id | Get/Update project |
| GET | /api/projects/:id/files | List project files |
| POST | /api/projects/:id/upload | Upload file |
| DELETE | /api/projects/:id/raw/:file | Delete file |
| POST | /api/projects/:id/files/rename | Rename file |
| GET | /api/projects/:id/conversations | Conversations |
| GET/POST/DELETE | /api/templates | Templates |
| GET | /api/media/models | Models catalog |
| GET/PUT | /api/media/config | Provider keys |
| GET | /api/media/providers/elevenlabs/voices | Voices |
| POST | /api/projects/:id/media/generate | Generate media |
| POST | /api/media/tasks/:id/wait | Wait for task |
| GET | /api/projects/:id/media/tasks | List tasks |
| GET | /api/projects/:id/raw/:file | Serve file |
| GET | /api/media/simulation | Get simulation mode status |
| POST | /api/media/simulation | Toggle simulation mode |

## Simulation Mode

For testing without spending money on real API calls. Replaces all provider calls with fake file generation.

```bash
# Via dev script (runtime, preferred)
bash scripts/dev.sh simulate on
bash scripts/dev.sh simulate off
bash scripts/dev.sh simulate status

# Via env var (takes precedence, for CI)
SIMULATION_MODE=1 npm run dev
```

**Config**: `src/media/simulation/config.ts`
**Decorator**: `src/media/simulation/simulator.ts` — `withSimulation()` wraps each RENDER_REGISTRY entry.

## Providers (13)

OpenAI, Volcengine Ark, xAI Grok, Nano Banana, ImageRouter,
Custom Image API, Leonardo.ai, ElevenLabs, HyperFrames,
MiniMax, SenseAudio, FishAudio, Stub

## Adding new model/provider — mandatory sync to Laravel

When adding a model/provider to `src/media/models.ts`, **must** update:

| Laravel File | What to update |
|-------------|---------------|
| `ModelSelector.php` | `getAvailableModels()` + `DEFAULT_MODELS` |
| `PricingSystemSeeder.php` | `model_mapping` quality tiers + `ProviderPricing` |

**Verify after adding:**
```bash
node apps/daemon/scripts/verify-media-models.mjs    # check sync
npx tsc --noEmit                                     # TS compile
docker exec aivideo-app-1 php artisan db:seed --class=PricingSystemSeeder  # seed pricing
```

## Writing Worklogs

After every task, write a worklog to `apps/daemon/worklogs/<YYYY-MM-DD>-<task-slug>.md`.

See `docs/conventions.md` for the worklog template.
