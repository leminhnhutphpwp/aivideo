# Documentation Optimization Plan

## Date
2026-06-14

## Overview
Comprehensive plan to clean up, consolidate, and optimize all documentation in the AI Video Platform project. The system has grown significantly and docs need to be reorganized for clarity, reduced redundancy, and easy navigation.

---

## 1. Current State Analysis

### Files Analyzed

| Category | Files | Total Lines | Issues |
|----------|-------|-------------|--------|
| Root Level | 4 files | ~880 lines | Duplicated content, outdated info |
| Skills | 8 files | ~450 lines | Overlapping with AGENTS.md |
| Plans | 30+ files | ~5000+ lines | Many outdated, some missing |
| Agent Guides | 3 files | ~525 lines | Heavy duplication |
| Worklogs | 80+ files | ~4000+ lines | Well organized, minor cleanup needed |

### Critical Issues Identified

#### A. Outdated Content
1. **`task-status.md`**: Shows "Community Features Implementation — Complete" AND "Community Missing Features — Plan Ready" (contradictory)
2. **`HISTORY.md`**: 178 lines of completed tasks that should be archived
3. **`docs/plans/roadmap.md`**: Phase 1 marked as "Current Sprint (2026-06-05 → 2026-06-12)" but we're at 2026-06-14
4. **`docs/plans/next-tasks.md`**: Says "ALL TASKS COMPLETE" but still has future ideas section
5. **`docs/plans/billing/pricing-review.md`**: 409 lines of detailed analysis that's now historical

#### B. Duplicate Information (HIGH PRIORITY)

| Content | Appears In | Lines Duplicated |
|---------|------------|------------------|
| Architecture diagram | `AGENTS.md`, `README.md`, `architecture/SKILL.md`, `backend/AGENTS.md` | ~40 lines × 4 |
| Best practices patterns | `AGENTS.md`, `backend/AGENTS.md`, `apps/web/AGENTS.md` | ~150 lines × 3 |
| CodeGraph usage | `AGENTS.md`, `backend/AGENTS.md`, `apps/web/AGENTS.md`, `apps/daemon/AGENTS.md` | ~30 lines × 4 |
| Worklog template | `AGENTS.md`, `backend/AGENTS.md`, `apps/web/AGENTS.md`, `apps/daemon/AGENTS.md` | ~20 lines × 4 |
| Tech stack | `AGENTS.md`, `README.md` | ~10 lines × 2 |
| Docker commands | `AGENTS.md`, `backend/AGENTS.md` | ~30 lines × 2 |

**Estimated redundancy: ~800+ lines of duplicated content**

#### C. Missing Information
1. **`docs/plans/README.md`**: Referenced in multiple files but doesn't exist
2. **Planning workflow**: No clear documentation on how @planner agent works
3. **Agent coordination**: No clear handoff documentation between agents

#### D. Inconsistent Formatting
1. Mixed Vietnamese/English (some files fully Vietnamese, some English, some mixed)
2. Different heading styles (some use `##`, some use `###` inconsistently)
3. Inconsistent table formatting
4. Some files have frontmatter, others don't

---

## 2. Critical Issues Found

### Missing Referenced Files (CRITICAL)

The `backend/AGENTS.md` references documentation files that **don't exist**:

| Referenced File | Status |
|-----------------|--------|
| `docs/plans/backend/01-database-schema.md` | ❌ MISSING |
| `docs/plans/backend/02-models-relationships.md` | ❌ MISSING |
| `docs/plans/backend/03-api-routes-controllers.md` | ❌ MISSING |
| `docs/plans/backend/04-queue-jobs.md` | ❌ MISSING |
| `docs/plans/backend/05-auth-billing.md` | ❌ MISSING |
| `docs/plans/backend/06-admin-dashboard.md` | ❌ MISSING |
| `docs/plans/backend/07-realtime-events.md` | ❌ MISSING |
| `docs/plans/backend/08-services.md` | ❌ MISSING |
| `docs/plans/integration/02-job-lifecycle.md` | ❌ MISSING |
| `docs/plans/integration/04-realtime.md` | ❌ MISSING |
| `docs/plans/integration/05-security.md` | ❌ MISSING |
| `docs/plans/appclient/03-api-custom-endpoints.md` | ❌ MISSING |

