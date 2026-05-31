#!/usr/bin/env bash
# scripts/lib/process.sh — Process management (PID files, port detection)

PID_FILE="$ROOT/scripts/.pids"

# Save PID to file
save_pid() {
  local name="$1"
  local pid="$2"
  local tmp=$(mktemp)
  [ -f "$PID_FILE" ] && cat "$PID_FILE" > "$tmp" || true
  echo "$name:$pid" >> "$tmp"
  mv "$tmp" "$PID_FILE"
}

# Remove PID from file
rm_pid() {
  local name="$1"
  [ ! -f "$PID_FILE" ] && return
  local tmp=$(mktemp)
  grep -v "^${name}:" "$PID_FILE" > "$tmp" || true
  mv "$tmp" "$PID_FILE"
  [ -s "$PID_FILE" ] || rm -f "$PID_FILE"
}

# Get PID by name
get_pid() {
  local name="$1"
  [ ! -f "$PID_FILE" ] && return 1
  grep "^${name}:" "$PID_FILE" | cut -d: -f2
}

# Find PIDs listening on a port
pids_on_port() {
  local port="$1"
  local pids=""
  
  # Try lsof first (most reliable)
  if command -v lsof >/dev/null 2>&1; then
    pids=$(lsof -ti ":$port" 2>/dev/null | tr '\n' ' ')
    [ -n "$pids" ] && echo "$pids" && return 0
  fi
  
  # Fallback to fuser
  if command -v fuser >/dev/null 2>&1; then
    pids=$(fuser "$port/tcp" 2>/dev/null | tr ' ' '\n' | tr '\n' ' ')
    [ -n "$pids" ] && echo "$pids" && return 0
  fi
  
  # Fallback to ss
  if command -v ss >/dev/null 2>&1; then
    pids=$(ss -tlnp 2>/dev/null | grep ":$port " | grep -oP 'pid=\K[0-9]+' | sort -u | tr '\n' ' ')
    [ -n "$pids" ] && echo "$pids" && return 0
  fi
  
  return 1
}

# Wait for port to be free
wait_port_free() {
  local port="$1"
  local timeout="${2:-5}"
  for i in $(seq 1 "$timeout"); do
    if ! pids_on_port "$port" | grep -q .; then
      return 0
    fi
    sleep 1
  done
  return 1
}

# Wait for PID to die
wait_pid_dead() {
  local pid="$1"
  local timeout="${2:-3}"
  for i in $(seq 1 "$timeout"); do
    if ! kill -0 "$pid" 2>/dev/null; then
      return 0
    fi
    sleep 1
  done
  return 1
}

# Kill process tree recursively (children, grandchildren, etc.)
kill_tree() {
  local pid="$1"
  local signal="${2:-TERM}"
  for child in $(pgrep -P "$pid" 2>/dev/null || true); do
    kill_tree "$child" "$signal"
  done
  kill -"$signal" "$pid" 2>/dev/null || true
}

# Kill process by PID and all descendants (force with SIGKILL if needed)
kill_process() {
  local pid="$1"
  if [ -n "$pid" ]; then
    kill_tree "$pid" "TERM"
    if ! wait_pid_dead "$pid" 5; then
      kill_tree "$pid" "KILL"
      wait_pid_dead "$pid" 3 || true
    fi
    return 0
  fi
  return 1
}

# Kill process by port — kills both the leaf process AND its parent
# to prevent parent (e.g., node/next dev) from respawning the child.
kill_port() {
  local port="$1"
  local port_pids=$(pids_on_port "$port" || true)
  if [ -z "$port_pids" ]; then
    return 0  # port already free
  fi
  # Kill parents first to prevent respawn
  local parents=""
  for pid in $port_pids; do
    local ppid=$(ps -o ppid= "$pid" 2>/dev/null | tr -d ' ')
    if [ -n "$ppid" ] && [ "$ppid" -gt 1 ]; then
      parents="$parents $ppid"
    fi
  done
  for pid in $(echo "$parents" | tr ' ' '\n' | sort -u); do
    kill_process "$pid" || true
  done
  # Now kill the processes on the port
  for pid in $port_pids; do
    kill_process "$pid" || true
  done
  wait_port_free "$port" 10 && return 0
  return 1
}

# Start process in background with logging
start_process() {
  local name="$1"
  local dir="$2"
  local port="$3"
  shift 3
  local log_dir="$ROOT/scripts/logs/$name"
  local log_file="$log_dir/output.log"
  
  mkdir -p "$log_dir"
  
  # Check if port is in use
  local existing=$(pids_on_port "$port" | head -1)
  if [ -n "$existing" ]; then
    log_warn "Port $port in use — stopping first"
    kill_port "$port"
    sleep 2
  fi
  
  rm_pid "$name"
  cd "$dir" && nohup "$@" > "$log_file" 2>&1 &
  save_pid "$name" $!
  
  sleep 3
  if kill -0 $! 2>/dev/null; then
    log_info "$name running (PID $!) on port $port"
    return 0
  else
    log_warn "Failed to start $name"
    log "Last 5 log lines:"
    tail -5 "$log_file" | while read line; do log "  $line"; done
    return 1
  fi
}

# Get process status
get_process_status() {
  local name="$1"
  local port="$2"
  local pid=$(get_pid "$name" || true)
  
  # Check if port is listening (more reliable than PID)
  local port_pids=$(pids_on_port "$port" 2>/dev/null || true)
  if [ -n "$port_pids" ]; then
    echo "running:port-$port"
    return 0
  fi
  
  # Fallback: check saved PID
  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
    echo "running:$pid"
    return 0
  fi
  
  echo "stopped"
  return 1
}

# Show process logs
show_logs() {
  local name="$1"
  local lines="${2:-50}"
  local log_file="$ROOT/scripts/logs/$name/output.log"
  
  if [ -f "$log_file" ]; then
    print_subsection "$name logs (last $lines lines)"
    tail -n "$lines" "$log_file"
  else
    log "No log file for $name"
  fi
}

# Check if port is available
check_port_available() {
  local port="$1"
  local pids=$(pids_on_port "$port")
  if [ -n "$pids" ]; then
    return 1
  fi
  return 0
}

# Get process listening on port
get_process_on_port() {
  local port="$1"
  local pid=$(pids_on_port "$port" | head -1)
  if [ -n "$pid" ]; then
    ps -p "$pid" -o comm= 2>/dev/null || echo "unknown"
  else
    echo "none"
  fi
}
