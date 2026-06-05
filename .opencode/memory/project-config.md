# Project Configuration — Persistent Memory

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15 (App Router), TypeScript 5, React 18.3, Tailwind CSS 4, GSAP 3.15, Motion 11 |
| **Backend** | Laravel 12, PHP 8.2, JWT (tymon/jwt-auth), Horizon, Reverb (WebSocket), Filament v5 + Shield |
| **Media Engine** | Express 4.19, better-sqlite3, 16 AI providers (Qwen, Kling, Haiper, Luma, Runway, etc.) |
| **Databases** | MySQL 8 (Laravel - Docker), SQLite (daemon) |
| **Storage** | MinIO (dev), Cloudflare R2 (prod, bucket `apaiplatform`) |
| **State** | Zustand 5 (frontend), spatie/laravel-settings (backend) |
| **Testing** | PHPUnit 11 (backend), Vitest (frontend + daemon) |

## Package Managers
- **Backend**: Composer (PHP dependencies)
- **Frontend**: npm (Node dependencies) 
- **Daemon**: npm (Node dependencies)

## Key Dependencies

### Backend (composer.json)
- `laravel/framework: ^12.0` — Core framework
- `filament/filament: ^5.3` — Admin panel
- `php-open-source-saver/jwt-auth: ^2.9` — JWT authentication
- `laravel/horizon: ^5.46` — Queue monitoring
- `laravel/reverb: ^1.10` — WebSocket server
- `spatie/laravel-settings: ^3.7` — System settings
- `awcodes/filament-curator: ^5.0` — File upload picker
- `bezhansalleh/filament-shield: ^4.0` — Role permissions
- `sepayvn/laravel-sepay: ^1.2` — Vietnamese payment gateway
- `laravel/socialite: ^5.27` — Social auth
- `league/flysystem-aws-s3-v3: ^3.34` — S3 storage
- `dedoc/scramble: ^0.13.17` — API docs generation

### Frontend (apps/web/package.json)
- `next: 15.0.3` — React framework
- `react: 18.3.1` — UI library
- `gsap: ^3.15.0` — Animations
- `motion: ^11.11.11` — Framer Motion animations
- `zustand: ^5.0.1` — State management
- `lucide-react: ^0.454.0` — Icons
- `recharts: ^3.8.1` — Charts
- `@xyflow/react: ^12.10.2` — React Flow (storyboard canvas)
- `@dnd-kit/*` — Drag and drop
- `@radix-ui/*` — Headless UI primitives
- `laravel-echo: ^2.3.4` + `pusher-js` — WebSocket client
- `@google/generative-ai` — Gemini AI integration

### Daemon (apps/daemon/package.json)
- `express: ^4.19.2` — HTTP server
- `better-sqlite3: ^12.9.0` — Local database
- `@aws-sdk/client-s3: ^3.1053.0` — S3 storage
- `multer: ^2.1.1` — File uploads
- `undici: ^7.25.0` — HTTP client
- `dotenv: ^16.4.7` — Environment config
- Engine: Node ~24

## Service Ports

| Service | Port | Managed By |
|---------|------|------------|
| Web App (Next.js) | 3000 | Host (npm) |
| Backend API (Laravel) | 8000 | Docker |
| Daemon (Express) | 7456 | Docker |
| MySQL | 3307 (dev) / 3306 (prod) | Docker |
| Redis | 6380 | Docker |
| MinIO API | 9000 | Docker |
| MinIO Console | 9001 | Docker |
| Reverb (WebSocket) | 8080 | Docker |
| phpMyAdmin | 8081 | Docker |
| Vite HMR | 5173 | Docker |
| Prometheus | 9090 | Docker (monitoring) |
| Grafana | 3000 | Docker (monitoring) |

## Project Paths
- **Primary**: `/var/www/AIVideoPaltfom/`
- **Local dev**: `/Users/nhut/Documents/AI-Video-Platform`
- **Mirror (DataSwap)**: `/home/minnhut/DataSwap/www/AIVideoPaltfom/`

## Docker Containers
```
backend-app-1      (Laravel, port 8000)    mounts backend/ → /var/www
backend-daemon-1   (Daemon, port internal)  mounts apps/daemon → /app, apps/skills → /skills
backend-queue-1    (Laravel queue worker) 
backend-reverb-1   (WebSocket, port 8080)
backend-vite-1     (Vite HMR, port 5173)
backend-mysql-1    (MySQL, port 3307)
backend-redis-1    (Redis, port 6380)
backend-minio-1    (S3, port 9000)
```

## Environment Config Files
| File | Purpose |
|------|---------|
| `backend/.env.example` | Laravel local dev template |
| `backend/.env.docker` | Docker shared infra vars (DB_HOST, REDIS_HOST, DAEMON_URL) |
| `backend/.env.docker.example` | Docker template |
| `apps/daemon/.env` | Daemon API keys (PRIVATE - API keys here only) |
| `apps/daemon/.env.example` | Daemon template |
| `apps/web/.env.local` | Next.js local dev |
| `apps/web/.env.example` | Next.js template |

## CI/CD 
- No GitHub Actions or CI configs found
- Manual deploy workflow via `bash scripts/deploy.sh`