**Impact**: Backend agent cannot find referenced documentation, leading to confusion and wasted time.

### Broken References in `apps/web/AGENTS.md`

| Referenced File | Status |
|-----------------|--------|
| `docs/plans/appclient/09-ux-flow.md` | ❌ MISSING |
| `docs/plans/integration/01-api-contract.md` | ❌ MISSING |

### Recommended Fix

**Option A**: Remove broken references from AGENTS.md files
**Option B**: Create the missing documentation files
**Option C**: Create a simplified reference guide that consolidates the missing information

**Recommendation**: Option A + C — Remove broken references and create consolidated reference documentation.

---

## 3. Proposed Final Structure

### Target Documentation Architecture

```
/home/minhnhut/DataSwap/www/AIVideoPaltfom/
├── AGENTS.md                    # Slim master guide (~150 lines)
├── README.md                    # Project overview (~100 lines)
├── task-status.md               # Current status ONLY (~100 lines)
├── HISTORY.md                   # Archive (keep as-is, or move to docs/)
│
├── .opencode/
│   └── skills/
│       ├── architecture/SKILL.md      # Keep, update
│       ├── api-contract-daemon/SKILL.md  # Keep, update
│       ├── billing-and-credits/SKILL.md  # Keep, update
│       ├── job-lifecycle/SKILL.md        # Keep, update
│       ├── queue-and-jobs/SKILL.md       # Keep, update
│       ├── realtime-reverb/SKILL.md      # Keep, update
│       ├── simulation-mode/SKILL.md      # Keep, update
│       └── planning/SKILL.md             # Keep, update
│
├── backend/AGENTS.md            # Slim backend guide (~100 lines)
├── apps/web/AGENTS.md           # Slim web guide (~100 lines)
├── apps/daemon/AGENTS.md        # Slim daemon guide (~100 lines)
│
├── docs/
│   ├── README.md                # NEW: Documentation index
│   ├── architecture.md          # NEW: Single source of truth for architecture
│   ├── getting-started.md       # NEW: Quick start guide
│   ├── conventions.md           # NEW: Coding & documentation conventions
│   ├── plans/                   # Cleaned up plans
│   │   ├── README.md            # NEW: Plans index
│   │   ├── roadmap.md           # Updated: Current roadmap
│   │   ├── active/              # NEW: Currently active plans only
│   │   ├── completed/           # NEW: Archived completed plans
│   │   └── ideas/               # NEW: Future considerations
│   └── reference/               # NEW: Reference documentation
│       ├── api-contracts.md     # Consolidated API documentation
│       ├── database-schema.md   # Database documentation
│       └── deployment.md        # Deployment guide
│
└── worklogs/                    # Keep structure, update INDEX.md files
```

### File Changes Summary

