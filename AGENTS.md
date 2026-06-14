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
Read those to get the full picture before planning new work.

## Project Structure

```
/home/minhnhut/DataSwap/www/AIVideoPaltfom/
├── .opencode/                # OpenCode configuration
│   ├── skills/               # Agent skills (loaded on-demand)
│   ├── rules/                # Coding standards
│   ├── workflows/            # Development workflows
│   └── README.md             # OpenCode guide
│
├── scripts/                  # Unified dev & deploy scripts
│   ├── lib/                  # Shared utilities
│   ├── dev.sh                # Development manager
│   ├── deploy.sh             # Production deployment
│   ├── migrate.sh            # Database migrations
│   └── README.md             # Scripts documentation
│
├── apps/
│   ├── daemon/               # Media engine (Express, port 7456)
│   │   ├── AGENTS.md         # Daemon-specific guide
│   │   └── worklogs/         # Daemon agent work logs
│   │
│   └── web/                   # Next.js 15 UI
│       ├── AGENTS.md         # Web app-specific guide
│       └── worklogs/         # Web app agent work logs (TBD)
│
├── backend/                   # Laravel API
│   ├── AGENTS.md             # Backend-specific guide
│   └── worklogs/             # Backend agent work logs
│
├── docs/plans/                # Architecture & development plans
│
└── AGENTS.md                  # This file (master coordination)
```

## 🆕 First time here?

1. **Read `task-status.md`** — overall project status & active tasks
3. **Read `scripts/README.md`** — unified scripts guide
4. **Read `.opencode/README.md`** — OpenCode configuration & agents
5. **Read `backend/worklogs/`** — latest backend changes
6. **Read `docs/plans/README.md`** — architecture overview
7. **Read `HISTORY.md`** — archived completed tasks
8. **Determine task type and delegate:**
   - Backend work → `@backend` or `backend/AGENTS.md`
   - Web frontend → `@web` or `apps/web/AGENTS.md`
   - Daemon → `@daemon` or `apps/daemon/AGENTS.md`
   - Coordination → `@coordinator`

## Available Agents

Invoke specialized agents with `@name` in chat:

| Agent | Scope | Mode | Use For |
|-------|-------|------|---------|
| `@coordinator` | Global | Primary | Task delegation, planning |
| `@backend` | `backend/` | Subagent | Laravel, auth, credits, queue |
| `@web` | `apps/web/` | Subagent | Next.js, UI, components |
| `@daemon` | `apps/daemon/` | Subagent | Media engine, providers |
| `@planner` | Global | Subagent | Feature planning, task breakdown, coordination |
| `@explorer` | Global | Subagent | Read-only code search |
| `@tester` | Global | Subagent | Write & run tests |

## Architecture

```
Next.js (port 3000) ──HTTP──► Laravel (Auth, Credits, Plans, Email, Admin)
                                      │
                                      │ (webhook callback)
                                      ▼
                              Daemon (port 7456, Media Gen)
```

Laravel is the **control plane** — auth, credits, queue, admin, email.  
Daemon is the **execution plane** — media generation with 16 providers.  
Web app calls Laravel API for auth/credits/billing, and daemon proxy (through Laravel) for media/projects.

## Best Practices & Patterns

### Storyboard Architecture (Multi-Scene vs One-Shot)
- **Multi-scene** (`render_mode: multi_scene`): Traditional scene-by-scene storyboard. Each scene has independent camera/style/mood/lighting/driving_audio/first_frame/last_frame. FFmpeg concatenates at end.
- **One-Shot** (`render_mode: single_flow`): Single compiled prompt → one generation job. Shared skills (camera, style, mood, lighting, narration, driving_audio, first_frame, last_frame) at storyboard level, not per-scene. Skip FFmpeg concat.
- **Mode toggle**: `RenderModeProvider` context + pill toggle ("Ghép cảnh / One-Shot") with confirm dialog.
- **URL routing**: `/studio/storyboards/flow?mode=multi` or `?mode=single`. Always use plural `/storyboards/`.
- **Compiled prompt**: `POST /api/storyboards/{uuid}/compile-prompt` via `AiPromptCompiler` (CKey gpt-4o-mini). Status badge: idle/compiling/compiled/stale/error.

