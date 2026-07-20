# AI Video Platform

AI-native SaaS tạo video viral tự động. Prompt-first, hỗ trợ đa nền tảng (TikTok, Reels, YouTube Shorts).

## Architecture

```
Next.js (port 3000) ──HTTP──► Laravel (Auth, Credits, Queue, Admin)
                                     │
                                     │ (proxy + webhook)
                                     ▼
                             Daemon (port 7456, Express)
```

3 layers: **Web** (Next.js 15 UI), **Backend** (Laravel control plane), **Daemon** (Express media engine, 16 providers).

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS 4, GSAP, Motion |
| Backend | Laravel, JWT, Queue + Horizon, Reverb (WebSocket), Filament Admin |
| Media Engine | Express, better-sqlite3, 16 AI providers (Qwen, Kling, Haiper, Luma, Runway...) |
| Databases | MySQL (Laravel - Docker), SQLite (daemon) |
| Storage | MinIO (dev), Cloudflare R2 (prod) |

## Quick Start

```bash
# Start everything (Docker) — web, backend, daemon
bash scripts/dev.sh start                    # → web on localhost:3000

# Web now runs as a Docker Compose service (apps/web/Dockerfile.dev).
# Apply web code changes: bash scripts/dev.sh restart web
```

## Project Structure

```
├── apps/
│   ├── web/          # Next.js 15 frontend
│   └── daemon/       # Express media engine
├── backend/          # Laravel API
├── scripts/          # dev.sh, deploy.sh, migrate.sh
├── docs/plans/       # Architecture plans
└── .opencode/        # AI agent config
```

## Key Ports

| Service | Port |
|---------|------|
| Web App | 3000 |
| Backend API | 8000 |
| Daemon | 7456 |
| MinIO Console | 9001 |
| Reverb WS | 8080 |

## License

Proprietary