| Action | File | Reason |
|--------|------|--------|
| **DELETE** | `docs/plans/next-tasks.md` | Merged into roadmap.md |
| **DELETE** | `docs/plans/billing/pricing-review.md` | Historical, move to completed/ |
| **DELETE** | `docs/plans/billing/pricing-analysis.md` | Historical, move to completed/ |
| **DELETE** | `docs/plans/billing/pricing-margin-analysis.md` | Historical, move to completed/ |
| **DELETE** | `docs/plans/billing/pricing-softening-summary.md` | Historical, move to completed/ |
| **DELETE** | `docs/plans/billing/pricing-softening-strategy.md` | Historical, move to completed/ |
| **DELETE** | `docs/plans/storyboard-professional-analysis.md` | Move to completed/ |
| **DELETE** | `docs/plans/storyboard/professional-storyboard-analysis.md` | Duplicate of above |
| **MOVE** | `docs/plans/billing/*.md` → `docs/plans/completed/billing/` | Archive completed plans |
| **MOVE** | `docs/plans/storyboard/*.md` → `docs/plans/completed/storyboard/` | Archive completed plans |
| **MOVE** | `docs/plans/ui/*.md` → `docs/plans/completed/ui/` | Archive completed plans |
| **MOVE** | `docs/plans/integration/*.md` → `docs/plans/completed/integration/` | Archive completed plans |
| **CREATE** | `docs/README.md` | Documentation index |
| **CREATE** | `docs/architecture.md` | Single source of truth |
| **CREATE** | `docs/getting-started.md` | Quick start guide |
| **CREATE** | `docs/conventions.md` | Coding conventions |
| **CREATE** | `docs/plans/README.md` | Plans index |
| **CREATE** | `docs/plans/active/` | Active plans directory |
| **CREATE** | `docs/plans/completed/` | Completed plans directory |
| **CREATE** | `docs/plans/ideas/` | Future ideas directory |
| **UPDATE** | `AGENTS.md` | Reduce from 338 to ~150 lines |
| **UPDATE** | `backend/AGENTS.md` | Reduce from 228 to ~100 lines |
| **UPDATE** | `apps/web/AGENTS.md` | Reduce from 163 to ~100 lines |
| **UPDATE** | `apps/daemon/AGENTS.md` | Reduce from 134 to ~100 lines |
| **UPDATE** | `task-status.md` | Remove completed tasks, keep current only |
| **UPDATE** | `README.md` | Update with current state |
| **UPDATE** | `docs/plans/roadmap.md` | Update to current date |

---

## 4. Detailed Optimization Plan

### Phase 1: Create New Documentation Files (Day 1)

#### 1.1 Create `docs/README.md` (Documentation Index)
```markdown
# Documentation Index

## Quick Links
- [Getting Started](getting-started.md) — Setup and first steps
- [Architecture](architecture.md) — System design and data flow
- [Conventions](conventions.md) — Coding and documentation standards
- [Roadmap](plans/roadmap.md) — Development phases and status

## By Role
### New Developers
1. [Getting Started](getting-started.md)
2. [Architecture](architecture.md)
3. [Conventions](conventions.md)

### Backend Developers
- [Backend Agent Guide](../backend/AGENTS.md)
- [API Contracts](reference/api-contracts.md)
- [Database Schema](reference/database-schema.md)

### Frontend Developers
- [Web Agent Guide](../apps/web/AGENTS.md)
- [UI Conventions](conventions.md#ui-conventions)

### DevOps
- [Deployment Guide](reference/deployment.md)
- [Docker Setup](getting-started.md#docker-setup)

## Plans
- [Active Plans](plans/active/) — Currently in progress
- [Completed Plans](plans/completed/) — Archive of finished work
- [Future Ideas](plans/ideas/) — Backlog and proposals
```

#### 1.2 Create `docs/architecture.md` (Single Source of Truth)
```markdown
# AI Video Platform — Architecture

## System Overview

```
Next.js (port 3000) ──HTTP──► Laravel (port 8000)
                                      │
                                      │ (webhook callback)
                                      ▼
                              Daemon (port 7456)
