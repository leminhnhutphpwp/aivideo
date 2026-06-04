#!/usr/bin/env bash
# scripts/lib/common.sh — Shared utilities (logging, formatting)

CONSOLE_WIDTH=${CONSOLE_WIDTH:-80}

# Color codes
RED=$'\033[0;31m'
GREEN=$'\033[0;32m'
YELLOW=$'\033[0;33m'
BLUE=$'\033[0;34m'
MAGENTA=$'\033[0;35m'
CYAN=$'\033[0;36m'
BOLD=$'\033[1m'
DIM=$'\033[2m'
RESET=$'\033[0m'

# Logging functions
log_info() {
  local msg="$1"
  echo -e "  ${GREEN}${BOLD}info:${RESET} $msg"
}

log_warn() {
  local msg="$1"
  echo -e "  ${YELLOW}warn:${RESET} $msg"
}

log_fail() {
  local msg="$1"
  echo -e "  ${RED}fail:${RESET} $msg" >&2
  exit 1
}

log() {
  local msg="$1"
  echo "  $msg"
}

log_time() {
  local msg="$1"
  echo "  [$(date '+%H:%M:%S')] $msg"
}

# Key-value display
print_kv() {
  local key="$1"
  local value="$2"
  printf "  ${BOLD}%-15s${RESET} %s\n" "$key" "$value"
}

# Section helpers
print_subsection() {
  local msg="$1"
  echo ""
  echo "  --- $msg ---"
  echo ""
}

print_line() {
  local char="${1:--}"
  local width="${2:-$CONSOLE_WIDTH}"
  printf '%*s\n' "$width" | tr ' ' "$char"
}

print_header() {
  local title="$1"
  local width="${2:-$CONSOLE_WIDTH}"
  local padding=$(( (width - ${#title} - 2) / 2 ))
  echo ""
  print_line "=" "$width"
  printf "%${padding}s %s %${padding}s\n" "" "$title" ""
  print_line "=" "$width"
  echo ""
}

print_section() {
  local msg="$1"
  echo ""
  echo "  $msg"
  echo ""
}

print_step() {
  local msg="$1"
  echo "  > $msg"
}

print_success() {
  local msg="$1"
  echo "  [OK] $msg"
}

print_error() {
  local msg="$1"
  echo "  [ERROR] $msg" >&2
}

print_warning() {
  local msg="$1"
  echo "  [WARNING] $msg"
}

prompt() {
  local msg="$1"
  echo -n "  $msg (y/N): "
  read -r response
  if [[ ! "$response" =~ ^[Yy]$ ]]; then
    echo "  Cancelled."
    exit 1
  fi
}

confirm_destructive() {
  local cmd="$1"
  echo ""
  echo "  WARNING: This will $cmd"
  echo "  This action cannot be undone."
  prompt "Are you sure you want to continue?"
}
