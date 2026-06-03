#!/usr/bin/env bash
# scripts/dev.sh — Unified Development Manager
# Usage: bash scripts/dev.sh <command> [service] [port]
# -------------------------------------------------------------------
set -eo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
source "$ROOT/scripts/lib/common.sh"
source "$ROOT/scripts/lib/docker.sh"
source "$ROOT/scripts/lib/process.sh"

# Default ports
DAEMON_PORT=7456
WEB_PORT=3000
BACKEND_PORT=8000

# Parse arguments
CMD="${1:-status}"
SERVICE="${2:-all}"
PORT="${3:-}"

MONITORING_COMPOSE="$ROOT/deploy/monitoring/docker-compose.yml"

# Service directories
get_service_dir() {
  case "$1" in
    daemon)     echo "$ROOT/apps/daemon" ;;
    web)        echo "$ROOT/apps/web" ;;
    backend)    echo "$ROOT/backend" ;;
    monitoring) echo "$ROOT/deploy/monitoring" ;;
  esac
}

# Service ports
get_service_port() {
  case "$1" in
    daemon)     echo "${PORT:-$DAEMON_PORT}" ;;
    web)        echo "${PORT:-$WEB_PORT}" ;;
    backend)    echo "${PORT:-$BACKEND_PORT}" ;;
    monitoring) echo "" ;;
  esac
}

monitoring_compose() {
  docker compose -f "$MONITORING_COMPOSE" "$@"
}

# ──────────────────────────────────────────────────
# Setup
# ──────────────────────────────────────────────────
do_setup() {
  print_header "AI Video Platform - Setup"
  
  for service in daemon web backend; do
    log_time "Setting up $service..."
    local dir=$(get_service_dir "$service")
    cd "$dir"
    
    if [ "$service" = "backend" ]; then
      cp -n .env.example .env 2>/dev/null || true
      log "backend .env created"
    else
      cp -n .env.example .env 2>/dev/null || true
      npm install --silent
      log "$service dependencies installed"
    fi
  done
  
  echo ""
  print_line "="
  log_info "Setup complete"
  log "Start with: bash scripts/dev.sh start"
  print_line "="
}

# ──────────────────────────────────────────────────
# Start
# ──────────────────────────────────────────────────
do_start() {
  local service="$1"
  
  case "$service" in
    daemon)
      print_section "Starting daemon"
      # Verify model consistency before start
      node "$ROOT/apps/daemon/scripts/verify-media-models.mjs" || log_warn "Model drift detected — check models.ts and ModelSelector.php"
      docker_start "daemon"
      sleep 3
      local status=$(docker_status "daemon")
      if [ "$status" = "running" ]; then
        log_info "Daemon container running"
      else
        log_warn "Daemon container status: $status"
        docker_logs "daemon" 10 | while read line; do log "  $line"; done
      fi
      ;;
    
    web)
      print_section "Starting web app"
      local port=$(get_service_port "web")
      local dir=$(get_service_dir "web")
      
      local status=$(get_process_status "web" "$port")
      if [[ "$status" == "running"* ]]; then
        log_warn "Web already $status"
        return 0
      fi
      
      start_process "web" "$dir" "$port" npx next dev -p "$port"
  ;;
    
    monitoring)
      print_section "Starting monitoring stack"
      monitoring_compose up -d
      sleep 2
      log_info "Prometheus: http://localhost:9090"
      log_info "Grafana:    http://localhost:3001 (admin/${GRAFANA_PASSWORD:-admin})"
          ;;
    
    backend)
      print_section "Starting backend"
      docker_start "app"
      sleep 3
      local status=$(docker_status "app")
      if [ "$status" = "running" ]; then
        log_info "Backend container running on port $BACKEND_PORT"
      else
        log_warn "Backend container status: $status"
      fi
      ;;
    
    all)
      print_header "AI Video Platform - Starting All Services"
      set +e
      do_stop "all"
      sleep 2
      set -e
      
      docker_start
      log "Docker services starting..."
      sleep 5

      # Start monitoring
      if [ -f "$MONITORING_COMPOSE" ]; then
        monitoring_compose up -d 2>/dev/null && log_info "Monitoring stack started"
      fi
      
      # Start web app on host
      local port=$WEB_PORT
      local dir=$(get_service_dir "web")
      if ! start_process "web" "$dir" "$port" npx next dev -p "$port"; then
        log_warn "Web failed to start - check logs with: bash scripts/dev.sh logs web"
      fi
      
      echo ""
      print_line "="
      printf "${BOLD}Services Started${RESET}\n"
      print_line "-"
      print_kv "Backend" "http://localhost:$BACKEND_PORT"
      print_kv "Web" "http://localhost:$WEB_PORT"
      print_kv "Daemon" "http://localhost:$DAEMON_PORT (internal)"
      print_kv "MinIO" "http://localhost:9001"
      print_kv "phpMyAdmin" "http://localhost:8081"
      print_kv "Prometheus" "http://localhost:9090"
      print_kv "Grafana" "http://localhost:3001"
      print_line "="
      ;;
    
    monitoring)
      print_section "Starting monitoring stack"
      monitoring_compose up -d
      sleep 2
      log_info "Prometheus: http://localhost:9090"
      log_info "Grafana:    http://localhost:3001 (admin/${GRAFANA_PASSWORD:-admin})"
      ;;
    
    *)
      docker_start "$service"
      log_info "Started $service"
      ;;
  esac
}

