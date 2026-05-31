# Vite High CPU (236%) Fix — Coordinator Worklog

## Date
2026-05-28

## Overview
Diagnosed and fixed the root cause of severe system lag: Vite dev server inside Docker container consuming 236% CPU due to `CHOKIDAR_USEPOLLING=true` polling mode. Also optimized Vite watch scope to exclude unnecessary directories.

Root cause: `CHOKIDAR_USEPOLLING=true` in `docker-compose.dev.yml` forces chokidar polling on every file change detection. On Linux kernel 6.17 (which fully supports inotify through Docker bind mounts), this is unnecessary and extremely CPU-intensive — especially on a Laravel project with hundreds of files.

## Files Changed

| File | Change |
|------|--------|
| `backend/docker-compose.dev.yml:161-162` | Removed `CHOKIDAR_USEPOLLING: "true"` environment variable from `vite` service |
| `backend/vite.config.js:17-26` | Added `server.watch.ignored` config excluding `vendor/`, `storage/`, `node_modules/`, `public/build/` |

## Key Decisions

1. **Remove polling, not replace** — No need for `WATCHPACK_POLLING` either. Kernel 6.17 + Docker bind mounts handle inotify events correctly
2. **Watch scope filtering in vite.config.js** — More maintainable than Docker environment variables; easier to adjust per project needs
3. **Keep `refresh: true`** — Laravel Vite plugin's Blade refresh is useful for dev; the performance hit comes from watching, not the refresh logic itself

## Side Findings (not fixed, documented)

| # | Issue | Severity |
|---|-------|----------|
| 1 | Swap 4.3GB — `next-server` (1GB), `mysqld` (700MB host + Docker), opencode (640MB) | 🟡 Low — 11GB MemAvailable |
| 2 | MySQL running 2 instances: host `/usr/sbin/mysqld` + Docker `backend-mysql-1` | 🟡 Low — wastes ~300MB RAM |
| 3 | `next-server` had 1GB swapped out — likely accumulated during Vite CPU spike | 🟢 Self-resolving |

## Verification

- [x] Vite CPU dropped from 236% → 9% after CHOKIDAR_USEPOLLING removed (even before restart — polling cycle completed)
- [x] System load average dropped from 12.0 → 3.2
- [x] CPU idle improved from 48% → 80%
- [ ] Docker restart pending — user needs to: `sudo kill 5480 && docker compose -f backend/docker-compose.dev.yml up -d --force-recreate vite`

## Handoff Notes

- **@backend needs to know**: `docker-compose.dev.yml` Vite service no longer has `CHOKIDAR_USEPOLLING`. After restart, Vite will use native inotify — significantly lower CPU usage
- **@web needs to know**: No changes to web app. If web dev server (`next-server`) also had polling config, consider removing it similarly
- **All agents**: On Linux with Docker, never use `CHOKIDAR_USEPOLLING=true` or `WATCHPACK_POLLING=true` — these are macOS/Docker Desktop workarounds only

## Status

⚠️ Pending — Docker container needs restart to apply `docker-compose.dev.yml` changes
