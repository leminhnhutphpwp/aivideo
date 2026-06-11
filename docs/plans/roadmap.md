# AI Video Platform — Development Roadmap

> **Last updated**: 2026-06-11
> **Status**: Pre-MVP, active development

---

## Phase 0: Foundation ✅ Complete
*Target: Stable dev environment, core architecture, initial features*

| Task | Status | Scope | Notes |
|------|--------|-------|-------|
| Docker dev environment setup | ✅ Done | infra | Laravel + MySQL + Redis + MinIO + Daemon |
| Laravel JWT auth | ✅ Done | backend | tymon/jwt-auth, guard `auth:api` |
| Filament admin panel | ✅ Done | backend | v5 + Shield permissions |
| Daemon media engine | ✅ Done | daemon | Express + SQLite, 13 providers |
| Next.js 15 App Router setup | ✅ Done | web | TypeScript, Tailwind, App Router |
| Rebranding Wise → Wavise Studio | ✅ Done | web | + GSAP landing page animations |
| Pricing system | ✅ Done | backend | PricingCalculator, DurationTiers, CreditSettings |
| Simulation mode | ✅ Done | daemon | Toggle-able fake media generation |
| Credit pack UI + bank transfer | ✅ Done | web+backend | CreditPackSection + BankInfoModal |
| Competitor comparison | ✅ Done | web | Wavise vs Kling vs Runway vs Pika |

---

## Phase 1: MVP Core 🔴 Current Sprint (2026-06-05 → 2026-06-12)
*Target: Production-ready MVP with all core features stable*

### P0 — Production Readiness (Priority: Critical)

| # | Task | Effort | Scope | Status |
|---|------|--------|-------|--------|
| 1.1 | Memory files regeneration | 1h | docs | ✅ Done |
| 1.2 | Formal roadmap document | 1h | docs | 🔄 In Progress |
| 1.3 | Triage test failures | 2-3h | backend | ✅ Completed |
| 1.4 | StoryboardImagePanel tests | 3-4h | web | ✅ Completed |
| 1.5 | Viewer cancel/retry/progress | 4h | web+backend | ✅ Done (verified 2026-06-11) |
| 1.6 | Realtime progress via WebSocket | 6-8h | web+backend | ✅ Done (verified 2026-06-11) |
| 1.7 | Error boundaries & 404 pages | 3-4h | web | ✅ Done (verified 2026-06-11) |

### 1.1 — Memory Files Regeneration
**Files**: `.opencode/memory/*.md`
- `project-config.md` — tech stack, paths, env
- `architecture.md` — 3-layer architecture, Docker setup
- `commands.md` — dev/docker/test commands
- `conventions.md` — coding conventions from AGENTS.md
- `known-issues.md` — current bugs + workarounds
- `project-context.md` — summary of what's built, milestone status

### 1.2 — Roadmap Document
**Files**: `docs/plans/roadmap.md`

### 1.3 — Triage Test Failures
**Scope**: backend (Docker)
- Run `docker exec backend-app-1 php artisan test`
- Identify failures in: CreditApiTest, SocialiteTest, SecurityTest
- Fix if possible, document otherwise
- Expected: 4 pre-existing failures unrelated to new code

### 1.4 — StoryboardImagePanel Tests
**Scope**: web
- Follow existing test patterns in `apps/web/`
- Test panel rendering, upload, generate, compile prompt
- Test credit estimation for `storyboard_image` mode

### 1.5 — Viewer Improvement
**Scope**: web + backend
- Add cancel button for rendering jobs
- Add retry button for failed jobs
- Show progress from daemon (via wait endpoint)

**Backend changes**:
- `StoryboardController::cancelRender()` — new endpoint
- `StoryboardController::retryRender()` — new endpoint
- `StoryboardRenderer::handleCancellation()` — logic

**Frontend changes**:
- `apps/web/src/app/(builder)/studio/storyboard/flow/[uuid]/page.tsx` — cancel/retry buttons
- Progress bar/badge from daemon progress

