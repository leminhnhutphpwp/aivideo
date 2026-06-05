# Project Configuration

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS 4, Lucide React, Motion |
| Backend | Laravel 12 (JWT, Queue, Reverb, Filament v5, Shield, Email) |
| Media Engine | Express + better-sqlite3 (apps/daemon) |
| Databases | MySQL (Laravel - Docker container), SQLite (daemon) |
| Queue | Laravel Horizon + Redis (Docker) |
| Realtime | Laravel Reverb (WebSocket, port 8080) |
| Storage | MinIO (dev, port 9000), Cloudflare R2 (prod, bucket `apaiplatform`) |

## Project Paths
| Location | Path |
|----------|------|
| Primary | `/Users/nhut/Documents/AI-Video-Platform/` (host) / `/var/www/AIVideoPaltfom/` (Docker) |
| Mirror (DataSwap) | `/home/minnhut/DataSwap/www/AIVideoPaltfom/` |

## Service Ports
| Service | Port |
|---------|------|
| Backend API | 8000 |
| Web App (Next.js) | 3000 |
| Daemon (Express) | 7456 |
| MinIO Console | 9001 |
| MinIO API | 9000 |
| MySQL (Docker) | 3307 |
| Redis (Docker) | 6380 |
| Reverb (WebSocket) | 8080 |
| Vite HMR | 5173 |

## Docker Containers (backend/docker-compose.dev.yml)
| Container Name | Role |
|---------------|------|
| backend-app-1 | Laravel (PHP-FPM, mounts `backend/` → `/var/www`) |
| backend-daemon-1 | Daemon Express (mounts `apps/daemon` → `/app`, `apps/skills` → `/skills`) |
| backend-queue-1 | Laravel queue worker |
| backend-reverb-1 | WebSocket server |
| backend-vite-1 | Vite HMR |
| backend-mysql-1 | MySQL |
| backend-redis-1 | Redis |
| backend-minio-1 | MinIO S3 |

## Architecture Flow
```
Next.js (port 3000) ──HTTP──► Laravel (Auth, Credits, Plans, Email, Admin)
                                      │
                                      │ (webhook callback)
                                      ▼
                              Daemon (port 7456, Media Gen)
```

- Laravel is **control plane** — auth, credits, queue, admin, email
- Daemon is **execution plane** — media generation with 16 providers
- Web app calls Laravel API for auth/credits/billing, daemon proxy (through Laravel) for media
- Daemon API not exposed to host — only Laravel container reaches it via Docker internal network (`http://daemon:7456`)

## Config Files
| File | Purpose |
|------|---------|
| `backend/.env.example` | Laravel local dev template |
| `backend/.env.docker` | Docker shared infra vars |
| `apps/daemon/.env` | Daemon API keys (private) |
| `apps/daemon/.env.example` | Daemon template |
| `apps/web/.env.local` | Next.js local dev |
| `apps/web/.env.example` | Next.js template |

## API Keys
- Only in `apps/daemon/.env`: DASHSCOPE_API_KEY, CKEY_API_KEY
- NOT in `.env.docker`