### Media Types (First/Last Frame, Driving Audio)
- **One-Shot mode**: `driving_audio`, `first_frame_image`, `last_frame_image` are **storyboard-level** fields (same pattern as skills/camera/style/mood/lighting). Stored on `storyboards` table.
- **Multi-scene mode**: `driving_audio`, `first_frame_image`, `last_frame_image` are **per-scene** fields. Each scene can have different reference media. Stored on `scenes` table.
- **Why the split?** One-Shot = one generation job → one set of reference media. Multi-scene = N generation jobs → each scene may need different reference media.
- **Payload routing**: `buildPayload()` checks render mode and places fields at the correct level.
- **Always verify model support**: Wan2.7 I2V supports first_frame + last_frame + driving_audio. Wan2.6 may differ. Check official DashScope API docs before assuming.

### ⚠️ MANDATORY: Search Model API Docs Before Implementing
When adding/modifying features for a specific model (Wan2.7, Wan2.6, etc.):
1. **ALWAYS search official API documentation first** — never assume parameters
2. Check what parameters the model actually supports (names, types, required vs optional)
3. Verify valid combinations (e.g., first_frame + last_frame + driving_audio may not all work together)
4. Don't assume — verify with official docs. Model capabilities change between versions.
- Alibaba Cloud Model Studio: https://help.aliyun.com/zh/model-studio/
- DashScope API: https://dashscope.console.aliyun.com/ → API docs
- Anti-pattern: Copying parameters from one model to another without checking

### Asset Security
- **NEVER expose raw daemon paths** to the frontend. Use `fetchRawFile(projectId, fileName)` which returns `{ blobUrl, blob }`.
- **Filter thumbnail duplicates**: `AssetController::index()` filters `where('type', '!=', 'thumbnail')` to avoid duplicates in pickers.
- **Image display**: Always fetch via authenticated API. Never construct raw URLs from daemon paths.

### ⚠️ Community Architecture (RenderJob vs Storyboard)
- **Community features operate on RenderJobs (individual assets), NOT Storyboards.**
- Publish: `PATCH /render-jobs/{uuid}/publish` — sets visibility, published_at, tags on RenderJob
- Community Feed: `RenderJob::published()` — queries published RenderJobs only
- Storyboards are project containers; each scene has its own RenderJob
- **NEVER create storyboard publish endpoints** — community doesn't query storyboards
- See `docs/plans/community/README.md` for full architecture

### Pricing Best Practices
- **Single source**: `PricingCalculator::calculate()` for ALL credit estimation — backend and frontend must agree.
- **Duration from DB**: `DurationTier::active()` via `GET /api/v1/pricing/durations`. Never hardcode duration arrays.
- **Frontend**: Use `laravel.pricingCalculate()` for storyboard estimation. Use `laravel.pricingDurations()` for duration options.

### Voiceover Pattern
- **POST-GENERATION ONLY**: Voiceover is a completely separate step after video rendering completes.
- Never include `voice`, `narration`, or `background_music` in `generateMedia()` params.
- Endpoint: `POST /api/storyboards/{uuid}/add-voiceover` — generates TTS via daemon, merges locally with ffmpeg.
- UI: `VoiceoverModal` component, shown as "Thêm giọng đọc" button on viewer page.

### Rate Limiting
- **Middleware**: `ThrottleApiRequests` — per-plan limits (free: 120, starter: 300, pro: 600, studio: 1000, enterprise: 2000 req/min).
- **Auth routes**: Keep strict (60 req/min default).
- **Vietnamese 429 message**: `"Bạn thao tác quá nhanh, vui lòng chờ trong giây lát!"`.

### Edge Labels (Smart Auto-Labels)
- Template import auto-fills edge labels: first edge → "Mở đầu", last edge → "Kết thúc", middle edges → "Chuyển tiếp".
- One-Shot mode auto-labels: single edge → "Kết thúc".
- Edges respect `parent_key` for topological flow.

## Key Documents

| Document | Location |
|---|---|
| Project status | `task-status.md` |
| Scripts guide | `scripts/README.md` |
| OpenCode config | `.opencode/README.md` |
| Backend work logs | `backend/worklogs/` |
| Architecture overview | `docs/plans/README.md` |
| Development roadmap | `docs/plans/README.md` |
| Daemon API endpoints | `apps/daemon/AGENTS.md` |
| Laravel API routes | `.opencode/skills/api-contract-daemon/SKILL.md` |
| Coding rules | `.opencode/rules/coding-rules/` |
| Product scope | `.opencode/rules/product-scope/` |

