# AI Video Platform — Apps Agent Guide

> **⚠️ MANDATORY — Strictly enforced**:
> This agent handles **ONLY** `apps/web/` (Next.js) and `apps/daemon/` (media engine).
> **DO NOT** touch `backend/` (Laravel) — that belongs to a different agent.
> See `backend/worklogs/` for backend agent's handoff notes (new API endpoints, etc.).

## Cross-References

| Purpose | Path |
|---------|------|
| Architecture | `docs/architecture.md` |
| Conventions | `docs/conventions.md` |
| OpenCode skills | `.opencode/skills/` |
| Laravel backend — DO NOT EDIT | `backend/` |
| Backend work logs (handoff) | `backend/worklogs/` |
| Daemon project | `apps/daemon/AGENTS.md` |
| Web project | `apps/web/AGENTS.md` |

## Mission

Build an **AI Video Platform** — a prompt-first, AI-native SaaS for video generation, targeting Vietnamese users.

## Architecture

```
Frontend (Next.js 15 + Tailwind, port 3000)
    │
    ├── laravel.* ──► Laravel (Auth, Credits, Plans, Email)
    │
    ├── daemon.*  ──► Laravel Proxy (/api/daemon/...) ──► Daemon (Media Gen, port 7456)
    │
    └── WebSocket ──► Laravel Reverb (Realtime progress)
```

Laravel is control plane AND proxy to the daemon.
The daemon API is NOT exposed to the host — only the Laravel container can reach it via Docker internal network (`http://daemon:7456`).
The frontend calls `daemon.*` methods in `client.ts` which go through `daemonLaravel()` → `laravelRequest()` → `GET /api/daemon/...` → Laravel proxy → `http://daemon:7456/api/...`.

## Product Rules

1. Prompt-first UI — user describes, AI creates.
2. Prioritize media generation flows: `image`, `video`, `audio`.
3. Mobile-responsive, dark mode first, Vietnamese language.
4. Reliability over breadth: fewer features, fully working.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), TypeScript |
| Styling | Tailwind CSS 4 |
| Icons | Lucide React |
| Backend | Laravel (JWT, Queue, Reverb, Email) |
| Media Engine | Daemon (Express, port 7456) |

## Guidelines

1. Follow `.opencode/rules/coding-rules/` for coding conventions.
2. Small, verifiable patches. Typecheck after each change.
3. When adding features that need Laravel API changes, stop and notify — that requires the backend agent.
4. See `docs/conventions.md` for full coding standards.

## Handoff from Backend Agent

New Laravel API endpoints ready for the web app:

### Forgot Password Flow
- `POST /api/auth/forgot-password` — body: `{ email }` → sends OTP, returns `{ message, expires_in }`
- `POST /api/auth/verify-reset-code` — body: `{ email, code }` → returns `{ message, token }`
- `POST /api/auth/reset-password` — body: `{ email, token, password, password_confirmation }`

### Email Verification Flow
- `POST /api/auth/send-verification` — body: `{}` (auth required) → sends OTP, returns `{ message, expires_in }`
- `POST /api/auth/verify-email` — body: `{ code }` (auth required) → verifies email, returns `{ message }`

## Docker Development Environment

Daemon and Laravel run inside Docker containers via `backend/docker-compose.dev.yml`.

### Container Layout

```
backend-app-1      (Laravel, port 8000)    mounts  backend/ → /var/www
backend-daemon-1   (Daemon, port internal)  mounts  apps/daemon → /app, apps/skills → /skills
backend-queue-1    (Laravel queue worker)
backend-reverb-1   (WebSocket, port 8080)
backend-mysql-1    (MySQL, port 3307)
backend-redis-1    (Redis, port 6380)
backend-minio-1    (S3, port 9000)
```

### Key Commands

```bash
# Restart daemon after code changes
docker compose -f backend/docker-compose.dev.yml up -d --force-recreate daemon

# Restart backend
bash scripts/dev.sh restart backend

# Restart web
bash scripts/dev.sh restart web

# Check daemon logs
docker logs backend-daemon-1 2>&1 | tail -20
```

### Environment Variable Precedence

Docker-compose.yml sets `DAEMON_URL: http://daemon:7456` which takes precedence over `.env` file.
To check actual value: `docker exec backend-app-1 php artisan tinker --execute="echo config('daemon.base_url') . PHP_EOL;"`

### Debugging Skills API

If skills API returns empty:
1. Check daemon logs: `docker logs backend-daemon-1 2>&1 | grep skills-loader`
2. Verify skills mount: `docker inspect backend-daemon-1 | jq '.[].Mounts'`
3. Restart daemon: `docker compose -f backend/docker-compose.dev.yml up -d --force-recreate daemon`
