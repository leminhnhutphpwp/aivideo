#!/usr/bin/env bash
# scripts/deploy.sh — Production Deployment
# Usage: bash scripts/deploy.sh [version]
# -------------------------------------------------------------------
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
source "$ROOT/scripts/lib/common.sh"

DATE_TAG="$(date +%Y%m%d-%H%M%S)"
VERSION="${1:-v$DATE_TAG}"

# ──────────────────────────────────────────────────
# Helper: validate required environment variables
# ──────────────────────────────────────────────────
validate_env() {
  local missing=()
  for var in "$@"; do
    if [ -z "${!var:-}" ]; then
      missing+=("$var")
    fi
  done
  if [ ${#missing[@]} -gt 0 ]; then
    log_fail "Missing required environment variables: ${missing[*]}"
  fi
}

require_git() {
  if ! git rev-parse --git-dir &>/dev/null; then
    log_warn "Not a git repository — skipping git tags"
  fi
}

# ──────────────────────────────────────────────────
# 0. Validate
# ──────────────────────────────────────────────────
print_header "AI Video Platform - Deploy $VERSION"

print_section "0. Validate Environment"

REQUIRED_VARS=(
  JWT_SECRET
  DOMAIN
  INTERNAL_API_KEY
  DAEMON_WEBHOOK_SECRET
  SEPAY_WEBHOOK_TOKEN
  DB_PASSWORD
  DB_USERNAME
  DB_DATABASE
  MYSQL_ROOT_PASSWORD
  MINIO_ROOT_USER
  MINIO_ROOT_PASSWORD
  REVERB_APP_KEY
  REVERB_APP_SECRET
)
validate_env "${REQUIRED_VARS[@]}"
require_git
log_info "Environment validated"

# ──────────────────────────────────────────────────
# 0a. Validate secrets are NOT using defaults
# ──────────────────────────────────────────────────
print_section "0a. Validate Secrets Strength"

WEAK_DEFAULTS=(
  "jwt-secret-change-in-production|JWT_SECRET"
  "change-me-to-a-random-string|DAEMON_WEBHOOK_SECRET"
  "od-key|INTERNAL_API_KEY"
  "secret|DB_PASSWORD"
  "app-secret|REVERB_APP_SECRET"
  "app-key|REVERB_APP_KEY"
  "change-me|JWT_SECRET"
)

for entry in "${WEAK_DEFAULTS[@]}"; do
  weak_val="${entry%%|*}"
  var_name="${entry##*|}"
  actual_val="${!var_name:-}"
  if [ "$actual_val" = "$weak_val" ]; then
    log_fail "SECURITY: $var_name is still using default value '$weak_val'. Set a strong random value before deploying."
  fi
done

# Check minimum length for critical secrets
for secret_var in JWT_SECRET DAEMON_WEBHOOK_SECRET INTERNAL_API_KEY DB_PASSWORD MYSQL_ROOT_PASSWORD MINIO_ROOT_PASSWORD REVERB_APP_SECRET; do
  val="${!secret_var:-}"
  if [ ${#val} -lt 16 ]; then
    log_fail "SECURITY: $secret_var is too short (${#val} chars). Use at least 32 characters."
  fi
done

log_info "All secrets validated — no weak defaults detected"

# Verify model consistency
print_section "0b. Verify Models"
if node "$ROOT/apps/daemon/scripts/verify-media-models.mjs"; then
  log_info "Models in sync"
else
  log_warn "Model drift detected — deploy continues but verify before next release"
fi

# ──────────────────────────────────────────────────
# 1. Backup
# ──────────────────────────────────────────────────
print_section "1. Database Backup"

DB_NAME="${DB_NAME:-production_video}"
DB_USER="${DB_USER:-app}"
DB_PASS="${DB_PASS:-secret}"
DB_HOST="${DB_HOST:-localhost}"
BACKUP_DIR="$ROOT/scripts/backups"
mkdir -p "$BACKUP_DIR"

if command -v mysqldump &>/dev/null; then
  BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${DATE_TAG}.sql.gz"
  if mysqldump -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" 2>"${BACKUP_FILE%.gz}.err" | gzip > "$BACKUP_FILE"; then
    rm -f "${BACKUP_FILE%.gz}.err"
    log_info "Backup saved: $BACKUP_FILE"
    print_kv "File" "$BACKUP_FILE"
    print_kv "Database" "$DB_NAME"
  else
    log_warn "Backup failed"
    [ -f "${BACKUP_FILE%.gz}.err" ] && log "$(cat "${BACKUP_FILE%.gz}.err")"
    rm -f "${BACKUP_FILE%.gz}.err" "$BACKUP_FILE"
  fi
else
  log_warn "mysqldump not found - skipping backup"
fi

# ──────────────────────────────────────────────────
# 2. Tag Release
# ──────────────────────────────────────────────────
print_section "2. Git Tag"

git tag -a "$VERSION" -m "Deploy $VERSION" 2>/dev/null && \
  log_info "Tag created: $VERSION" || \
  log_warn "Tag $VERSION already exists"

# ──────────────────────────────────────────────────
# 3. Build Daemon
# ──────────────────────────────────────────────────
print_section "3. Build Daemon Docker Image"

cd "$ROOT/apps/daemon"
npm ci --silent && log "Dependencies installed"
npm run build && log "Build completed"
docker build -t ai-video-daemon:"$VERSION" . && log_info "Image built"
docker tag ai-video-daemon:"$VERSION" ai-video-daemon:latest && log "Tagged as latest"
print_kv "Image" "ai-video-daemon:$VERSION"

# ──────────────────────────────────────────────────
# 4. Build Web App
# ──────────────────────────────────────────────────
print_section "4. Build Web App"

cd "$ROOT/apps/web"
npm ci --silent && log "Dependencies installed"
cp -n .env.example .env 2>/dev/null || true
npm run build && log_info "Web app built"

# ──────────────────────────────────────────────────
# 5. Deploy with Docker Compose
# ──────────────────────────────────────────────────
print_section "5. Deploy with Docker Compose"

cd "$ROOT"
export VERSION_TAG="$VERSION"

docker compose -f backend/docker-compose.yml up -d --build \
  --scale app=6 \
  --scale queue=1 \
  --scale scheduler=1 \
  --scale reverb=1
log_info "Docker Compose started"

print_kv "app" "6 replicas"
print_kv "queue" "1 replica"
print_kv "scheduler" "1 replica"
print_kv "reverb" "1 replica"

# ──────────────────────────────────────────────────
# 6. Run Migrations
# ──────────────────────────────────────────────────
print_section "6. Database Migrations"

MIGRATE_CONTAINER=$(docker ps --filter "name=app" --format "{{.Names}}" | head -1)
if [ -n "$MIGRATE_CONTAINER" ]; then
  docker exec "$MIGRATE_CONTAINER" php artisan migrate --force && \
    log_info "Migrations completed" || \
    log_warn "Migration failed"
fi

# ──────────────────────────────────────────────────
# 7. Health Checks
# ──────────────────────────────────────────────────
print_section "7. Health Checks"

check() {
  local url="$1"
  local label="$2"
  for i in $(seq 1 15); do
    if curl -sf "$url" >/dev/null 2>&1; then
      log_info "$label"
      print_kv "URL" "$url"
      return 0
    fi
    sleep 2
  done
  log_warn "$label failed after 30s"
  print_kv "URL" "$url"
  return 1
}

check "http://localhost:8000/api/health" "Laravel API" || true
check "http://localhost:8000/api/daemon/health" "Daemon (via Laravel)" || true
check "http://localhost:3001" "Web App" || true

# ──────────────────────────────────────────────────
# 8. Deploy Monitoring Stack
# ──────────────────────────────────────────────────
print_section "8. Deploy Monitoring Stack"

if [ -f "$ROOT/deploy/monitoring/docker-compose.yml" ]; then
  docker compose -f "$ROOT/deploy/monitoring/docker-compose.yml" up -d && \
    log_info "Monitoring stack deployed" || \
    log_warn "Monitoring stack deployment failed"
  print_kv "Prometheus" "http://localhost:9090"
  print_kv "Grafana" "http://localhost:3001"
fi

# ──────────────────────────────────────────────────
# 9. Push Git Tag
# ──────────────────────────────────────────────────
print_section "9. Push Git Tag"

git push origin "$VERSION" 2>/dev/null && \
  log_info "Tag pushed to remote" || \
  log_warn "Tag push skipped"

# ──────────────────────────────────────────────────
# Complete
# ──────────────────────────────────────────────────
echo ""
print_header "Deployment Complete"
echo ""
print_line "="
printf "${BOLD}Services${RESET}\n"
print_line "-"
print_kv "Laravel" "http://localhost:8000"
print_kv "Web" "http://localhost:3001"
print_kv "Daemon" "http://localhost:7456 (internal)"
print_kv "Prometheus" "http://localhost:9090"
print_kv "Grafana" "http://localhost:3001"
print_line "="
echo ""
print_subsection "Rollback Instructions"
printf "  ${DIM}docker compose -f backend/docker-compose.yml down${RESET}\n"
printf "  ${DIM}git checkout <previous-tag>${RESET}\n"
printf "  ${DIM}bash scripts/deploy.sh <previous-tag>${RESET}\n"
echo ""
