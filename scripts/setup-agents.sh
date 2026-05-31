#!/bin/bash
# scripts/setup-agents.sh — Setup global OpenCode agents
# Usage: bash scripts/setup-agents.sh [--local|--global|--both]
#
# Options:
#   --local   Copy to project .opencode/ only
#   --global  Copy to ~/.config/opencode/ only (default)
#   --both    Copy to both locations
# -------------------------------------------------------------------

set -eo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_AGENTS="$ROOT/.opencode"
GLOBAL_AGENTS="$HOME/.config/opencode"

MODE="${1:---global}"

setup_global() {
  echo "Setting up global agents in $GLOBAL_AGENTS..."
  mkdir -p "$GLOBAL_AGENTS/agents" "$GLOBAL_AGENTS/rules" "$GLOBAL_AGENTS/skills" "$GLOBAL_AGENTS/workflows"
  
  cp -r "$PROJECT_AGENTS/agents/"* "$GLOBAL_AGENTS/agents/"
  cp -r "$PROJECT_AGENTS/rules/"* "$GLOBAL_AGENTS/rules/"
  cp -r "$PROJECT_AGENTS/skills/"* "$GLOBAL_AGENTS/skills/"
  cp -r "$PROJECT_AGENTS/workflows/"* "$GLOBAL_AGENTS/workflows/"
  
  echo "✓ Global agents setup complete"
  echo ""
  echo "Available agents:"
  ls -1 "$GLOBAL_AGENTS/agents/" | sed 's/\.md$//' | sed 's/^/  @/'
}

setup_local() {
  echo "Setting up local agents in $PROJECT_AGENTS..."
  
  # Already exists in project
  echo "✓ Local agents already exist"
  echo ""
  echo "Available agents:"
  ls -1 "$PROJECT_AGENTS/agents/" | sed 's/\.md$//' | sed 's/^/  @/'
}

case "$MODE" in
  --local)
    setup_local
    ;;
  --global)
    setup_global
    ;;
  --both)
    setup_local
    echo ""
    setup_global
    ;;
  *)
    echo "Usage: bash scripts/setup-agents.sh [--local|--global|--both]"
    echo ""
    echo "Options:"
    echo "  --local   Copy to project .opencode/ only"
    echo "  --global  Copy to ~/.config/opencode/ only (default)"
    echo "  --both    Copy to both locations"
    exit 1
    ;;
esac

echo ""
echo "Usage in opencode:"
echo "  @backend   Laravel specialist"
echo "  @web       Next.js specialist"
echo "  @daemon    Express media engine"
echo "  @explorer  Read-only code search"
echo "  @tester    Testing specialist"
echo "  @coordinator  Master orchestrator"
