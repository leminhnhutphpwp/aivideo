# AI Video Platform — Apps

```
apps/
├── web/          # Next.js 15 frontend (port 3000, Docker)
├── daemon/       # Express media engine (port 7456, Docker)
├── skills/       # SKILL.md markdown files for prompt enrichment
├── scripts/      # Dev manager (dev.sh)
└── logs/         # Runtime logs
```

## Quick Start

```bash
# Install dependencies
cd web && npm install
cd daemon && npm install

# Start everything (via Docker) — web, daemon, backend
bash scripts/dev.sh start          # → web on http://localhost:3000

# Web and daemon both run in Docker. Apply web changes:
bash scripts/dev.sh restart web
```

## Architecture

```
Frontend (Next.js, port 3000)
    │
    ├── laravel.* ──► Laravel API (Auth, Credits, port 8000)
    │
    └── daemon.*  ──► Laravel Proxy ──► Daemon (Media Gen, Docker)
```

## Key Files

| Path | Purpose |
|------|---------|
| `AGENTS.md` | Agent instructions (this repo uses AI agents) |
| `web/src/lib/api/client.ts` | All API calls (Laravel + Daemon proxy) |
| `daemon/src/server.ts` | Daemon Express routes |
| `daemon/src/skills-loader.ts` | SKILL.md file loader |
| `skills/video-direction/*/SKILL.md` | Video direction presets |
| `scripts/dev.sh` | Dev process manager |

## Developer Notes

- All daemon API calls go through Laravel proxy (`/api/daemon/...`), never direct
- Daemon runs in Docker; skills folder is mounted at `/skills`
- To add a new volume mount, edit `backend/docker-compose.dev.yml` and recreate container
- Skills returning empty? Check daemon logs: `docker logs backend-daemon-1 2>&1 | grep skills-loader`
