# Security Hardening + Production Scale Optimization — Coordinator Worklog

## Date
2026-05-30

## Overview
Comprehensive security hardening (secrets management, validation) and production-scale optimization (health checks, resource limits, load balancing, Nginx/PHP/MySQL/Redis tuning, Horizon scaling, Docker multi-stage builds) across all services. Prepared the platform for 50k-100k concurrent users.

## Files Changed

### 🔴 Security — Secrets Management
| File | Change |
|------|--------|
| `backend/.env.docker.example` | **NEW** — template with `${VAR:-placeholder}` syntax, safe to commit |
| `backend/.env.example` | Replaced all hardcoded secrets with `change-me` placeholders |
| `backend/.gitignore` | Added `.env.docker` to prevent future commits |
| `backend/.env.docker` | `git rm --cached` — untracked from repo, file kept on disk |
| `backend/docker-compose.yml` | All secrets use `${VAR:-default}` syntax, no hardcoded values |
| `deploy/monitoring/docker-compose.yml` | Grafana password via `${GRAFANA_ADMIN_PASSWORD:?err}` |
| `scripts/deploy.sh` | Added `validate_env()`, `require_git()`, secrets strength validation (16+ chars), weak-default detection, expanded REQUIRED_VARS to 13 variables |
| `scripts/migrate.sh` | Default compose file changed to `docker-compose.dev.yml` for dev safety |

### 🟠 Production — Health Checks
| File | Change |
|------|--------|
| `backend/docker-compose.yml` | Health checks for app, queue, reverb, daemon (node-based), minio, redis |
| `backend/docker-compose.dev.yml` | Fixed daemon health check: `wget` → `node -e http.get()` (alpine compat) |

### 🟠 Production — Resource Limits & Restart
| File | Change |
|------|--------|
| `backend/docker-compose.yml` | `restart: unless-stopped` on all services |
| `backend/docker-compose.yml` | App: 1GB/1CPU, Queue: 1GB/2CPU, MySQL: 1GB/2CPU, Redis: 256MB, Daemon: 2GB/2CPU |

### 🟠 Docker — Multi-stage Build
| File | Change |
|------|--------|
| `backend/Dockerfile` | **REWRITE** — multi-stage (composer-deps → npm-deps → production), layer cache optimization (`composer.json` first), `npm ci`, `php:8.4-fpm`, apt clean |
| `backend/docker/entrypoint.sh` | **NEW** — auto `config:cache`, `route:cache`, `view:cache`, `event:cache` on startup |
| `apps/web/Dockerfile` | **NEW** — multi-stage Next.js 15 production build with standalone output |

### 🟠 Caddy — Load Balancing & Routing
| File | Change |
|------|--------|
| `backend/docker/Caddyfile` | **REWRITE** — single-domain routing: `/`→web, `/api/*`→app (round_robin + health), `/ws/*`→reverb, security headers, gzip+zstd |
| `backend/docker-compose.yml` | Added `web` service (Next.js Docker) |

### 🟡 Nginx — Performance Tuning
| File | Change |
|------|--------|
| `backend/docker/nginx.conf` | **REWRITE** — gzip level 6, static asset cache 1y, fastcgi buffer 128k/256k, keepalive, X-XSS-Protection, Permissions-Policy, hide PHP version |

### 🟡 PHP — OPcache & FPM
| File | Change |
|------|--------|
| `backend/docker/php.ini` | **REWRITE** — OPcache 256MB + JIT 100MB tracing, realpath cache 4MB, session hardening (httponly/secure/sameSite), memory 256MB |
| `backend/docker/php-fpm-www.conf` | **NEW** — dynamic pool max 50 children, backlog 2048, slowlog 10s, request_terminate_timeout 300 |

### 🟡 Supervisor — Fix Conflicts
| File | Change |
|------|--------|
| `backend/docker/supervisord.conf` | Disabled autostart for all queue/scheduler/horizon programs (app container only serves HTTP) |

### 🟡 Horizon — Worker Scaling
| File | Change |
|------|--------|
| `backend/config/horizon.php` | Production: 10+5+8 workers, memory 256-512MB/worker, master memory 128MB |

### 🟡 Database — Connection Pooling
| File | Change |
|------|--------|
| `backend/config/database.php` | Added `PDO::ATTR_PERSISTENT` and `PDO::ATTR_TIMEOUT` (disabled by default, enabled in prod compose) |
| `backend/docker-compose.yml` | `DB_PERSISTENT=true`, MySQL `--max-connections=500`, `--innodb-buffer-pool-size=512M` |

### 🟡 Redis — Auth
| File | Change |
|------|--------|
| `backend/docker-compose.yml` | `--requirepass ${REDIS_PASSWORD}`, health check with auth |

### 🟡 Deploy — Scale
| File | Change |
|------|--------|
| `scripts/deploy.sh` | App replicas: 2 → 6 |
| `apps/web/next.config.ts` | Added `output: 'standalone'` for Docker build |

## Key Decisions
1. **Secrets via env vars, not compose file** — Compose uses `${VAR:-default}`, deploy.sh validates. Compose is NOT the validation layer.
2. **DB_PERSISTENT=false by default** — Persistent connections break Laravel's `RefreshDatabase` test trait. Only enabled in production compose.
3. **App container serves HTTP only** — Moved all queue/scheduler/horizon workers out of app container (they run in dedicated containers). Reduces app memory footprint.
4. **Daemon NOT scaled** — SQLite (better-sqlite3) doesn't support concurrent writes. Multi-instance would corrupt data. Needs MySQL migration before scaling.
5. **Single domain for all services** — Caddy routes `/`→web, `/api/*`→app, `/ws/*`→reverb. No CORS, no mixed content, single TLS cert.

## Verification
- [x] Backend tests: 18/18 passed
- [x] Daemon tsc --noEmit: No errors
- [x] Web tsc --noEmit: No errors
- [x] Model sync: PASS (34 models, 5 providers)
- [x] Docker containers: 8/8 healthy
- [x] migrate.sh seed: OK

## Handoff Notes
- **@web needs to know**: `next.config.ts` now has `output: 'standalone'`. Web Dockerfile uses standalone server.js. API URL via `NEXT_PUBLIC_API_URL` env var.
- **@backend needs to know**: Secrets are now in env vars not files. `deploy.sh` validates before deploy. DB persistent connection only in production.
- **@daemon needs to know**: Daemon not scaled (SQLite limitation). Health check now uses Node built-in http module (no wget dependency).

## Status
✅ Completed
