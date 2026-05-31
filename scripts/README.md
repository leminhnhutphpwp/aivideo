# Scripts — AI Video Platform

Unified development and deployment scripts for the AI Video Platform monorepo.

## Structure

```
scripts/
├── lib/
│   ├── common.sh      # Shared utilities (colors, logging, error handling)
│   ├── docker.sh      # Docker Compose helpers
│   └── process.sh     # Process management (PID files, port detection)
├── dev.sh             # Development manager
├── deploy.sh          # Production deployment
├── migrate.sh         # Database migrations
└── README.md          # This file
```

## Quick Start

### Development

```bash
# Setup (install deps + create .env files)
bash scripts/dev.sh setup

# Start all services
bash scripts/dev.sh start

# Start specific service
bash scripts/dev.sh start web
bash scripts/dev.sh start daemon
bash scripts/dev.sh start backend

# View status
bash scripts/dev.sh status
bash scripts/dev.sh status web

# View logs
bash scripts/dev.sh logs web
bash scripts/dev.sh logs daemon
bash scripts/dev.sh logs all

# Stop
bash scripts/dev.sh stop
bash scripts/dev.sh stop web

# Restart
bash scripts/dev.sh restart
bash scripts/dev.sh restart daemon

# Run tests
bash scripts/dev.sh test
bash scripts/dev.sh test daemon

# Monitoring stack
bash scripts/dev.sh start monitoring
bash scripts/dev.sh stop monitoring
bash scripts/dev.sh logs prometheus
bash scripts/dev.sh logs grafana

# Exec into container
bash scripts/dev.sh exec backend
bash scripts/dev.sh exec daemon
```

### Production Deployment

```bash
# Deploy with auto version
bash scripts/deploy.sh

# Deploy with specific version
bash scripts/deploy.sh v1.2.3
```

### Database Migrations

```bash
# Run migrations (production)
bash scripts/migrate.sh

# Run migrations (dev)
bash scripts/migrate.sh backend/docker-compose.dev.yml
```

## Services

| Service | Port | Managed by |
|---------|------|------------|
| daemon | 7456 | Docker |
| web | 3000 | Host (npm) |
| backend | 8000 | Docker |
| mysql | 3307 (dev) / 3306 (prod) | Docker |
| redis | 6380 | Docker |
| minio | 9000/9001 | Docker |
| reverb | 8080 | Docker |
| phpmyadmin | 8081 | Docker |
| prometheus | 9090 | Docker (monitoring) |
| grafana | 3000 | Docker (monitoring) |

## Environment Variables

### Required for Deploy

- `JWT_SECRET`
- `DOMAIN`
- `OD_INTERNAL_API_KEY`
- `OD_WEBHOOK_SECRET`
- `SEPAY_WEBHOOK_TOKEN`
- `DB_NAME`, `DB_USER`, `DB_PASS`, `DB_HOST` (for backups)

## Architecture

```
scripts/dev.sh
├── lib/common.sh      ← Loaded by all scripts
├── lib/docker.sh      ← Docker Compose wrappers
└── lib/process.sh     ← PID/port management (for web app)

scripts/deploy.sh
└── lib/common.sh      ← Colors, logging, validation
```

## Migration Notes

**Old paths → New paths:**

| Old | New |
|-----|-----|
| `backend/scripts/dev.sh` | `scripts/dev.sh` |
| `backend/scripts/deploy.sh` | `scripts/deploy.sh` |
| `backend/scripts/migrate.sh` | `scripts/migrate.sh` |
| `apps/scripts/dev.sh` | `scripts/dev.sh` |
| `apps/scripts/deploy.sh` | `scripts/deploy.sh` |

**Backwards compatibility:** Create symlinks if needed:

```bash
ln -s ../../scripts/dev.sh backend/scripts/dev.sh
ln -s ../../scripts/deploy.sh backend/scripts/deploy.sh
ln -s ../../scripts/migrate.sh backend/scripts/migrate.sh
ln -s ../../scripts/dev.sh apps/scripts/dev.sh
ln -s ../../scripts/deploy.sh apps/scripts/deploy.sh
```

## Troubleshooting

### Port already in use

```bash
# Find what's using the port
lsof -i :3000
# or
ss -tlnp sport = :3000

# Kill the process
bash scripts/dev.sh stop web
# or manually
kill -9 <PID>
```

### Daemon container not starting

```bash
# Check logs
bash scripts/dev.sh logs daemon

# Restart
bash scripts/dev.sh restart daemon

# Check Docker
docker ps -a | grep daemon
docker inspect backend-daemon-1
```

### Web app fails to start

```bash
# Check logs
bash scripts/dev.sh logs web

# Check port
bash scripts/dev.sh status web

# Clean restart
bash scripts/dev.sh stop web
rm -f scripts/.pids
bash scripts/dev.sh start web
```