# ──────────────────────────────────────────────────
# Stop
# ──────────────────────────────────────────────────
do_stop() {
  local service="$1"
  
  case "$service" in
    daemon)
      print_section "Stopping daemon"
      docker_stop "daemon"
      log_info "Daemon container stopped"
      ;;
    
    web)
      print_section "Stopping web app"
      local port=$(get_service_port "web")
      local pid=$(get_pid "web" || true)
      
      if [ -n "$pid" ]; then
        kill_process "$pid" && log "killed PID $pid" || true
      fi
      
      if kill_port "$port"; then
        log_info "Port $port freed"
      else
        log_warn "Port $port still in use after stop"
      fi
      rm_pid "web"
      ;;
    
    backend)
      print_section "Stopping backend"
      docker_stop "app"
      log_info "Backend container stopped"
      ;;
    
    monitoring)
      print_section "Stopping monitoring stack"
      monitoring_compose down
      log_info "Monitoring stack stopped"
      ;;

    all)
      print_section "Stopping all services"
      docker_stop
      monitoring_compose down 2>/dev/null || true
      log "Stopping web app..."
      local port=$WEB_PORT
      local pid=$(get_pid "web" || true)
      [ -n "$pid" ] && kill_process "$pid" || true
      kill_port "$port" || true
      rm_pid "web"
      log_info "All services stopped"
      ;;
    
    *)
      docker_stop "$service"
      log_info "Stopped $service"
      ;;
  esac
}

# ──────────────────────────────────────────────────
# Restart
# ──────────────────────────────────────────────────
do_restart() {
  local service="$1"
  
  case "$service" in
    all)
      print_header "AI Video Platform - Restarting All Services"
      set +e  # Disable exit on error for restart
      do_stop "all"
      set -e  # Re-enable exit on error
      sleep 2
      
      # Start all docker services
      docker_start
      log "Docker services starting..."
      sleep 10  # Give docker more time
      
      # Start monitoring
      if [ -f "$MONITORING_COMPOSE" ]; then
        monitoring_compose up -d 2>/dev/null && log_info "Monitoring stack started"
      fi

      # Start web app on host (non-blocking)
      local port=$WEB_PORT
      local dir=$(get_service_dir "web")
      if ! start_process "web" "$dir" "$port" npx next dev -p "$port"; then
        log_warn "Web failed to start - check logs with: bash scripts/dev.sh logs web"
      fi
      
      echo ""
      print_line "="
      printf "${BOLD}Services Restarted${RESET}\n"
      print_line "-"
      print_kv "Backend" "http://localhost:$BACKEND_PORT"
      print_kv "Web" "http://localhost:$WEB_PORT"
      print_kv "Daemon" "http://localhost:$DAEMON_PORT (internal)"
      print_kv "MinIO" "http://localhost:9001"
      print_kv "phpMyAdmin" "http://localhost:8081"
      print_kv "Prometheus" "http://localhost:9090"
      print_kv "Grafana" "http://localhost:3001"
      print_line "="
      ;;
    *)
      set +e  # Disable exit on error for restart
      do_stop "$service"
      set -e  # Re-enable exit on error
      sleep 2
      do_start "$service"
      ;;
  esac
}

