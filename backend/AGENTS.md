# AI Video Platform — Backend Agent Guide

> **⚠️ MANDATORY — Strictly enforced**:
> This agent is **ONLY** allowed to modify `backend/` (Laravel).
> **DO NOT** touch `apps/web/` (Next.js frontend) or `apps/daemon/` (media engine).
> Those belong to other agents. See `worklogs/` for handoff notes.

## Cross-References

| Purpose | Path |
|---------|------|
| OpenCode skills | `.opencode/skills/` |
| OpenCode rules | `.opencode/rules/` |
| Work logs | `backend/worklogs/` |
| Architecture | `docs/architecture.md` |
| Conventions | `docs/conventions.md` |
| Roadmap | `docs/plans/roadmap.md` |
| Frontend — DO NOT EDIT | `apps/web/` |
| Daemon — DO NOT EDIT | `apps/daemon/` |

## Overview

Laravel 12 backend: **Control Plane** (auth, credits, queue, admin, email).
Daemon (port 7456) is the execution plane — backend receives its webhook callbacks but does **not** proxy requests to it anymore.

## Quick Reference

```bash
# Dev - Start all services
bash scripts/dev.sh start

# Dev - Start specific service
bash scripts/dev.sh start backend

# Dev - Build assets
bash scripts/dev.sh build backend   # Build Filament theme (inside Docker)

# Exec into container
bash scripts/dev.sh exec backend php artisan <command>

# Status & Logs
bash scripts/dev.sh status
bash scripts/dev.sh logs backend
```

| Service | Port |
|---------|------|
| App | 8000 |
| MySQL | 3307 |
| Redis | 6380 |

## Structure

```
app/
├── Console/Commands/
├── Enums/
├── Events/
├── Exceptions/
├── Filament/Resources/
├── Http/
│   ├── Controllers/API/
│   ├── Middleware/
│   └── Requests/
├── Jobs/
├── Listeners/
├── Models/
├── Policies/
├── Providers/
└── Services/
```

## Rules

- Business logic → `app/Services/`, controllers call services
- FormRequest for validation
- `spatie/laravel-settings` for system settings
- `awcodes/filament-curator` (CuratorPicker) for file uploads
- JWT via `tymon/jwt-auth`, guard `auth:api`
- Daemon webhooks use shared secret (no internal middleware)
- Filament v5 + Shield for permissions

### Storyboard One-Shot (`render_mode: single_flow`)
- **`StoryboardRenderer::renderSingleFlow()`**: Creates 1 daemon project + 1 job with `compiled_prompt` as the generate param.
- **`StoryboardController::compilePrompt()`**: `POST /api/storyboards/{uuid}/compile-prompt`
- **Shared skills**: `camera_movement`, `style`, `mood`, `lighting`, `narration` stored at storyboard level

### Credit Calculation
- **ALWAYS use `PricingCalculator::calculate()`** — never hardcode credit formulas

### Duration Tiers
- **`Storyboard::closestDurationCode()`**: Queries `DurationTier::active()` dynamically
- **API**: `GET /api/v1/pricing/durations`

### Voiceover (Post-Generation Only)
- **Endpoint**: `POST /api/storyboards/{uuid}/add-voiceover`
- **Never include voice/narration/bg_music in generateMedia params**

### Rate Limiting
- `ThrottleApiRequests` — per-plan limits (free: 120, starter: 300, pro: 600, studio: 1000, enterprise: 2000 req/min)

### Adding new model/provider — mandatory sync

When adding a model/provider to daemon (`apps/daemon/src/media/models.ts`), **must** update:

| File | What to update |
|------|---------------|
| `ModelSelector.php` | `getAvailableModels()` + `DEFAULT_MODELS` |
| `PricingSystemSeeder.php` | `model_mapping` quality tiers + `ProviderPricing` |

**Verify after adding:**
```bash
node apps/daemon/scripts/verify-media-models.mjs
docker exec backend-app-1 php artisan db:seed --class=PricingSystemSeeder
```

## Writing Worklogs

After every task, write a worklog to `backend/worklogs/<YYYY-MM-DD>-<task-slug>.md`.

See `docs/conventions.md` for the worklog template.
