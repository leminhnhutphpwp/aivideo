# 3-Layer Architecture

## Layer 1: Frontend (`apps/web/`)
- **Framework**: Next.js 15 App Router, TypeScript strict
- **Styling**: Tailwind CSS 4, dark mode (#000000 bg, #FF5A1F accent)
- **State**: Zustand (ui-store), React hooks per feature
- **Icons**: Lucide React
- **Animations**: Motion (Framer Motion)
- **Canvas**: React Flow (storyboard editor)
- **Locale**: Vietnamese

### Key Routes
| Path | Component |
|------|-----------|
| `/studio/storyboard/flow` | Storyboard editor (dual-mode: multi-scene / single-flow / storyboard_image) |
| `/studio/storyboard/flow/[uuid]` | Viewer page + VoiceoverModal |
| `/billing/pricing` | Pricing page + CompetitorComparison |
| `/admin` | Filament admin dashboard |

## Layer 2: Backend (`backend/`)
- **Framework**: Laravel 12, PHP 8.x
- **Auth**: JWT via `tymon/jwt-auth`, guard `auth:api`
- **Admin**: Filament v5 + Shield permissions
- **Queue**: Horizon + Redis
- **Realtime**: Reverb (WebSocket, port 8080)
- **Settings**: `spatie/laravel-settings`
- **File Uploads**: `awcodes/filament-curator` (CuratorPicker)

### Architecture Pattern
- Business logic → `app/Services/`, controllers call services
- FormRequest for validation
- Daemon webhooks use shared secret (no internal middleware)
- PHPStan level 5

## Layer 3: Daemon (`apps/daemon/`)
- **Framework**: Express + TypeScript
- **Database**: better-sqlite3
- **Providers**: 13 media providers (OpenAI, QwenCloud, ElevenLabs, etc.)
- **Simulation Mode**: Toggle-able fake file generation for testing

### Key Daemon API Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/projects/:id/media/generate` | Generate media |
| POST | `/api/media/tasks/:id/wait` | Wait for task with progress |
| GET | `/api/media/models` | Models catalog |
| POST | `/api/media/simulation` | Toggle simulation mode |

## Docker Setup
- All services run via `backend/docker-compose.dev.yml`
- Start: `bash scripts/dev.sh start [service]`
- Restart: `bash scripts/dev.sh restart [service]`
- Backend tests run inside Docker: `docker exec backend-app-1 php artisan test`
- Database commands must run inside container
- **NEVER** run `migrate:fresh` or `db:wipe` unless explicitly asked

## Cross-Service Communication
- Frontend → Laravel: HTTP via `client.ts` (`laravel.*` + `daemon.*` methods)
- Frontend → Daemon (WebSocket): Via Laravel Reverb proxy
- Laravel → Daemon: HTTP via Docker internal network (`http://daemon:7456`)
- Daemon → Laravel: Webhook callbacks on job completion
