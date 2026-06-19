---
name: development-workflow
description: Development workflow for AI Video Platform
compatibility: opencode
metadata:
  scope: global
  type: workflow
---

# Development Workflow

## Before Starting

1. **Read `task-status.md`** (root) — current status + active work. This is the entry
   point. Do **not** read `HISTORY.md` (archived) unless you are researching past work.
2. **Read `docs/plans/roadmap.md`** — phases & priorities.
3. Need to run services? See `scripts/README.md` (don't read it unless you're starting/
   debugging the stack).

> Read selectively. Load only your layer's `AGENTS.md` + the matching skill, and open the
> single relevant plan file — not whole folders. See the **"Feature → where to look"** table
> in root `CLAUDE.md` and the `.opencode/rules/context-efficiency` rule before reading broadly.

## By Task Type

### Daemon Work (apps/daemon/)

1. Read `apps/daemon/AGENTS.md` — API endpoints, providers
2. Load skill `api-contract-daemon` — Laravel ↔ daemon contract (only if touching the contract)
3. Modify source in `apps/daemon/src/`
4. Run `cd apps/daemon && npm run typecheck`
5. Run `cd apps/daemon && npm run dev` — Test locally

### Web App Work (apps/web/)

1. Read `apps/web/AGENTS.md` — conventions
2. Load skill `api-contract-daemon` for the API surface; for a feature's UX, open the one
   relevant file under `docs/plans/active/ui/` (e.g. `unified-projects-page.md`)
3. Develop the feature, then `cd apps/web && npx tsc --noEmit`

### Backend Work (backend/)

1. Read `backend/AGENTS.md` — overview + docs mapping
2. Read `.opencode/rules/laravel` — Laravel standards
3. Open the relevant note under `docs/plans/backend/` (browse, don't bulk-read)

## Starting Services

```bash
# Start all services
bash scripts/dev.sh start

# Start specific service
bash scripts/dev.sh start daemon
bash scripts/dev.sh start web
bash scripts/dev.sh start backend

# Check status
bash scripts/dev.sh status
```

## General Principles

1. **Typecheck** before finishing
2. **Small patches** — Easy to verify
3. **Vietnamese locale** — Primary UI language
4. **No commit/push** unless explicitly requested

## When to use this skill

Reference this when:
- Starting new development tasks
- Setting up development environment
- Following project workflows
