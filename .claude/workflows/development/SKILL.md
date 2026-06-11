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

1. **Read `STATUS.md`** — Current project status
2. **Read `scripts/README.md`** — Scripts usage
3. **Read `docs/plans/update-plan.md`** — Roadmap

## By Task Type

### Daemon Work (apps/daemon/)

1. Read `apps/daemon/AGENTS.md` — API endpoints, providers
2. Read `docs/plans/appclient/` — Daemon architecture
3. Modify source in `apps/daemon/src/`
4. Run `cd apps/daemon && npm run typecheck`
5. Run `cd apps/daemon && npm run dev` — Test locally

### Web App Work (apps/web/)

1. Read `apps/web/AGENTS.md` — Conventions
2. Read `docs/plans/appclient/09-ux-flow.md` — UX flows
3. Read `docs/plans/integration/01-api-contract.md` — API contract
4. Develop feature, reference `docs/plans/update-plan.md` for phase

### Backend Work (backend/)

1. Read `backend/AGENTS.md` — Overview + docs mapping
2. Read `.claude/rules/laravel` — Laravel standards
3. Read `docs/plans/backend/` — DB schema, API routes, queue

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