# ──────────────────────────────────────────────────
# Status
# ──────────────────────────────────────────────────
do_status() {
  local service="$1"
  
  print_header "AI Video Platform - Status"
  
  case "$service" in
    all)
      print_subsection "Docker Services"
      for svc in daemon app queue reverb mysql redis minio; do
        local status=$(docker_status "$svc")
        case "$status" in
          running) printf "  ${GREEN}%-12s${RESET} %s\n" "$svc" "running" ;;
          not-found) printf "  ${DIM}%-12s${RESET} %s\n" "$svc" "not created" ;;
          *) printf "  ${YELLOW}%-12s${RESET} %s\n" "$svc" "$status" ;;
        esac
      done
      
      print_subsection "Monitoring"
      for svc in prometheus grafana; do
        local mon_status=$(monitoring_compose ps --format "table {{.Service}}\t{{.State}}" 2>/dev/null | grep "^${svc}" | awk '{print $2}' | grep -oE 'running|healthy|exited|dead|created' | head -1)
        case "$mon_status" in
          running|healthy) printf "  ${GREEN}%-12s${RESET} %s\n" "$svc" "running" ;;
          not-found|"")    printf "  ${DIM}%-12s${RESET} %s\n" "$svc" "not created" ;;
          *)               printf "  ${YELLOW}%-12s${RESET} %s\n" "$svc" "$mon_status" ;;
        esac
      done
      
      print_subsection "Host Services"
      local web_status=$(get_process_status "web" "$WEB_PORT")
      if [[ "$web_status" == "running"* ]]; then
        printf "  ${GREEN}%-12s${RESET} %s\n" "web" "$web_status"
      else
        printf "  ${DIM}%-12s${RESET} %s\n" "web" "stopped"
      fi
      ;;
    
    daemon|app|queue|reverb|mysql|redis|minio)
      local status=$(docker_status "$service")
      case "$status" in
        running) log_info "$service is running" ;;
        not-found) log_warn "$service not created" ;;
        *) log "$service: $status" ;;
      esac
      ;;
    
    web)
      local status=$(get_process_status "web" "$WEB_PORT")
      if [[ "$status" == "running"* ]]; then
        log_info "web: $status"
      else
        log_warn "web: stopped"
      fi
      ;;
    
    *)
      log_warn "Unknown service: $service"
      ;;
  esac
  
  echo ""
}

# ──────────────────────────────────────────────────
# Logs
# ──────────────────────────────────────────────────
do_logs() {
  local service="$1"
  local lines="${3:-50}"
  
  case "$service" in
    daemon|app|queue|reverb|mysql|redis|minio)
      docker_logs "$service" "$lines"
      ;;
    prometheus|grafana)
      monitoring_compose logs --tail="$lines" "$service"
      ;;
    web)
      show_logs "web" "$lines"
      ;;
    all)
      print_subsection "Daemon Logs"
      docker_logs "daemon" "$lines"
      echo ""
      print_subsection "Backend Logs"
      docker_logs "app" "$lines"
      echo ""
      print_subsection "Web Logs"
      show_logs "web" "$lines"
      ;;
    *)
      docker_logs "$service" "$lines" 2>/dev/null || show_logs "$service" "$lines"
      ;;
  esac
}

# ──────────────────────────────────────────────────
# Test
# ──────────────────────────────────────────────────
do_test() {
  local service="$1"
  
  print_section "Testing $service"
  
  case "$service" in
    daemon)
      cd "$(get_service_dir "daemon")"
      node --experimental-vm-modules node_modules/.bin/vitest run
      ;;
    web)
      cd "$(get_service_dir "web")"
      npm test
      ;;
    backend)
      docker_exec "app" php artisan test
      ;;
    all)
      do_test "daemon"
      do_test "web"
      do_test "backend"
      ;;
  esac
}

# ──────────────────────────────────────────────────
# Exec
# ──────────────────────────────────────────────────
do_exec() {
  local service="$1"
  shift
  
  case "$service" in
    backend)
      docker_exec "app" "$@"
      ;;
    daemon)
      docker_exec "daemon" "$@"
      ;;
    *)
      docker_exec "$service" "$@"
      ;;
  esac
}

# ──────────────────────────────────────────────────
# Build
# ──────────────────────────────────────────────────
do_build() {
  local service="$1"
  
  print_section "Building $service"
  
  case "$service" in
    backend)
      log "Building Filament theme (inside Docker)..."
      docker_exec "app" npm install --silent 2>/dev/null
      docker_exec "app" npm run build
      log_info "Backend build complete"
      ;;
    web)
      log "Building Next.js app..."
      cd "$(get_service_dir "web")"
      npm install --silent 2>/dev/null
      npm run build
      log_info "Web build complete"
      ;;
    all)
      do_build "backend"
      do_build "web"
      ;;
    *)
      log_warn "Unknown service: $service. Use: backend, web, or all"
      ;;
  esac
}

