# Conventions & Patterns — Persistent Memory

## Agent System Conventions

### Scope Boundaries (STRICT)
| Agent | Allowed scope | DO NOT touch |
|-------|---------------|--------------|
| `@backend` | `backend/` (Laravel) | `apps/web/`, `apps/daemon/` |
| `@web` | `apps/web/` (Next.js) | `backend/`, `apps/daemon/` |
| `@daemon` | `apps/daemon/` (Express) | `backend/`, `apps/web/` |
| `@coordinator` | All (delegation only) | Must NOT modify code directly |

### Mandatory Post-Task Workflow
1. ✅ Run verify (typecheck, tests)
2. ✅ Write worklog: `<scope>/worklogs/<YYYY-MM-DD>-<task-slug>.md`
3. ✅ Update `task-status.md`
4. ✅ Report results to user

### Worklog Location
- Backend: `backend/worklogs/`
- Web: `apps/web/worklogs/`
- Daemon: `apps/daemon/worklogs/`

### Must-Read Before Starting Any Task
1. `task-status.md` — overall project status & active tasks
2. `scripts/README.md` — unified scripts guide
3. `.opencode/README.md` — OpenCode configuration
4. Relevant `worklogs/` — latest changes by other agents
5. `docs/plans/README.md` — architecture overview
6. `docs/plans/update-plan.md` — roadmap

### CodeGraph Usage (MANDATORY)
- Must use `codegraph_*` tools FIRST for structural queries
- Only use grep/read when:
  1. CodeGraph returned no results
  2. Searching for literal text (strings, comments, log output)
- Pass `projectPath` when querying subdirectories:
  - Backend: `projectPath: "/var/www/AIVideoPaltfom/backend"`
  - Web: `projectPath: "/var/www/AIVideoPaltfom/apps/web"`
  - Daemon: `projectPath: "/var/www/AIVideoPaltfom/apps/daemon"`

## Coding Conventions

### Backend (Laravel)
- Business logic → `app/Services/`, controllers call services
- FormRequest for validation
- `spatie/laravel-settings` for system settings
- `awcodes/filament-curator` (CuratorPicker) for file uploads
- JWT via `tymon/jwt-auth`, guard `auth:api`
- Daemon webhooks use shared secret (no internal middleware)
- Filament v5 + Shield for permissions

### Frontend (Next.js)
- App Router, TypeScript strict
- Tailwind CSS 4 + Lucide React + Motion
- Vietnamese as primary locale
- Dark theme (#000000 background, accent #FF5A1F)
- API client: `src/lib/api/client.ts`
- State: Zustand stores (`src/stores/`)
- Prompt-first UI, mobile-responsive
- @/* path alias → `./src/*`

### Daemon (Express)
- TypeScript, Express router
- better-sqlite3 for local storage
- Simulation mode wrapper: `withSimulation()` decorator
- Provider pattern: RENDER_REGISTRY in `src/media/`

## Git Conventions

### Branching
- Main branch: `manager` (not `main`)
- Other branches: `Backend`, `appvideo` (remote-only)
- Feature branching expected (based on AGENTS.md rules)

### Commit Messages
- Prefix format: `feat:`, `chore:`, `docs:`, `fix:`
- Single primary committer: `leminhnhutphpwp` (169 commits)
- Also: `@minhnhut99devmacos` (32), `@minhnhut99dev` (5)

### NEVER Unless Asked
- Never commit/push unless explicitly requested
- Never clear database (no migrate:fresh, db:wipe)
- Never run full `db:seed` (DatabaseSeeder) — resets admin user

## Pricing Conventions

### Single Source of Truth
- `PricingCalculator::calculate()` for ALL credit estimation
- `DurationTier::active()` for duration options via `GET /api/v1/pricing/durations`
- Never hardcode duration arrays like `[3, 5, 10, 15, 30]`
- Never hardcode credit formulas in models or controllers

### Credit Formula
- `credits = ceil(VND × exchange_rate)` where exchange_rate = 0.1
- Examples: 500k VND = 50k credits, Pro plan = 24.9k credits

### Rate Limiting
- Middleware: `ThrottleApiRequests`
- Per-plan: free=120, starter=300, pro=600, studio=1000, enterprise=2000 req/min
- Auth routes: 60 req/min

### Adding New Models/Providers (MANDATORY SYNC)
When adding to daemon `models.ts`, must update:
1. `ModelSelector.php` — `getAvailableModels()` and/or `DEFAULT_MODELS`
2. `PricingSystemSeeder.php` — `model_mapping` quality tiers + ProviderPricing

Verify: `node apps/daemon/scripts/verify-media-models.mjs`

## UI Conventions
- Prompt-first: user describes, AI creates
- Dark mode first, Vietnamese language
- Mobile-responsive layout
- Soft glassmorphism, cinematic feel
- Media-centric, low-friction UX
- Lucide icons throughout
