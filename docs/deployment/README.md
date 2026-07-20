# Deployment

Production runbook for the AI Video Platform. The prod stack is a single
`docker compose` project behind **Caddy** (automatic HTTPS), driven mostly by one
variable: `DOMAIN`.

Compose file: `backend/docker-compose.yml` (NOT `docker-compose.dev.yml`).

---

## 0. 🔴 Zero-downtime is mandatory

Every redeploy / new build MUST NOT cause downtime — the system stays live throughout:

- Users see no errors, no stalls, no dropped sessions; the API and realtime never cut out.
- **The image BUILD (the slow step) must never block the system** — the old containers keep
  serving 100% while the new image builds.
- Only **swap** to the new version once its image is built **and health-checks pass**.
- **NEVER `docker compose down`** (stops the whole stack = downtime). Use selective `up -d --no-deps`,
  or blue-green.
- **Stateful services** (mysql, redis, minio) are **never recreated** on an app deploy — volumes persist.

If a change can't be zero-downtime (e.g. a destructive migration), split it out (expand→contract,
see §5b). Never bundle it with a code deploy. The update procedure that implements all this is **§5b**.

---

## 1. Topology (single domain, path-based)

Caddy terminates TLS and routes everything on one hostname:

| Path | Upstream | Service |
|------|----------|---------|
| `/` (catch-all) | `web:3000` | Next.js web app (incl. `/studio/*` builder pages) |
| `/api/*` | `app:80` | Laravel API (control plane) |
| `/ws/*` | `reverb:8080` | Reverb websockets (realtime) |

The **media daemon is never exposed publicly** — the web app reaches it only through
the Laravel proxy (`/api/*`). It has no Caddy route by design.

Other prod services: `queue` (Horizon), `scheduler` (`schedule:work`), `mysql`,
`redis`, `minio` (+ `minio-setup`), `app-init` (runs `migrate --force` + seeds
`PricingSystemSeeder` once), `phpmyadmin` (bound to `127.0.0.1` only).

---

## 2. Prerequisites

- A Linux host with Docker + Docker Compose, ports **80 and 443 open** to the internet
  (Caddy needs them for Let's Encrypt HTTP-01 + serving).
- A domain you control.
- Real credentials for: database, redis, JWT, Reverb, object storage, the
  Laravel↔daemon shared secrets, the LLM key, and each enabled AI media provider.

---

## 3. Domain setup

Everything keys off `DOMAIN`. Setting it once propagates to `APP_URL`, the web app's
`NEXT_PUBLIC_API_URL=https://$DOMAIN/api`, Reverb (`wss://$DOMAIN/ws`), and the Caddy
cert.

1. **DNS**: create an `A` record (and `AAAA` if you have IPv6) for `yourdomain.com` →
   your server's public IP.
   - On **Cloudflare**: start with **DNS-only (grey cloud)** so Caddy can complete the
     Let's Encrypt HTTP-01 challenge. (If you want the orange proxy, you must switch
     Caddy to a DNS-01 challenge — more setup; do it later.)
2. **Open firewall** ports 80 + 443.
3. Set `DOMAIN=yourdomain.com` in the prod `.env` (next step).
4. Bring the stack up — Caddy auto-provisions and renews the TLS cert. No manual certs.

> Want split subdomains (`api.`, `app.`)? That requires editing `backend/docker/Caddyfile`
> (separate site blocks) + `NEXT_PUBLIC_API_URL` + CORS. Single-domain is simpler and is
> the supported default — prefer it for the first deploy.

---

## 4. Secrets checklist

Create an `.env` next to `backend/docker-compose.yml` (compose reads `${VAR}` from it).
**None of these may keep their `change-me`/empty defaults in production.**

```dotenv
# Domain & app
DOMAIN=yourdomain.com

# Auth
JWT_SECRET=<openssl rand -base64 32>

# Database
DB_DATABASE=production_video
DB_USERNAME=app
DB_PASSWORD=<strong>
MYSQL_ROOT_PASSWORD=<strong>

# Redis
REDIS_PASSWORD=<strong>

# Realtime (Reverb)
REVERB_APP_ID=<id>
REVERB_APP_KEY=<key>
REVERB_APP_SECRET=<secret>

# Object storage (MinIO defaults; see §6 for Cloudflare R2)
MINIO_ROOT_USER=<user>
MINIO_ROOT_PASSWORD=<strong>
AWS_BUCKET=production-video

# Laravel <-> daemon
INTERNAL_API_KEY=<shared>
DAEMON_WEBHOOK_SECRET=<shared HMAC secret>

# LLM prompt compiler (REQUIRED — prod has no simulation)
CKEY_API_KEY=<key>

# Payments
SEPAY_WEBHOOK_TOKEN=<token>

# AI media providers — one key per enabled provider (Qwen/Wan, Kling, …)
# (set in the daemon's environment / provider config)
```

Generate secrets with `openssl rand -base64 32`. Never commit `.env`.

---

## 5. Deploy

### 5a. First deploy (initial bring-up)

Nothing is running yet, so a plain build-and-up is fine here.

```bash
cd backend
# Project name — scopes ALL containers/networks/volumes so multiple deployments can
# coexist on ONE host without colliding. Set STACK_NAME per deployment (unique per
# project/tenant); it defaults to "aivideo" if unset. Put it in backend/.env so every
# subsequent `docker compose` command targets the same stack.
echo "STACK_NAME=aivideo-prod" >> .env   # or aivideo-clientA, etc.

# build images and start everything
DOMAIN=$DOMAIN docker compose -f docker-compose.yml up -d --build

# app-init runs migrate --force + seeds PricingSystemSeeder automatically.
# Watch it come up healthy:
docker compose -f docker-compose.yml ps
```