```

## Layers

### Frontend (apps/web)
- **Technology**: Next.js 15 (App Router), TypeScript, Tailwind CSS 4
- **Port**: 3000
- **Responsibilities**: UI, auth flows, storyboard editor, media preview
- **Key Files**: `src/app/`, `src/components/`, `src/lib/api/client.ts`

### Backend (backend/)
- **Technology**: Laravel 12, PHP 8.2, MySQL, Redis
- **Port**: 8000
- **Responsibilities**: Auth, credits, queue, admin, email, webhook handling
- **Key Files**: `app/Services/`, `app/Http/Controllers/API/`, `routes/api.php`

### Daemon (apps/daemon/)
- **Technology**: Express, TypeScript, SQLite
- **Port**: 7456
- **Responsibilities**: Media generation, provider integration, file management
- **Key Files**: `src/media/`, `src/providers/`, `src/projects/`

## Data Flow

### Job Lifecycle
1. User creates storyboard → Laravel stores in DB
2. User clicks render → Laravel creates RenderJob (status: queued)
3. Laravel dispatches to queue → Worker picks up job
4. Laravel calls Daemon API → Daemon creates task
5. Daemon processes with AI provider → Sends progress webhook
6. Daemon completes → Sends completion webhook to Laravel
7. Laravel updates RenderJob status → Sends realtime event via Reverb
8. Frontend receives WebSocket update → Shows completion

### Community Features
- **Unit of publish**: RenderJob (individual assets), NOT Storyboard
- **Feed query**: `RenderJob::published()` with visibility filter
- **Publish endpoint**: `PATCH /render-jobs/{uuid}/publish`

## Key Patterns

### One-Shot vs Multi-Scene
- **Multi-scene** (`render_mode: multi_scene`): Per-scene settings, FFmpeg concat
- **One-Shot** (`render_mode: single_flow`): Shared settings, single generation

### Credit Calculation
- **Single source**: `PricingCalculator::calculate()`
- **Never hardcode**: Use API endpoints for duration/quality options

### Asset Security
- **Never expose raw daemon paths** to frontend
- **Always use**: `fetchRawFile(projectId, fileName)` for authenticated access

## Related Documentation
- [API Contracts](reference/api-contracts.md)
- [Database Schema](reference/database-schema.md)
- [Deployment](reference/deployment.md)
```

#### 1.3 Create `docs/getting-started.md`
```markdown
# Getting Started

## Prerequisites
- Docker Desktop
- Node.js 18+
- Git

## Quick Start

### 1. Clone & Start
```bash
git clone <repo-url>
cd AIVideoPaltfom

# Start backend (Docker)
cd backend
docker compose -f docker-compose.dev.yml up -d

# Start frontend
cd apps/web
npm install
npm run dev
```

### 2. Access Services
| Service | URL |
|---------|-----|
| Web App | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| Admin Panel | http://localhost:8000/admin |
| MinIO Console | http://localhost:9001 |

### 3. Development Commands
```bash
# Start all services
bash scripts/dev.sh start

# Start specific service
bash scripts/dev.sh start backend
bash scripts/dev.sh start web

# Run tests
docker exec aivideo-app-1 php artisan test
cd apps/web && npm test
cd apps/daemon && npm test

# Build for production
bash scripts/dev.sh build all
```

## Docker Services
| Container | Port | Purpose |
|-----------|------|---------|
| aivideo-app-1 | 8000 | Laravel API |
| backend-daemon-1 | 7456 | Media engine |
| backend-queue-1 | — | Queue worker |
| backend-reverb-1 | 8080 | WebSocket |
| backend-mysql-1 | 3307 | Database |
| backend-redis-1 | 6380 | Cache/Queue |
| backend-minio-1 | 9000 | Object storage |

## Environment Files
| File | Purpose |
|------|---------|
| `backend/.env` | Laravel config (Docker) |
| `apps/daemon/.env` | Daemon config |
| `apps/web/.env.local` | Next.js config |

## Next Steps
- [Architecture Overview](architecture.md)
- [Coding Conventions](conventions.md)
- [Backend Agent Guide](../backend/AGENTS.md)
```

#### 1.4 Create `docs/conventions.md`
```markdown
# Coding & Documentation Conventions

## Language
- **Code comments**: English
- **UI text**: Vietnamese
- **Documentation**: English (technical), Vietnamese (user-facing)
- **Git commits**: English

## Code Style

### TypeScript/JavaScript
- Strict TypeScript
- ESLint + Prettier
- Functional components (React)
- Hooks for state management

### PHP/Laravel
- PSR-12 coding standard
- PHPStan level 6+
- FormRequest for validation
- Service layer for business logic

## Documentation Standards

### File Naming
- **Plans**: `docs/plans/<category>/<feature-name>.md`
- **Worklogs**: `<scope>/worklogs/<YYYY-MM-DD>-<task-slug>.md`
- **Skills**: `.opencode/skills/<name>/SKILL.md`

### Plan Template
```markdown
# [Feature Name] — Plan