# ──────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────
case "$CMD" in
  setup)
    do_setup
    ;;
  start)
    do_start "$SERVICE"
    ;;
  stop)
    do_stop "$SERVICE"
    ;;
  restart)
    do_restart "$SERVICE"
    ;;
  status)
    do_status "$SERVICE"
    ;;
  logs)
    do_logs "$SERVICE"
    ;;
  test)
    do_test "$SERVICE"
    ;;
  build)
    do_build "$SERVICE"
    ;;
  verify)
    print_section "Verifying models"
    node "$ROOT/apps/daemon/scripts/verify-media-models.mjs"
    ;;
  exec)
    shift
    do_exec "$SERVICE" "$@"
    ;;
  *)
    print_header "AI Video Platform - Dev Manager"
    echo ""
    printf "${BOLD}Usage:${RESET} bash scripts/dev.sh <command> [service] [port]\n"
    echo ""
    print_subsection "Commands"
    printf "  ${CYAN}%-15s${RESET} %s\n" "setup" "Install deps + .env files"
    printf "  ${CYAN}%-15s${RESET} %s\n" "start" "Start (all | daemon | web | backend | monitoring)"
    printf "  ${CYAN}%-15s${RESET} %s\n" "stop" "Stop (all | daemon | web | backend)"
    printf "  ${CYAN}%-15s${RESET} %s\n" "restart" "Restart (all | daemon | web | backend)"
    printf "  ${CYAN}%-15s${RESET} %s\n" "build" "Build assets (all | backend | web)"
    printf "  ${CYAN}%-15s${RESET} %s\n" "status" "Show status"
    printf "  ${CYAN}%-15s${RESET} %s\n" "logs" "Show logs (last 50 lines)"
    printf "  ${CYAN}%-15s${RESET} %s\n" "test" "Run tests"
    printf "  ${CYAN}%-15s${RESET} %s\n" "exec" "Exec into container"
    echo ""
    print_subsection "Services"
    printf "  ${CYAN}all       - All services\n"
    printf "  ${CYAN}backend   - Laravel (Docker container)\n"
    printf "  ${CYAN}web       - Next.js (host process)\n"
    printf "  ${CYAN}daemon    - Express media engine (Docker)\n"
    printf "  ${CYAN}mysql     - MySQL database\n"
    printf "  ${CYAN}redis     - Redis cache\n"
    printf "  ${CYAN}minio     - MinIO storage\n"
    printf "  ${CYAN}reverb    - Laravel Reverb\n"
    printf "  ${CYAN}queue     - Laravel queue worker\n"
    printf "  ${CYAN}monitoring - Prometheus + Grafana\n"
    echo ""
    print_subsection "Examples"
    printf "  ${DIM}bash scripts/dev.sh build backend            # Build Filament theme${RESET}\n"
    printf "  ${DIM}bash scripts/dev.sh build web                # Build Next.js${RESET}\n"
    printf "  ${DIM}bash scripts/dev.sh build all                # Build all assets${RESET}\n"
    printf "  ${DIM}bash scripts/dev.sh start                    # Start all${RESET}\n"
    printf "  ${DIM}bash scripts/dev.sh start web                # Start web only${RESET}\n"
    printf "  ${DIM}bash scripts/dev.sh start backend            # Start backend only${RESET}\n"
    printf "  ${DIM}bash scripts/dev.sh start monitoring         # Start Prometheus + Grafana${RESET}\n"
    printf "  ${DIM}bash scripts/dev.sh stop daemon              # Stop daemon only${RESET}\n"
    printf "  ${DIM}bash scripts/dev.sh restart web              # Restart web only${RESET}\n"
    printf "  ${DIM}bash scripts/dev.sh logs web 100             # Web logs (100 lines)${RESET}\n"
    printf "  ${DIM}bash scripts/dev.sh logs prometheus          # Prometheus logs${RESET}\n"
    printf "  ${DIM}bash scripts/dev.sh status                   # All services status${RESET}\n"
    printf "  ${DIM}bash scripts/dev.sh status backend           # Backend status only${RESET}\n"
    echo ""
    exit 1
    ;;
esac
