# Deployment

Production runbook for the AI Video Platform. The prod stack is a single
`docker compose` project behind **Caddy** (automatic HTTPS), driven mostly by one
variable: `DOMAIN`.

Compose file: `backend/docker-compose.yml` (NOT `docker-compose.dev.yml`).

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

```bash
cd backend
# build images and start everything
DOMAIN=$DOMAIN docker compose -f docker-compose.yml up -d --build

# app-init runs migrate --force + seeds PricingSystemSeeder automatically.
# Watch it come up healthy:
docker compose -f docker-compose.yml ps
```

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
