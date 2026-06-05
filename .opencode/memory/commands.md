# Development Commands

## Service Management
```bash
# Start all services
bash scripts/dev.sh start

# Start specific service
bash scripts/dev.sh start backend
bash scripts/dev.sh start daemon
bash scripts/dev.sh start web

# Restart service after code changes
bash scripts/dev.sh restart backend     # Laravel PHP changes
bash scripts/dev.sh restart web         # Next.js changes

# Build assets
bash scripts/dev.sh build backend       # Filament theme (inside Docker)
bash scripts/dev.sh build web           # Next.js production build
bash scripts/dev.sh build all           # Build all

# Status & Logs
bash scripts/dev.sh status
bash scripts/dev.sh logs backend
bash scripts/dev.sh logs all
```

## Docker Commands
```bash
# Laravel commands (must run inside container)
docker exec backend-app-1 php artisan test
docker exec backend-app-1 php artisan migrate
docker exec backend-app-1 php artisan db:seed --class=SpecificSeeder
docker exec backend-app-1 php artisan optimize:clear
docker exec backend-app-1 php artisan tinker

# Daemon restart (TypeScript changes)
docker compose -f backend/docker-compose.dev.yml up -d --force-recreate daemon

# Full restart
bash scripts/dev.sh restart
```

## Testing
```bash
# Backend tests (in Docker)
docker exec backend-app-1 php artisan test
docker exec backend-app-1 php artisan test --filter="RenderJobPipelineTest|RenderJobTest"
docker exec backend-app-1 php artisan test --filter="Storyboard"

# TypeScript compilation
cd apps/web && npx tsc --noEmit
cd apps/daemon && npx tsc --noEmit

# Model sync verification
node apps/daemon/scripts/verify-media-models.mjs

# Daemon unit tests
cd apps/daemon && npm test
```

## Simulation Mode
```bash
bash scripts/dev.sh simulate on       # Enable simulation mode
bash scripts/dev.sh simulate off      # Disable simulation mode
bash scripts/dev.sh simulate status   # Check status
```

## Development Servers
```bash
cd apps/web && npm run dev        # Next.js dev server → localhost:3000
cd apps/daemon && npm run dev     # Daemon dev (tsx) → localhost:7456

# Daemon production
cd apps/daemon && npm run build && npm start
```

## Migration & Deploy
```bash
bash scripts/deploy.sh            # Production deployment
bash scripts/migrate.sh           # Database migrations
```

## Exec into Containers
```bash
bash scripts/dev.sh exec backend php artisan <command>
```
