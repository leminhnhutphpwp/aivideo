# Coding Conventions

## General
- TypeScript strict mode everywhere
- Vietnamese as primary UI locale
- Dark mode (#000000 bg, #FF5A1F accent)
- Small, verifiable patches
- Never commit/push unless explicitly requested
- NEVER clear database (migrate:fresh, db:wipe) unless explicitly asked
- Use CodeGraph tools for structural queries before grep/read

## Backend (Laravel)
- Business logic → `app/Services/`, controllers call services
- FormRequest for validation
- `spatie/laravel-settings` for system settings
- `awcodes/filament-curator` (CuratorPicker) for file uploads
- JWT via `tymon/jwt-auth`, guard `auth:api`
- Daemon webhooks use shared secret (no internal middleware)
- Filament v5 + Shield for permissions
- PHPStan level 5

### Credit Calculation
- ALWAYS use `PricingCalculator::calculate()` — never hardcode formulas
- `Storyboard::calculateCreditsCost()` delegates to `PricingCalculator`
- Duration tiers from DB: `DurationTier::active()` via `GET /api/v1/pricing/durations`
- Never hardcode duration arrays (`[3, 5, 10, 15, 30]`)

### Adding New Models/Providers
Must sync to Laravel:
- `ModelSelector.php` — `getAvailableModels()` + `DEFAULT_MODELS`
- `PricingSystemSeeder.php` — `model_mapping` + `ProviderPricing`
- Verify: `node apps/daemon/scripts/verify-media-models.mjs`

## Frontend (Next.js)
- App Router, TypeScript strict
- Tailwind CSS 4 + Lucide React + Motion
- `@/*` path alias → `./src/*`
- API client: `src/lib/api/client.ts`

### Image Security
- NEVER use raw daemon paths in `<img src="">`
- Always use `fetchRawFile(projectId, fileName)` → `{ blobUrl, blob }`
- `AssetController::index()` filters `where('type', '!=', 'thumbnail')`

### Voiceover (Post-Generation Only)
- Never include voice/narration/bg_music in generateMedia params
- `POST /api/storyboards/{uuid}/add-voiceover` — storyboard must be `completed`
- UI: `VoiceoverModal` component as "Thêm giọng đọc" button on viewer

### Pricing UI
- Use `laravel.pricingCalculate()` for credit preview
- Use `laravel.pricingDurations()` for duration options
- Never hardcode credit formulas or duration arrays on frontend

## Daemon (Express)
- `src/media/models.ts` is source of truth for all models
- `withSimulation()` decorator wraps RENDER_REGISTRY entries
- Simulation config: env var `SIMULATION_MODE` takes precedence over JSON file
- Providers: OpenAI, Volcengine Ark, xAI Grok, QwenCloud, etc.

## Storyboard Architecture
- **multi_scene**: Traditional per-scene, FFmpeg concat
- **single_flow**: Single compiled prompt, one generation job, skip FFmpeg
- **storyboard_image**: Multi-panel image → R2V with shot_type:"multi"
- Mode toggle via `RenderModeProvider` + pill toggle
- Compiled prompt: `POST /api/storyboards/{uuid}/compile-prompt` → AiPromptCompiler

## Post-Task Workflow (Mandatory)
1. Run verify (typecheck, tests)
2. Write worklog: `<scope>/worklogs/<YYYY-MM-DD>-<task-slug>.md`
3. Update `task-status.md`
4. Report results

## Service Restart Rules
| Change | Command |
|--------|---------|
| Daemon `src/` | `docker compose -f backend/docker-compose.dev.yml up -d --force-recreate daemon` |
| Backend PHP | `bash scripts/dev.sh restart backend` |
| Web `apps/web/` | `bash scripts/dev.sh restart web` |
| Daemon models.ts | Restart daemon + run `verify-media-models.mjs` |