## Date
YYYY-MM-DD

## Overview
2-3 sentences.

## User Stories
- As a [user], I want [action] so that [benefit]

## Technical Design
### Data Flow
### API Contracts
### Components

## Tasks
| # | Layer | Task | Agent | Est. |
|---|-------|------|-------|------|
```

### Worklog Template
```markdown
# [Task Name] — Worklog

## Date
YYYY-MM-DD

## Overview
Brief description.

## Files Changed
| File | Change |
|------|--------|
| `path/to/file` | Description |

## Key Decisions
1. ...

## Verification
- [ ] Tests pass
- [ ] Lint clean

## Handoff Notes
- **@agent needs to know**: ...
```

## Agent Rules

### Boundaries
| Agent | Scope | Never Touch |
|-------|-------|-------------|
| @backend | `backend/` | `apps/web/`, `apps/daemon/` |
| @web | `apps/web/` | `backend/`, `apps/daemon/` |
| @daemon | `apps/daemon/` | `backend/`, `apps/web/` |

### Post-Task Workflow
1. ✅ Run verification (typecheck, tests)
2. ✅ Write worklog in `<scope>/worklogs/`
3. ✅ Update `task-status.md`
4. ✅ Report to user

### CodeGraph Usage
**MANDATORY**: Use `codegraph_*` tools before grep/read for:
- Symbol definitions
- Callers/callees
- Impact analysis
- File structure

Only use grep for:
- Literal text search
- Comments/logs
- After CodeGraph returns no results
```

### Phase 2: Consolidate Existing Files (Day 2)

#### 2.1 Slim Down `AGENTS.md` (338 → ~150 lines)

**Keep:**
- Agent boundaries table
- Project structure (simplified)
- First-time reader guide
- Available agents table
- Architecture diagram (one-liner)
- Key documents table
- CodeGraph usage (condensed)
- Conventions (condensed)

**Move to `docs/conventions.md`:**
- Best practices patterns (Storyboard, Media Types, Asset Security, etc.)
- Pricing best practices
- Voiceover pattern
- Rate limiting details
- Edge labels

**Move to `docs/architecture.md`:**
- Detailed architecture explanation
- Community architecture

**Move to `docs/getting-started.md`:**
- Development environment details
- Docker setup
- Service ports

**Delete/Archive:**
- QC/BA/DEV/TEST/DEPLOY conventions (move to conventions.md)
- Tech stack table (already in README.md)

#### 2.2 Slim Down `backend/AGENTS.md` (228 → ~100 lines)

**Keep:**
- Scope warning
- Cross-references table
- Quick reference commands
- Structure overview
- CodeGraph usage (condensed)

**Move to `docs/conventions.md`:**
- Storyboard One-Shot details
- Credit calculation details
- Asset type details
- Duration tiers
- Voiceover details
- Rate limiting details
- Model/provider sync rules

**Move to `docs/reference/api-contracts.md`:**
- API-specific patterns

#### 2.3 Slim Down `apps/web/AGENTS.md` (163 → ~100 lines)

**Keep:**
- Scope warning
- Structure overview
- Routes table
- Conventions (condensed)
- Quick start

**Move to `docs/conventions.md`:**
- Storyboard architecture details
- Media types details
- Image security
- Pricing UI details
- Voiceover details
- Edge labels
- Rate limiting UX

#### 2.4 Slim Down `apps/daemon/AGENTS.md` (134 → ~100 lines)

**Keep:**
- Scope warning
- Quick start
- API endpoints table
- Simulation mode (condensed)
- CodeGraph usage (condensed)
- Provider list
- Model/provider sync rules

**Move to `docs/reference/api-contracts.md`:**
- Detailed API patterns

#### 2.5 Clean Up `task-status.md`

