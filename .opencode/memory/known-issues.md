# Known Issues & Solutions — Persistent Memory

## Skills API Returns Empty

**Symptom**: `{"video_directions":[],"contract":null,...}` when calling daemon skills API

**Root Causes**:
1. Missing `/skills` volume mount in `docker-compose.dev.yml` — daemon container can't find SKILL.md files
2. Daemon not restarted after code changes to `skills-loader.ts`

**Diagnostics**:
```bash
docker logs backend-daemon-1 2>&1 | grep skills-loader
# Expected: "Resolved skills root: /skills" + "Loaded 5 skills from video-direction"
# If you see "Directory not found: /skills/video-direction" → missing volume mount
```

**Fix**: Add volume mount to `backend/docker-compose.dev.yml` daemon service:
```yaml
daemon:
  volumes:
    - ../apps/daemon:/app
    - ../apps/skills:/skills    # ← this fixes it
```
Then: `docker compose -f docker-compose.dev.yml up -d --force-recreate daemon`

## Laravel Proxy vs Direct Daemon Returns Different Data

**Symptom**: `/api/daemon/...` (via Laravel proxy) returns different data than direct `http://127.0.0.1:7456/...`

**Root Causes**:
1. Different daemon instances — one on host (port 7456), one in Docker
2. Docker networking: Laravel connects via `http://daemon:7456` (Docker service discovery), NOT `localhost:7456`
3. Missing volume mounts in Docker daemon

**Rule of thumb**: Only the Docker daemon (`backend-daemon-1`) is the "real" one. Kill any stray host daemons:
```bash
lsof -i :7456 | grep LISTEN
kill <PID>  # kill host daemon if found
```

**Debugging flow**:
1. Check daemon container logs: `docker logs backend-daemon-1 2>&1 | tail -20`
2. Test endpoint inside container: `docker exec backend-daemon-1 wget -qO- http://localhost:7456/api/media/skills`
3. Compare response sizes — direct daemon ~18KB, empty proxy response = 71 bytes

## Database Commands on Host Don't Affect Container

**Symptom**: Running `php artisan migrate` or `php artisan db:seed` on host has no effect

**Root Cause**: Backend MySQL runs inside Docker container — host PHP cannot reach it

**Fix**: Always run database commands INSIDE the container:
```bash
docker exec backend-app-1 php artisan migrate
docker exec backend-app-1 php artisan db:seed --class=SpecificSeeder
docker exec backend-app-1 php artisan optimize:clear
```

## Pre-existing Test Failures (NOT our bugs)
These tests fail regardless of our changes:
- `CreditApiTest` — pre-existing failures
- `SocialiteTest` — pre-existing failures  
- `SecurityTest` — pre-existing failures

Always target: `--filter="RenderJobPipelineTest|RenderJobTest"` for relevant tests (18 tests)

## Web PID File Issues
- Web app process tracked via `scripts/.pids` file
- If web fails to start: `bash scripts/dev.sh stop web && rm -f scripts/.pids && bash scripts/dev.sh start web`

## Environment Variable Audit (June 2026)
- Full audit completed 2026-06-04 across all 8 env files
- Fixed: `NEXT_PUBLIC_SITE_URL` missing from web `.env`
- Fixed: 17 missing vars in backend `.env.example`
- Fixed: `SIMULATION_MODE` missing from `.env.docker.example`
- Fixed: 14 documented vars missing from daemon `.env` and `.env.example`
- No `NEXT_PUBLIC_API_URL` traces remain

## Model Sync Issues
- Daemon `models.ts` is source of truth but Laravel has copies in `ModelSelector.php` and `PricingSystemSeeder.php`
- After adding models to daemon, must manually sync Laravel files
- Run `node apps/daemon/scripts/verify-media-models.mjs` to check sync status
- Run `docker exec backend-app-1 php artisan db:seed --class=PricingSystemSeeder` to update pricing
- ⚠️ Do NOT run full `db:seed` — will reset admin user

## Storyboard Mode Issues
- `'storyboard_image'` was missing from render_mode union in `storyboard-types.ts` (fixed 2026-06-04)
- `Storyboard::calculateCreditsCost()` initially fell into multi-scene pricing for storyboard_image (fixed)
- Viewer page render fails if `compiled_prompt` is empty — auto-compile added as safety net

## Pricing Issues
- Quality tier multiplier was 1.0 for all tiers (standard/premium/ultra) — no differentiation (fixed)
- HappyHorse margin was negative (-25% to -42%) for short videos (fixed)
- DurationTier multipliers were flat — now increase 10%→50% (fixed)
