# Commands & Workflows — Persistent Memory

## Development Commands

### Unified Script (primary entry point)
```bash
bash scripts/dev.sh setup                    # Install deps + create .env files
bash scripts/dev.sh start [web|backend|daemon]  # Start service(s)  
bash scripts/dev.sh stop [web|backend|daemon]   # Stop service(s)
bash scripts/dev.sh restart [web|backend|daemon] # Restart service(s)
bash scripts/dev.sh status [web|backend|daemon]  # Service status
bash scripts/dev.sh logs [web|backend|daemon|all] # View logs
bash scripts/dev.sh build [backend|web|all]      # Build assets
bash scripts/dev.sh test [daemon]                # Run tests
bash scripts/dev.sh simulate [on|off|status]     # Toggle simulation mode
bash scripts/dev.sh exec backend <cmd>           # Exec into container
```

### Per-Service Quick Start
```bash
# Frontend (host)
cd apps/web && npm run dev                  # → localhost:3000 (with --turbo)

# Backend (Docker)  
cd backend && docker compose -f docker-compose.dev.yml up -d

# Daemon (inside Docker via backend compose)
```

### Backend DB Commands (MUST run inside container)
```bash
docker exec backend-app-1 php artisan migrate
docker exec backend-app-1 php artisan db:seed --class=PricingSystemSeeder
docker exec backend-app-1 php artisan optimize:clear
docker exec backend-app-1 php artisan tinker --execute="echo 1"
```

### Daemon Commands
```bash
cd apps/daemon && npm run build              # Compile TypeScript
cd apps/daemon && npm run dev                # Dev mode (tsx)
cd apps/daemon && npm start                  # Production
cd apps/daemon && npx tsc --noEmit           # Type check
```

### Web Commands
```bash
cd apps/web && npm run dev                   # Dev (with turbo)
cd apps/web && npm run build                 # Production build
cd apps/web && npm run start                 # Production server
cd apps/web && npx tsc --noEmit              # Type check
cd apps/web && npm run lint                  # ESLint
cd apps/web && npm run test                  # Vitest
```

## Testing Commands

### Backend
```bash
docker exec backend-app-1 php artisan test                              # All tests
docker exec backend-app-1 php artisan test --filter="RenderJobPipelineTest|RenderJobTest"  # Focused (18 tests)
```

### Daemon
```bash
cd apps/daemon && npm test                   # Vitest
cd apps/daemon && npx tsc --noEmit           # TypeScript check

# Model sync verification
node apps/daemon/scripts/verify-media-models.mjs
```

### Web
```bash
cd apps/web && npm test                      # Vitest
cd apps/web && npx tsc --noEmit              # TypeScript check
```

## Deploy Commands
```bash
bash scripts/deploy.sh                       # Deploy with auto version
bash scripts/deploy.sh v1.2.3               # Deploy with specific version
bash scripts/migrate.sh                      # Production migrations
bash scripts/migrate.sh backend/docker-compose.dev.yml  # Dev migrations
```

## Restart Triggers

| What changed | Restart command |
|--------------|-----------------|
| Daemon `src/` (TypeScript) | `docker compose -f backend/docker-compose.dev.yml up -d --force-recreate daemon` |
| Daemon `skills/` (SKILL.md) | Same as above |
| Daemon `.env` | Same as above (force recreate, not just restart) |
| Backend PHP (Laravel) | `bash scripts/dev.sh restart backend` |
| Backend Filament theme | `bash scripts/dev.sh build backend` |
| Web `apps/web/` (Next.js) | `bash scripts/dev.sh restart web` |
| Docker compose config | `bash scripts/dev.sh restart` |
| Daemon models.ts (add/remove models) | Daemon restart + run `node apps/daemon/scripts/verify-media-models.mjs` |

## Deploy Checklist
- [ ] `bash scripts/dev.sh build backend` → Filament theme built
- [ ] `bash scripts/dev.sh build web` → Next.js built
- [ ] `node apps/daemon/scripts/verify-media-models.mjs` → PASS
- [ ] `docker exec backend-app-1 php artisan test --filter="RenderJobPipelineTest|RenderJobTest"` → 18/18 PASS
- [ ] `cd apps/daemon && npx tsc --noEmit` → 0 errors
- [ ] `cd apps/web && npx tsc --noEmit` → pre-existing only
- [ ] `docker exec backend-app-1 php artisan migrate` → 0 failures
- [ ] `bash scripts/dev.sh restart` → all healthy
- [ ] Check `backend/storage/logs/laravel.log` for errors