**Current issues:**
- Shows completed tasks as "Complete"
- Has contradictory sections
- Mixes current and historical

**New structure:**
```markdown
# Task Status

> Last updated: YYYY-MM-DD

## Current Sprint
[Only active tasks]

## Recently Completed (Last 7 Days)
[Minimal list with links to worklogs]

## Test Health
[Current test status]

## Agent Sessions (Last 7 Days)
[Recent activity]

## Future Considerations
[Ideas, not tasks]
```

#### 2.6 Archive Completed Plans

**Create directories:**
```
docs/plans/active/          # Currently in progress
docs/plans/completed/       # Finished work
docs/plans/ideas/           # Future proposals
```

**Move files:**
- All billing plans → `docs/plans/completed/billing/`
- All storyboard plans → `docs/plans/completed/storyboard/`
- All UI plans → `docs/plans/completed/ui/`
- All integration plans → `docs/plans/completed/integration/`
- Community plans → `docs/plans/active/community/` (if still active)

**Create `docs/plans/README.md`:**
```markdown
# Plans Index

## Active Plans
Plans currently being implemented:
- [Community Features](active/community/)

## Completed Plans
Archive of finished work:
- [Billing](completed/billing/)
- [Storyboard](completed/storyboard/)
- [UI](completed/ui/)
- [Integration](completed/integration/)

## Future Ideas
Backlog and proposals:
- [Storyboard Professional](ideas/storyboard-professional.md)
- [Backend Tests](ideas/backend-tests.md)
```

### Phase 3: Update & Verify (Day 3)

#### 3.1 Update `docs/plans/roadmap.md`
- Update dates to reflect current date
- Mark completed phases
- Add links to completed plans

#### 3.2 Update `README.md`
- Add link to `docs/README.md`
- Update quick start to reference `docs/getting-started.md`
- Keep concise

#### 3.3 Update Skills Files
- Add cross-references to new documentation
- Remove duplicated content
- Keep skills focused on their specific domain

#### 3.4 Update Worklog INDEX.md Files
- Ensure all worklogs are indexed
- Add links to relevant plans

#### 3.5 Verification Checklist
- [ ] All links work
- [ ] No duplicate content across files
- [ ] All outdated content removed or archived
- [ ] Consistent formatting throughout
- [ ] Vietnamese/English usage consistent
- [ ] All agents can find needed information quickly

---

## 5. Content Migration Map

### From `AGENTS.md` (338 lines)

| Section | Lines | Destination | Action |
|---------|-------|-------------|--------|
| Agent Boundaries | 10 | Keep | Condense |
| Project Structure | 30 | Keep | Simplify |
| First time here? | 15 | Keep | Update |
| Available Agents | 15 | Keep | Keep |
| Architecture | 10 | `docs/architecture.md` | Move |
| Best Practices | 100 | `docs/conventions.md` | Move |
| Key Documents | 15 | Keep | Update |
| CodeGraph | 40 | Keep | Condense |
| Conventions | 10 | `docs/conventions.md` | Move |
| Documentation After Task | 20 | `docs/conventions.md` | Move |
| Development Environment | 50 | `docs/getting-started.md` | Move |
| QC/BA/DEV/TEST/DEPLOY | 60 | `docs/conventions.md` | Move |
| Tech Stack | 10 | `README.md` | Remove (duplicate) |

### From `backend/AGENTS.md` (228 lines)

| Section | Lines | Destination | Action |
|---------|-------|-------------|--------|
| Scope Warning | 5 | Keep | Keep |
| Cross-References | 15 | Keep | Update |
| Documentation to Read | 20 | `docs/README.md` | Move |
| Overview | 5 | Keep | Keep |
| Worklog Template | 25 | `docs/conventions.md` | Move |
| Quick Reference | 30 | Keep | Condense |
| Structure | 25 | Keep | Keep |
| CodeGraph | 20 | Keep | Condense |
| Rules | 5 | Keep | Keep |
| Detailed Patterns | 80 | `docs/conventions.md` | Move |