### 1.6 — Realtime Progress via WebSocket
**Scope**: web + backend
- Read `.opencode/skills/realtime-reverb/SKILL.md`
- Connect frontend viewer to Reverb channel
- Replace polling with event-driven updates

**Backend changes**:
- `JobProgressUpdated` event
- Reverb channel auth
- Broadcast progress on webhook receipt

**Frontend changes**:
- `useReverbProgress` hook
- WebSocket subscription in viewer page
- Fallback to polling if WS unavailable

### 1.7 — Error Boundaries & 404 Pages
**Scope**: web
- Custom 404 page (`not-found.tsx`)
- Error boundary components per route group
- Error fallback UI consistent with dark theme

---

## Phase 2: Feature Completion 🟡 Next Sprint (2026-06-12 → 2026-06-26)
*Target: Complete all planned features, polish UI*

| # | Task | Effort | Scope | Notes |
|---|------|--------|-------|-------|
| 2.1 | Forgot password flow | 4h | web+backend | Backend endpoints done, UI needed |
| 2.2 | Email verification flow | 4h | web+backend | Backend endpoints done, UI needed |
| 2.3 | Character animation feature | 6h | daemon+backend+web | Phase 2 (Phase 1 done) |
| 2.4 | Video editing API gaps | 8h | backend+web | Gap analysis from worklog |
| 2.5 | Landing page settings | 6h | backend+web | 44 fields, admin tabs, server-render SEO |
| 2.6 | Rate limiting UX | 3h | web | Vietnamese 429 message, retry countdown |
| 2.7 | Mobile responsiveness audit | 6h | web | All pages mobile-optimized |

---

## Phase 3: Polish & Scale 🟢 Future (2026-06-26 → 2026-07-10)
*Target: Production deployment, performance, security*

| # | Task | Effort | Scope |
|---|------|--------|-------|
| 3.1 | Security hardening | 8h | all |
| 3.2 | Performance optimization | 8h | all |
| 3.3 | PHPStan level max | 4h | backend |
| 3.4 | E2E testing (Playwright) | 16h | all |
| 3.5 | Load testing | 8h | all |
| 3.6 | Docs finalization | 8h | all |
| 3.7 | Production deployment | 4h | infra |

---

## Effort Estimation Notes
- **1h** = documentation, config changes
- **2-4h** = single-file feature, well-understood pattern
- **4-8h** = cross-cutting feature, multiple files/services
- **8-16h** = complex feature, new patterns, research needed

## Dependencies Map
```
Memory Files ──► Roadmap
                     │
                     ▼
              Test Triage ──► (blocker removed)
                     │
              ┌──────┴──────┐
              ▼              ▼
       ImagePanel       Viewer
         Tests        Improvements
              │              │
              └──────┬──────┘
                     ▼
              Realtime Progress
                     │
                     ▼
            Error Boundaries
```

## Success Criteria
- [ ] All P0 tasks complete — no critical bugs open
- [x] Targeted backend suite green — `--filter="RenderJobPipelineTest|RenderJobTest"` → 19 pass (verified 2026-06-11)
- [ ] Full backend suite — currently **45 failed / 409 passed / 1 skipped** (2026-06-11). Failures are test/seed/contract **drift**, not production regressions (see `task-status.md` → Test Suite Health). Target: triage to 0 failed.
- [x] Web `tsc --noEmit`: 0 errors (verified 2026-06-11)
- [x] Daemon `tsc --noEmit`: 0 errors (verified 2026-06-11)
- [ ] Model sync verified
- [x] All 3 render modes functional (multi_scene, single_flow, storyboard_image)
- [x] Realtime progress working for all job types
- [x] Error states handled gracefully with user-friendly messages

## Rollback Plan
If a P0 task introduces regressions:
1. Revert the specific commit/change
2. Run full test suite
3. Verify with tsc --noEmit on affected services
4. Document issue in known-issues.md
5. Re-assign to backlog with priority label
