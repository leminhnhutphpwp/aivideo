#!/usr/bin/env bash
# Migration & Seeder Manager
# Usage: bash scripts/migrate.sh <command> [options]
# -------------------------------------------------------------------
set -eo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
source "$ROOT/scripts/lib/common.sh"

# Default values
COMPOSE_FILE="$ROOT/backend/docker-compose.dev.yml"
COMMAND="${1:-help}"
shift || true

# Parse optional flags
POSITIONAL_ARGS=()
while [[ $# -gt 0 ]]; do
  case $1 in
    -f|--file)
      COMPOSE_FILE="$2"
      shift 2
      ;;
    --class=*)
      SEEDER_CLASS="${1#*=}"
      shift
      ;;
    -c|--class)
      SEEDER_CLASS="$2"
      shift 2
      ;;
    *)
      POSITIONAL_ARGS+=("$1")
      shift
      ;;
  esac
done
set -- "${POSITIONAL_ARGS[@]}"

# Remaining positional args
if [[ $# -gt 0 ]]; then
  SEEDER_CLASS="${SEEDER_CLASS:-$1}"
  shift
fi

# Helper function to run artisan command
run_artisan() {
  docker compose -f "$COMPOSE_FILE" exec app php artisan "$@"
}

# Show help
show_help() {
  cat << EOF
${CYAN}Migration & Seeder Manager${RESET}

${YELLOW}Usage:${RESET}
  bash scripts/migrate.sh <command> [options]

${YELLOW}Commands:${RESET}
  ${GREEN}migrate${RESET}              Run all migrations
  ${GREEN}fresh${RESET}                Drop all tables and re-migrate
  ${GREEN}refresh${RESET}              Rollback all migrations and re-migrate
  ${GREEN}reset${RESET}                Rollback all migrations
  ${GREEN}status${RESET}               Show migration status
  
  ${GREEN}seed${RESET}                 Run all seeders
  ${GREEN}seed --class=ClassName${RESET}  Run specific seeder
  
  ${GREEN}all${RESET}                  Run migrate + seed (production ready)
  ${GREEN}setup${RESET}                Fresh migrate + all seeders (dev only)

${YELLOW}Options:${RESET}
  ${GREEN}-f, --file${RESET}           Docker compose file (default: docker-compose.yml)
  ${GREEN}-c, --class${RESET}          Specific seeder class name

${YELLOW}Examples:${RESET}
  ${DIM}# Run migrations only${RESET}
  bash scripts/migrate.sh migrate

  ${DIM}# Run specific seeder${RESET}
  bash scripts/migrate.sh seed --class=PricingSystemSeeder

  ${DIM}# Fresh setup for development${RESET}
  bash scripts/migrate.sh setup

  ${DIM}# Production deployment${RESET}
  bash scripts/migrate.sh all

  ${DIM}# Use dev compose file${RESET}
  bash scripts/migrate.sh migrate -f backend/docker-compose.dev.yml
EOF
}

# Migration commands
cmd_migrate() {
  print_header "Running Migrations"
  run_artisan migrate --force
  print_section "Migrations completed"
}

cmd_fresh() {
  print_warning "⚠️  This will DROP all tables!"
  read -p "Are you sure? (yes/no): " confirm
  if [ "$confirm" != "yes" ]; then
    print_error "Cancelled"
    exit 1
  fi
  
  print_header "Fresh Migration"
  run_artisan migrate:fresh --force
  print_section "Fresh migration completed"
}

cmd_refresh() {
  print_header "Refreshing Database"
  run_artisan migrate:refresh --force
  print_section "Refresh completed"
}

cmd_reset() {
  print_warning "⚠️  This will rollback ALL migrations!"
  read -p "Are you sure? (yes/no): " confirm
  if [ "$confirm" != "yes" ]; then
    print_error "Cancelled"
    exit 1
  fi
  
  print_header "Resetting Database"
  run_artisan migrate:reset --force
  print_section "Reset completed"
}

cmd_status() {
  print_header "Migration Status"
  run_artisan migrate:status
}

# Seeder commands
cmd_seed() {
  if [ -n "$SEEDER_CLASS" ]; then
    print_header "Seeding: $SEEDER_CLASS"
    run_artisan db:seed --class="$SEEDER_CLASS" --force
    print_section "Seeding completed: $SEEDER_CLASS"
  else
    print_header "Running All Seeders"
    run_artisan db:seed --force
    print_section "All seeders completed"
  fi
}

# Combined commands
cmd_all() {
  print_header "Production Deployment (Migrate + Seed)"
  
  print_step "Running migrations"
  run_artisan migrate --force
  
  print_step "Running seeders"
  run_artisan db:seed --force
  
  print_section "✅ Deployment completed successfully!"
}

cmd_setup() {
  print_warning "⚠️  Development Setup - Will DROP all tables!"
  read -p "Are you sure? (yes/no): " confirm
  if [ "$confirm" != "yes" ]; then
    print_error "Cancelled"
    exit 1
  fi
  
  print_header "Development Setup"
  
  print_step "Dropping all tables"
  run_artisan migrate:fresh --force
  
  print_step "Running all seeders"
  run_artisan db:seed --force
  
  print_section "✅ Development setup completed!"
  print_info "Admin user: minhnhut1999nb@gmail.com / ihzhGTiEPsKrRaNZ"
}

# Main command handler
case $COMMAND in
  migrate)
    cmd_migrate
    ;;
  fresh)
    cmd_fresh
    ;;
  refresh)
    cmd_refresh
    ;;
  reset)
    cmd_reset
    ;;
  status)
    cmd_status
    ;;
  seed)
    cmd_seed
    ;;
  all)
    cmd_all
    ;;
  setup)
    cmd_setup
    ;;
  help|--help|-h)
    show_help
    ;;
  *)
    print_error "Unknown command: $COMMAND"
    show_help
    exit 1
    ;;
esac