> **Multi-deployment on one server**: give each deployment a distinct `STACK_NAME`
> (e.g. `aivideo-clientA`, `aivideo-clientB`). Containers become `aivideo-clientA-app-1`,
> volumes `aivideo-clientA_mysql_data`, etc. — fully isolated. No service is shared; each
> stack runs its own mysql/redis/minio/caddy. Renaming an existing stack's `STACK_NAME`
> orphans its named volumes (data), so pick it once at first deploy.

### 5b. Update / redeploy (zero-downtime) — see §0

The build runs while the old containers keep serving; only the fast swap follows. Do **not**
use `up -d --build` for updates (it builds + recreates in one blocking step).

```bash
cd backend
git -C .. pull origin main

# 1) BUILD new images — old containers keep serving; ZERO downtime during the (slow) build
DOMAIN=$DOMAIN docker compose -f docker-compose.yml build

# 2) Migrate FIRST, backward-compatible (expand→contract, below)
docker compose -f docker-compose.yml run --rm app php artisan migrate --force

# 3) SWAP — recreate ONLY the app-layer services; --no-deps leaves mysql/redis/minio/caddy untouched
DOMAIN=$DOMAIN docker compose -f docker-compose.yml up -d --no-deps app web daemon reverb queue scheduler

# 4) Workers pick up new code gracefully (finish current job first, no kill)
docker compose -f docker-compose.yml exec app php artisan queue:restart

# 5) Prune old images
docker image prune -f
```

The long build phase is **0 downtime**; the swap is a few seconds per recreated service (stateful
services + Caddy stay up untouched).

**Backward-compatible migrations (required).** During the swap old + new code run together, so the
schema must satisfy both — **expand → contract**:
1. *Expand* (this deploy): add only — new columns/tables **nullable or with a default**, new indexes.
   If renaming a field, write both old + new for now.
2. *Contract* (a later deploy, after the old version is fully gone): drop/rename the old column.
- Never `change`/drop/rename a live column in the same deploy as the code that stops using it.
- Never `migrate:fresh` / `db:wipe` (project rule — real data).

**Absolute zero-downtime (blue-green).** §5b's swap is seconds-level. For a truly seamless swap you
need two stacks (`STACK_NAME=aivideo-blue` / `-green`) behind a **front proxy above the stacks** —
deploy to the idle color, health-check it, repoint the proxy, keep the old for instant rollback.
This needs a shared front proxy (the current Caddy runs *inside* each stack on 80/443, so two stacks
can't both bind those) — treat as a follow-up if seconds-level swap is not acceptable.

### Post-deploy verification
- `https://$DOMAIN/api/health` → `200`.
- `https://$DOMAIN/` loads the web app; `/studio/storyboard/flow` opens the builder.
- Realtime: a render's progress updates live (Reverb over `wss://$DOMAIN/ws`).
- One end-to-end render with a **real** provider completes (prod has no simulation —
  `MEDIA_ALLOW_STUBS=0`).
- `docker compose logs caddy` shows a certificate was obtained for `$DOMAIN`.

---

## 6. Storage: MinIO vs Cloudflare R2

The compose defaults to **self-hosted MinIO** (`AWS_ENDPOINT=http://minio:9000`,
auto-created bucket). To use **Cloudflare R2** instead (the bucket referenced elsewhere
as `apaiplatform`), point the S3 vars at R2 and drop the `minio`/`minio-setup` services:
set `AWS_ENDPOINT=https://<account>.r2.cloudflarestorage.com`, R2 access keys, and the
bucket. Pick one and keep it consistent across `app`, `queue`, and the daemon.

---

## 7. Monitoring (optional)

A separate stack lives in `deploy/monitoring/` (Prometheus, Grafana, Loki, Promtail,
alerts). Bring it up independently with its own compose file once the app is healthy.

---

## 8. Readiness gaps (fix before calling it production)

- [ ] All secrets set (no `change-me`/empty) — see §4. **Blocker.**
- [ ] Real AI provider keys configured and one live render verified.
- [ ] Decide MinIO vs R2 (§6) and align all services.
- [ ] Database backups + a tested restore. **Use `scripts/backup.sh`** (dumps MySQL from the
      compose `mysql` service, gzips to `./backups`, rotates by `RETENTION_DAYS`, optional offsite
      via `RCLONE_REMOTE`). Schedule via host crontab, e.g. daily at 03:00 with 14-day retention +
      offsite to R2:
      `0 3 * * * cd /path/to/AI-Video-Platform && RETENTION_DAYS=14 RCLONE_REMOTE=r2:apaiplatform-backups bash scripts/backup.sh db >> scripts/logs/backup.log 2>&1`
      Then **verify** once: `bash scripts/backup.sh restore backups/db-<tag>.sql.gz` into a staging DB.
- [ ] Log rotation / disk monitoring for `caddy_data`, `mysql_data`, `od_data`, MinIO.
- [ ] Load/sizing check against the `mem_limit`/`cpus` in compose.
- [ ] CI/CD (currently manual `up --build`).

The infra scaffolding (compose, Caddy auto-HTTPS, Horizon, auto-migrate/seed, real-provider
daemon with ffmpeg baked into its image) is in place; the items above are what stand between
"runs" and "production-ready".