## ⚠️ MANDATORY: Use CodeGraph first, not grep/glob

**HARD RULE:** When searching for symbols, definitions, callers, callees, file structure — **must use `codegraph_*` tools first**. Only use grep/read when:
1. CodeGraph returned no results
2. Searching for literal text (strings, comments, log output)

Violation = context waste. Always call `codegraph_context` or `codegraph_search` first for every code question.

## Using CodeGraph (MCP)

This project has a CodeGraph index at `.codegraph/` with 579+ files indexed.
Use CodeGraph tools for **structural queries** (symbol definitions, callers, callees, impact analysis).
Use native grep/read only for **literal text** (strings, comments, logs).

| Question | Tool |
|---|---|
| "Where is X defined?" / "Find symbol X" | `codegraph_search` |
| "What calls function Y?" | `codegraph_callers` |
| "What does Y call?" | `codegraph_callees` |
| "What would break if I changed Z?" | `codegraph_impact` |
| "Show me source/signature of symbol" | `codegraph_node` |
| "Give me context for a task/area" | `codegraph_context` |
| "See several related symbols' source" | `codegraph_explore` |
| "What files exist under path/?" | `codegraph_files` |

Pass `projectPath` when querying code in a subdirectory:
- Backend PHP: `projectPath: "/home/minhnhut/DataSwap/www/AIVideoPaltfom/backend"`
- Web frontend: `projectPath: "/home/minhnhut/DataSwap/www/AIVideoPaltfom/apps/web"`
- Daemon: `projectPath: "/home/minhnhut/DataSwap/www/AIVideoPaltfom/apps/daemon"`

## Conventions

1. Read `task-status.md` first.
2. Delegate to the correct sub-agent — do not modify code directly.
3. Each sub-agent has its own `AGENTS.md` with strict scope boundaries.
4. Read `worklogs/` from all sub-agents before planning cross-cutting changes.
5. Small, verifiable patches.
6. Vietnamese as primary UI locale.
7. Never commit/push unless explicitly requested.
8. Use `codegraph_*` tools for structural queries before grep/read.

## 🔴 MANDATORY: Documentation After Every Task

Every agent MUST write a worklog after completing any task. No exceptions.

### Post-task workflow:
1. ✅ Run verify (typecheck, tests)
2. ✅ Write worklog: `<scope>/worklogs/<YYYY-MM-DD>-<task-slug>.md`
3. ✅ Update `task-status.md`
4. ✅ Report results to user

### Worklog Template: see `.opencode/rules/documentation/SKILL.md`
### Task Status Template: see `task-status.md`

| After task complete | File to write | Location |
|---|---|---|
| Worklog | `<scope>/worklogs/<date>-<slug>.md` | Backend: `backend/worklogs/`, Web: `apps/web/worklogs/`, Daemon: `apps/daemon/worklogs/` |
| Task status update | `task-status.md` | Root project |

## Development Environment

### Project Paths
- Primary: `/home/minhnhut/DataSwap/www/AIVideoPaltfom/`

### Docker Setup
- Backend runs in Docker container via `bash scripts/dev.sh start backend`
- Container has its **own MySQL database** (separate from host MySQL)
- **CRITICAL**: Running seeders/migrations on host does NOT affect container database
- Always run database commands **INSIDE the container**:
  ```bash
  cd backend
  docker compose -f docker-compose.dev.yml exec app php artisan db:seed
  docker compose -f docker-compose.dev.yml exec app php artisan migrate
  docker compose -f docker-compose.dev.yml exec app php artisan optimize:clear
  ```
- Restart backend to apply code changes: `bash scripts/dev.sh restart backend`
- Storage (MinIO): `apps/daemon/.od/` — daemon projects + SQLite
- External storage: Cloudflare R2 (bucket `apaiplatform`)

### Service Ports
- Backend API: `localhost:8000`
- Web App (Next.js): `localhost:3000`
- Daemon (Express): `localhost:7456`
- MinIO Console: `localhost:9001`
- MinIO API: `localhost:9000`

---

## QC / BA / DEV / TEST / DEPLOY Conventions

### 🔴 NEVER clear database unless explicitly asked
- `migrate:fresh`, `db:wipe`, manual DELETE are FORBIDDEN unless user explicitly requests.
- User accounts, credits, projects are real test data — clearing them wastes time.
- Only run `db:seed --class=SpecificSeeder` when adding NEW seed data.
- Verified: 18 backend tests pass in Docker without clearing DB.

