# AI Video Platform — Root Agent Guide

> **⚠️ MANDATORY**: This is the **master coordination agent**.
> Your job is to read `task-status.md` and delegate tasks to the correct sub-agent.
> **DO NOT** modify code directly — route work to `backend/`, `apps/web/`, or `apps/daemon/`.

## Agent Boundaries

| Sub-agent | Scope | AGENTS.md | Work Logs |
|-----------|-------|-----------|-----------|
| **Backend** | `backend/` (Laravel only) | `backend/AGENTS.md` | `backend/worklogs/` |
| **Web App** | `apps/web/` (Next.js only) | `apps/web/AGENTS.md` | `apps/web/worklogs/` |
| **Daemon** | `apps/daemon/` (Express only) | `apps/daemon/AGENTS.md` | `apps/daemon/worklogs/` |

Each sub-agent has a `worklogs/` directory with `.md` files documenting their changes.
Before planning, read the **3 most recent** worklogs in the relevant scope (or the last
~7 days) — not all of them. Grep them by keyword when you need a specific past change.
See `.opencode/rules/context-efficiency` for the full targeted-reading order.

## First time here?

1. Read `task-status.md` — overall project status & active tasks
2. Read `docs/README.md` — documentation index
3. Read `docs/architecture.md` — system design
4. Read `docs/conventions.md` — coding standards
5. Determine task type and delegate:
   - Backend work → `@backend` or `backend/AGENTS.md`
   - Web frontend → `@web` or `apps/web/AGENTS.md`
   - Daemon → `@daemon` or `apps/daemon/AGENTS.md`
   - Coordination → `@coordinator`

## Feature → where to look

Start a task here, then read **only** these — don't bulk-read the repo (see
`.opencode/rules/context-efficiency`). Browse the plan folder, open the **one** relevant file.

| Task touches… | Start (skill) | Primary code | Plans |
|---|---|---|---|
| Storyboard render / scenes / final video | `job-lifecycle`, `simulation-mode` | `backend/app/Services/StoryboardRenderer.php`, `…/API/StoryboardController.php`, `apps/daemon/src/` | `docs/plans/active/storyboard/` |
| Single render job / model select | `job-lifecycle` | `…/API/RenderJobController.php`, `app/Services/ModelSelector.php` | — |
| Community: publish / feed / remix | — | `…/API/CommunityController.php`, `apps/web/src/components/community/` | `docs/plans/active/community/` |
| Billing / credits / pricing | `billing-and-credits` | `backend/app/Services/Pricing/`, `app/Services/CreditService.php` | `docs/plans/completed/billing/` |
| Queue / jobs / Horizon | `queue-and-jobs` | `backend/app/Jobs/` | — |
| Realtime / websockets | `realtime-reverb` | Reverb events / channels | — |
| Laravel ↔ daemon contract / webhooks | `api-contract-daemon` | `backend/app/Services/DaemonClient.php`, daemon `src/` | `docs/plans/active/integration/` |
| Daemon / providers / media gen | `architecture` | `apps/daemon/AGENTS.md`, `apps/daemon/src/` | — |
| Auth / JWT | — | `backend/` auth controllers/middleware | — |
| Cross-layer / "how does X flow" | `architecture` | use CodeGraph first | `docs/architecture.md` |

## Available Agents

| Agent | Scope | Use For |
|-------|-------|---------|
| `@coordinator` | Global | Task delegation, planning |
| `@backend` | `backend/` | Laravel, auth, credits, queue |
| `@web` | `apps/web/` | Next.js, UI, components |
| `@daemon` | `apps/daemon/` | Media engine, providers |
| `@planner` | Global | Feature planning, task breakdown |
| `@explorer` | Global | Read-only code search |
| `@tester` | Global | Write & run tests |

## Architecture

```
Next.js (port 3000) ──HTTP──► Laravel (port 8000)
                                      │
                                      │ (webhook callback)
                                      ▼
                              Daemon (port 7456)
```

Laravel is the **control plane** — auth, credits, queue, admin, email.
Daemon is the **execution plane** — media generation with 16 providers.
See `docs/architecture.md` for full architecture details.

## Key Documents

| Document | Location |
|---|---|
| Project status | `task-status.md` |
| Documentation index | `docs/README.md` |
| Architecture | `docs/architecture.md` |
| Conventions | `docs/conventions.md` |
| Roadmap | `docs/plans/roadmap.md` |
| Backend agent guide | `backend/AGENTS.md` |
| Web agent guide | `apps/web/AGENTS.md` |
| Daemon agent guide | `apps/daemon/AGENTS.md` |
| Coding rules | `.opencode/rules/coding-rules/` |
| API contracts | `.opencode/skills/api-contract-daemon/SKILL.md` |

## Conventions

1. Read `task-status.md` first.
2. Delegate to the correct sub-agent — do not modify code directly.
3. Each sub-agent has its own `AGENTS.md` with strict scope boundaries.
4. Read `worklogs/` from all sub-agents before planning cross-cutting changes.
5. Small, verifiable patches.
6. Vietnamese as primary UI locale.
7. Never commit/push unless explicitly requested.
8. Use `codegraph_*` tools for structural queries before grep/read.
9. See `docs/conventions.md` for full coding standards and best practices.

## Documentation After Every Task

Every agent MUST write a worklog after completing any task.

### Post-task workflow:
1. Run verify (typecheck, tests)
2. Write worklog: `<scope>/worklogs/<YYYY-MM-DD>-<task-slug>.md`
3. Update `task-status.md`
4. Report results to user

### Worklog Template: see `docs/conventions.md`
### Task Status Template: see `task-status.md`

## Development Environment

### Service Ports
- Backend API: `localhost:8000`
- Web App (Next.js): `localhost:3000`
- Daemon (Express): `localhost:7456`
- MinIO Console: `localhost:9001`

### Key Commands
```bash
# Start all services
bash scripts/dev.sh start

# Start specific service
bash scripts/dev.sh start backend
bash scripts/dev.sh start web

# Build for production
bash scripts/dev.sh build all

# Run tests
docker exec backend-app-1 php artisan test
cd apps/web && npm test
cd apps/daemon && npm test
```

### Docker Notes
- Backend runs in Docker container via `bash scripts/dev.sh start backend`
- Container has its own MySQL database (separate from host)
- Always run database commands INSIDE the container
- See `docs/conventions.md` for restart rules per code change type
