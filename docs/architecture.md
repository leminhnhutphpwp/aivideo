# AI Video Platform — Architecture

## System Overview

```
Next.js (port 3000) ──HTTP──► Laravel (port 8000)
                                      │
                                      │ (webhook callback)
                                      ▼
                              Daemon (port 7456)
```

## Layers

### Frontend (apps/web)
- **Technology**: Next.js 15 (App Router), TypeScript, Tailwind CSS 4
- **Port**: 3000
- **Responsibilities**: UI, auth flows, storyboard editor, media preview
- **Key Files**: `src/app/`, `src/components/`, `src/lib/api/client.ts`

### Backend (backend/)
- **Technology**: Laravel 12, PHP 8.2, MySQL, Redis
- **Port**: 8000
- **Responsibilities**: Auth, credits, queue, admin, email, webhook handling
- **Key Files**: `app/Services/`, `app/Http/Controllers/API/`, `routes/api.php`

### Daemon (apps/daemon/)
- **Technology**: Express, TypeScript, SQLite
- **Port**: 7456
- **Responsibilities**: Media generation, provider integration, file management
- **Key Files**: `src/media/`, `src/providers/`, `src/projects/`

## Data Flow

### Job Lifecycle
1. User creates storyboard → Laravel stores in DB
2. User clicks render → Laravel creates RenderJob (status: queued)
3. Laravel dispatches to queue → Worker picks up job
4. Laravel calls Daemon API → Daemon creates task
5. Daemon processes with AI provider → Sends progress webhook
6. Daemon completes → Sends completion webhook to Laravel
7. Laravel updates RenderJob status → Sends realtime event via Reverb
8. Frontend receives WebSocket update → Shows completion

### Community Features
- **Unit of publish**: RenderJob (individual assets), NOT Storyboard
- **Feed query**: `RenderJob::published()` with visibility filter
- **Publish endpoint**: `PATCH /render-jobs/{uuid}/publish`

## Key Patterns

### One-Shot vs Multi-Scene
- **Multi-scene** (`render_mode: multi_scene`): Per-scene settings, FFmpeg concat
- **One-Shot** (`render_mode: single_flow`): Shared settings, single generation

### Credit Calculation
- **Single source**: `PricingCalculator::calculate()`
- **Never hardcode**: Use API endpoints for duration/quality options

### Asset Security
- **Never expose raw daemon paths** to frontend
- **Always use**: `fetchRawFile(projectId, fileName)` for authenticated access

## Related Documentation
- [Backend Agent Guide](../backend/AGENTS.md)
- [Web Agent Guide](../apps/web/AGENTS.md)
- [Daemon Agent Guide](../apps/daemon/AGENTS.md)
- [API Contracts](../.opencode/skills/api-contract-daemon/SKILL.md)