### 🔄 When to restart which service

| Code changed | Restart command |
|-------------|----------------|
| Daemon `src/` (TypeScript) | `docker compose -f backend/docker-compose.dev.yml up -d --force-recreate daemon` |
| Daemon `skills/` (SKILL.md) | Same as above |
| Daemon `.env` | Same as above (force recreate, not just restart) |
| Backend PHP (Laravel) | `bash scripts/dev.sh restart backend` |
| Backend Filament theme | `bash scripts/dev.sh build backend` |
| Web `apps/web/` (Next.js) | `bash scripts/dev.sh restart web` |
| Docker compose config | `bash scripts/dev.sh restart` |
| Daemon models.ts (add/remove models) | Daemon restart + run `node apps/daemon/scripts/verify-media-models.mjs` |

### 🧪 Testing rules
- Backend tests run inside Docker: `docker exec backend-app-1 php artisan test`
- Target: `--filter="RenderJobPipelineTest|RenderJobTest"` (19 tests, related to our code) — green
- ⚠️ Full suite (2026-06-11): **45 failed / 409 passed / 1 skipped** — failures are test/seed/contract **drift**, NOT production regressions. See `task-status.md` → Test Suite Health. (The old "4 pre-existing failures" note was inaccurate.)
- Verify daemon compiles: `cd apps/daemon && npx tsc --noEmit`
- Verify web compiles: `cd apps/web && npx tsc --noEmit`
- Verify model sync: `node apps/daemon/scripts/verify-media-models.mjs`

### 🔍 QC workflow
1. Trace the FULL flow end-to-end: frontend → Laravel proxy → daemon → provider → webhook → Laravel
2. Check ALL layers for each feature (UI, API, backend, daemon, storage)
3. Identify edge cases: empty state, error state, concurrent requests, race conditions
4. Check credit/payment flow for every feature
5. Verify env files are synced across `.env.example`, `.env.docker`, `.env.local`

### 📊 BA workflow
1. Read official API docs (QwenCloud/DashScope, CKey, etc.) BEFORE implementing — **mandatory, not optional**
2. Compare our implementation with docs for gaps
3. Propose missing features with effort estimates
4. Default to cheapest model for each feature (cost-optimized)
5. **Never assume model parameters** — always verify names, types, valid combos from official docs

### 🚀 Deploy checklist
- [ ] `bash scripts/dev.sh build backend` → Filament theme built
- [ ] `bash scripts/dev.sh build web` → Next.js built
- [ ] `node apps/daemon/scripts/verify-media-models.mjs` → PASS
- [ ] `docker exec backend-app-1 php artisan test` → 18/18 PASS
- [ ] `cd apps/daemon && npx tsc --noEmit` → 0 errors
- [ ] `cd apps/web && npx tsc --noEmit` → pre-existing only
- [ ] `docker exec backend-app-1 php artisan migrate` → 0 failures
- [ ] `bash scripts/dev.sh restart` → all healthy
- [ ] Check `backend/storage/logs/laravel.log` for errors

### 🏗️ Architecture rules
- **Source of truth**: Daemon `models.ts` for models, Laravel `ModelSelector` for defaults
- **API keys**: Only in `apps/daemon/.env` (DASHSCOPE_API_KEY, CKEY_API_KEY) — NOT in `.env.docker`
- **Infra config**: `backend/.env.docker` for DB_HOST, REDIS_HOST, etc. (shared Docker vars)
- **Skills**: `apps/skills/image-direction/` and `apps/skills/video-direction/`
- **Skills content**: Agent instructions in English, display labels in Vietnamese

### 📁 Config files
| File | Purpose |
|------|---------|
| `backend/.env.example` | Laravel local dev template |
| `backend/.env.docker` | Docker shared infra vars |
| `apps/daemon/.env` | Daemon API keys (private) |
| `apps/daemon/.env.example` | Daemon template |
| `apps/web/.env.local` | Next.js local dev |
| `apps/web/.env.example` | Next.js template |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS |
| Media Engine | Express, better-sqlite3 (apps/daemon) |
| Backend | Laravel (JWT, Queue, Reverb, Filament, Email) |
| Databases | SQLite (daemon), MySQL (Laravel - in Docker container) |