### From `apps/web/AGENTS.md` (163 lines)

| Section | Lines | Destination | Action |
|---------|-------|-------------|--------|
| Worklog Template | 25 | `docs/conventions.md` | Move |
| Structure | 25 | Keep | Keep |
| Routes | 20 | Keep | Keep |
| Conventions | 15 | Keep | Condense |
| Detailed Patterns | 60 | `docs/conventions.md` | Move |
| Quick Start | 5 | Keep | Keep |
| CodeGraph | 15 | Keep | Condense |
| Reference | 5 | `docs/README.md` | Move |

### From `apps/daemon/AGENTS.md` (134 lines)

| Section | Lines | Destination | Action |
|---------|-------|-------------|--------|
| Worklog Template | 25 | `docs/conventions.md` | Move |
| Quick Start | 10 | Keep | Keep |
| API Endpoints | 25 | Keep | Keep |
| Simulation Mode | 25 | Keep | Condense |
| CodeGraph | 15 | Keep | Condense |
| Providers | 15 | Keep | Keep |
| Model Sync | 15 | Keep | Keep |

---

## 6. Benefits of Optimization

### Before
- **Total documentation**: ~7000+ lines
- **Duplication**: ~800+ lines (11%)
- **Navigation**: Confusing, many entry points
- **Maintenance**: High effort, easy to miss updates
- **Onboarding**: Difficult to find right information

### After
- **Total documentation**: ~3000-4000 lines (40-50% reduction)
- **Duplication**: <100 lines (<3%)
- **Navigation**: Clear hierarchy, single entry points
- **Maintenance**: Low effort, update once
- **Onboarding**: Progressive disclosure, role-based paths

### Key Improvements
1. **Single source of truth** for architecture, conventions, getting started
2. **No redundancy** — each piece of information exists in one place
3. **Easy navigation** — clear index files and cross-references
4. **Role-based paths** — new developers, backend, frontend, DevOps
5. **Archived history** — completed work accessible but not cluttering active docs
6. **Consistent formatting** — unified style throughout

---

## 7. Implementation Timeline

### Day 1: Create New Files
- [ ] Create `docs/README.md`
- [ ] Create `docs/architecture.md`
- [ ] Create `docs/getting-started.md`
- [ ] Create `docs/conventions.md`
- [ ] Create `docs/plans/README.md`
- [ ] Create directory structure (`active/`, `completed/`, `ideas/`)

### Day 2: Consolidate & Move
- [ ] Slim down `AGENTS.md`
- [ ] Slim down `backend/AGENTS.md`
- [ ] Slim down `apps/web/AGENTS.md`
- [ ] Slim down `apps/daemon/AGENTS.md`
- [ ] Move completed plans to `completed/`
- [ ] Clean up `task-status.md`

### Day 3: Update & Verify
- [ ] Update `docs/plans/roadmap.md`
- [ ] Update `README.md`
- [ ] Update skills files
- [ ] Update worklog INDEX.md files
- [ ] Verify all links
- [ ] Test navigation flow

---

## 8. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing links | Medium | Keep old files as redirects for 1 week |
| Agent confusion during transition | Medium | Announce changes, update agent prompts |
| Missing information after consolidation | Low | Review checklist, verify each agent can find info |
| Time investment | Medium | Phased approach, prioritize high-impact changes |

---

## 9. Success Criteria

- [ ] All documentation files follow consistent format
- [ ] No duplicate content across files
- [ ] All outdated content archived or removed
- [ ] New developer can onboard in <1 hour using docs
- [ ] Each agent can find needed information in <2 minutes
- [ ] All links work correctly
- [ ] Documentation maintenance effort reduced by 50%+

---

## 10. Next Steps After Optimization

1. **Create documentation linting** — automated checks for consistency
2. **Add documentation tests** — verify links, check for outdated content
3. **Schedule monthly reviews** — keep docs up to date
4. **Gather feedback** — improve based on developer experience
5. **Consider auto-generation** — API docs from code, architecture from diagrams
