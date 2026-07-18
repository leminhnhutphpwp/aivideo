# AI Video Platform

Laravel 12 backend for an AI Video Generation SaaS platform.

```
Control Plane     Execution Plane     Compute Plane
(Laravel)    ◄──► (Open Design)   ◄──► (Seedance / Runway / HunyuanVideo)
Auth · Credits     Video Workflow      GPU / API
Billing · Admin    AI Agents           FFmpeg
Queue · Storage    Preview System
```

## Quick Start

```bash
# Dev
scripts/dev.sh up
scripts/dev.sh exec php artisan migrate --force
scripts/dev.sh exec php artisan db:seed --force

# → http://localhost:8000
```

## Docs

| File | Description |
|------|-------------|
| [docs/development.md](docs/development.md) | Docker dev & local dev setup |
| [docs/production.md](docs/production.md) | Production deployment |
| [AGENTS.md](AGENTS.md) | Agent guide for AI coding assistants |

## Scripts

| Script | Usage |
|--------|-------|
| `scripts/dev.sh` | `up`, `down`, `exec`, `logs`, `build`, `restart` |
| `scripts/deploy.sh` | `build`, `up`, `down`, `logs` (production) |
| `scripts/migrate.sh` | Run migrations + seeders |

## API

Base URL: `http://localhost:8000/api`

- `POST /api/auth/register`, `POST /api/auth/login`
- `GET /api/plans`, `GET /api/render-jobs`, `GET /api/assets`
- `POST /api/credits/purchase`, `POST /api/render-jobs`

Full docs: `http://localhost:8000/docs/api`

## Admin

Filament panel at `http://localhost:8000/admin`.

## Features

| Feature | Status |
|---------|--------|
| JWT Authentication | ✅ |
| Plans (Free / Pro / Studio) | ✅ |
| Credit system (reserve/capture/refund) | ✅ |
| SEPay billing (VNĐ) | ✅ |
| Video generation (Seedance / Runway / Pika / Kling) | ✅ |
| Real-time job progress (Laravel Reverb) | ✅ |
| Queue (Horizon) | ✅ |
| Filament admin | ✅ |
| API keys | ✅ |
| Activity logging | ✅ |
| Docker dev (8 services) | ✅ |
| Docker production (12 services + Caddy HTTPS) | ✅ |

## License

MIT
