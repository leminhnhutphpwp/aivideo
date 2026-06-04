#!/usr/bin/env bash
# scripts/lib/docker.sh — Docker Compose helpers

# Get compose file path
get_compose_file() {
  local env="${1:-dev}"
  case "$env" in
    dev)     echo "$ROOT/backend/docker-compose.dev.yml" ;;
    prod)    echo "$ROOT/backend/docker-compose.yml" ;;
    *)       echo "$1" ;;
  esac
}

# Docker Compose wrapper
docker_compose() {
  local compose_file=$(get_compose_file "${COMPOSE_ENV:-dev}")
  docker compose -f "$compose_file" "$@"
}

# Start service
docker_start() {
  local service="$1"
  if [ -n "$service" ]; then
    docker_compose up -d "$service"
  else
    docker_compose up -d
  fi
}

# Stop service
docker_stop() {
  local service="$1"
  if [ -n "$service" ]; then
    docker_compose stop "$service"
  else
    docker_compose down
  fi
}

# Restart service
docker_restart() {
  local service="$1"
  docker_stop "$service"
  sleep 2
  docker_start "$service"
}

# Get container status
docker_status() {
  local service="$1"
  local state=""
  
  # Try docker compose ps
  state=$(docker compose -f "$(get_compose_file)" ps --format "table {{.Service}}\t{{.State}}" 2>/dev/null | grep "^${service}" | awk '{print $2}')
  
  if [ -n "$state" ]; then
    # Extract just the state (e.g., "running", "healthy")
    echo "$state" | grep -oE 'running|healthy|exited|dead|created' | head -1
    return 0
  fi
  
  # Fallback: check by container name pattern
  local container_name="backend-${service}-1"
  state=$(docker ps -a --filter "name=${container_name}" --format '{{.State}}' 2>/dev/null)
  
  if [ -n "$state" ]; then
    echo "$state"
    return 0
  fi
  
  echo "not-found"
  return 1
}

# Get container logs
docker_logs() {
  local service="${1:-app}"
  local lines="${2:-50}"
  docker_compose logs --tail="$lines" "$service"
}

# Build service
docker_build() {
  local service="$1"
  if [ -n "$service" ]; then
    docker_compose build "$service"
  else
    docker_compose build
  fi
}

# Exec into container
docker_exec() {
  local service="${1:-app}"
  shift
  docker_compose exec "$service" "$@"
}

# Wait for service to be healthy
docker_wait_healthy() {
  local service="$1"
  local timeout="${2:-30}"
  for i in $(seq 1 $timeout); do
    local status=$(docker_status "$service")
    if [ "$status" = "running" ]; then
      return 0
    fi
    sleep 1
  done
  return 1
}

# Get all containers status
docker_containers_status() {
  docker_compose ps --format "table {{.Service}}\t{{.State}}\t{{.Ports}}" 2>/dev/null
}

# Check if docker is running
require_docker() {
  if ! command -v docker &>/dev/null; then
    fail "Docker is not installed"
  fi
  if ! docker info &>/dev/null; then
    fail "Docker daemon is not running"
  fi
}

# Check if docker compose is available
require_docker_compose() {
  if ! command -v docker &>/dev/null; then
    fail "Docker is not installed"
  fi
  if ! docker compose version &>/dev/null; then
    fail "Docker Compose is not installed"
  fi
}
