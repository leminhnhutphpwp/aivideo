# Next Tasks — AI Video Platform

## Date
2026-06-01

---

## Current Status Summary

### ✅ Recently Completed
- Storyboard Phase 0 refactor (page.tsx 1456 → 19 lines)
- 5 Quick Wins từ Alibaba Cloud Model Studio (adaptive polling, prompt_extend, negative prompt, task metrics, video download retry)
- Skills & training data updates (Qwen Cloud section, getProviderHints, NEGATIVE_PROMPT_PROVIDERS)
- TaskMetricsService::warn() → warning() fix
- Pricing Plan Final — DurationTier + PlanSeeder + CreditSettings
- Security Hardening + Production Scale Optimization
- Documentation System Overhaul + Model Sync Fix
- Phase 4 — Registry Refactor + Skeleton UX
- Phase 1 Critical Fixes — ElevenLabs Provider
- Rebranding & GSAP Cinematic Polish
- Credit Pack Purchase UI (worklog exists, pending visual/functional tests)

### 🔴 Current Issues
1. **TypeScript Errors**: 14 errors in web app (13 hideText prop issues, 1 test file)
2. **Pending Tasks**: Multiple high-priority items ready for implementation
3. **Unresolved Worklogs**: Credit Pack UI needs testing, Vite CPU fix needs Docker restart

---

## Priority Tasks

### P0: Bugs Need Immediate Fix

#### 1. Fix TypeScript Errors — hideText Prop Missing
- **Files**: 13 server shell components + hero-section.tsx
- **Effort**: 1h
- **Reason**: 13 TypeScript errors prevent clean build
- **Details**: 
  - Server shell components pass `hideText` prop but client components don't accept it
  - Need to add `hideText?: boolean` prop to all 13 section components
  - When `hideText=true`: text elements get `sr-only` class and `aria-hidden="true"`
- **Plan Reference**: `docs/plans/ui/server-render-landing-seo.md` Phase 2
- **Agent**: @web

#### 2. Fix PricingPlans.test.tsx — Missing beforeEach
- **File**: `src/components/billing/__tests__/PricingPlans.test.tsx`
- **Effort**: 15m
- **Reason**: Test file has syntax error preventing test execution
- **Agent**: @web

### P1: Important Features In Progress

#### 3. Complete Server Render Landing SEO — Phase 3
- **Files**: `app/page.tsx` + 13 server shell components
- **Effort**: 1.5h
- **Reason**: Phase 1 (server shells) and Phase 2 (hideText props) are done but not wired
- **Details**:
  - Update `page.tsx` to import from `server/` directory
  - Remove `next/dynamic` for above-fold sections (Hero, Reel, Intro)
  - Keep lazy loading for below-fold sections
- **Plan Reference**: `docs/plans/ui/server-render-landing-seo.md` Phase 3
- **Agent**: @web

#### 4. VN Market Pricing Strategy — Web UI Updates
- **Files**: `apps/web/src/app/(dashboard)/billing/page.tsx` + pricing components
- **Effort**: 3.5h
- **Reason**: Backend done, needs frontend updates for new pricing
- **Details**:
  - Update /pricing page with new Pro 210k price
  - Add Studio "Sắp ra mắt" badge
  - Credit pack purchase UI (plan exists)
- **Plan Reference**: `docs/plans/billing/final-pricing-plan.md`
- **Agent**: @web

#### 5. Credit Pack Purchase UI — Visual & Functional Testing
- **Files**: `apps/web/src/components/billing/CreditPackSection.tsx`
- **Effort**: 1h
- **Reason**: Implementation done but pending verification
- **Details**:
  - Test 3 pack cards display correctly
  - Test selection highlight and inline confirm
  - Test BankInfoModal display
  - Test locked state (3+ pending)
- **Worklog**: `apps/web/worklogs/2026-06-01-credit-pack-ui.md`
- **Agent**: @web + @tester

### P2: Improvements Worth Doing

#### 6. Refactor ManageGeneralSettings → Tab-per-File
- **Files**: `backend/app/Filament/General/Widgets/ManageGeneralSettings.php`
- **Effort**: 1h
- **Reason**: Blocker for Landing Page Settings, improves maintainability
- **Details**:
  - Create 19 Tab classes
  - Rewrite ManageGeneralSettings::form() as thin orchestrator
  - Verify with tests
- **Plan Reference**: `docs/plans/ui/manage-general-settings-refactor.md`
- **Agent**: @backend

#### 7. Landing Page Settings — Phase 1
- **Files**: Backend (GeneralSettings, ManageGeneralSettings) + Web (useLandingSettings hook)
- **Effort**: 3h
- **Reason**: Allows admin to manage landing page content
- **Details**:
  - Add 11 Hero + Portal fields to GeneralSettings
  - Add 2 tabs to ManageGeneralSettings
  - Create public API endpoint
  - Create useLandingSettings hook
- **Plan Reference**: `docs/plans/ui/landing-page-settings.md`
- **Agent**: @backend + @web

#### 8. Remove Scene Repeater — Video Pages
- **Files**: `apps/web/src/app/(dashboard)/video/[feature]/page.tsx`
- **Effort**: 1.5h
- **Reason**: Simplify UX, Storyboard handles multi-scene better
- **Details**:
  - Single scene state, remove loop/add/remove
  - Update video-scene-editor.tsx
  - Update video-sidebar.tsx
  - Delete/redirect multi-scene page
- **Plan Reference**: `docs/plans/ui/remove-scene-repeater.md`
- **Agent**: @web

#### 9. ElevenLabs Voice UI
- **Files**: `apps/web/src/` voice selector components
- **Effort**: 2h
- **Reason**: Daemon Phase 1 done, needs frontend integration
- **Details**:
  - Add voice selector UI for ElevenLabs TTS + SFX
  - Integrate with existing voiceover modal
- **Dependencies**: Daemon voice endpoints ready
- **Agent**: @web

### P3: Nice-to-Have

#### 10. Storyboard Dual Mode — Phase 0 Refactor Completion
- **Files**: `apps/web/src/app/(builder)/studio/storyboard/flow/`
- **Effort**: 12.5h (remaining)
- **Reason**: Foundation for single-flow narrative mode
- **Details**:
  - Complete Phase 0 (constants, components, hooks, utils, UI, multi-scene)
  - Phase 1-3: Backend migration, AI compile pipeline, single-flow render
  - Phase 4: Frontend single-flow editor
  - Phase 5: Testing
- **Plan Reference**: `docs/plans/storyboard/phase0-refactor-detail.md`
- **Agent**: @web + @backend + @daemon

#### 11. Vite CPU Fix — Docker Restart
- **File**: `backend/docker-compose.dev.yml`
- **Effort**: 5m
- **Reason**: CHOKIDAR_USEPOLLING removed, needs restart to apply
- **Details**:
  - User needs to run: `sudo kill 5480 && docker compose -f backend/docker-compose.dev.yml up -d --force-recreate vite`
- **Worklog**: `worklogs/2026-05-28-vite-high-cpu-fix.md`
- **Agent**: Manual action required

---

## Recommended Execution Order

### Immediate (Next 2-4 hours)
1. Fix TypeScript errors (P0) — 1.25h
2. Complete Server Render SEO Phase 3 (P1) — 1.5h
3. Credit Pack UI testing (P1) — 1h

### Short-term (Next 1-2 days)
4. VN Market Pricing Web UI (P1) — 3.5h
5. Refactor ManageGeneralSettings (P2) — 1h
6. Landing Page Settings Phase 1 (P2) — 3h

### Medium-term (Next week)
7. Remove Scene Repeater (P2) — 1.5h
8. ElevenLabs Voice UI (P2) — 2h
9. Storyboard Phase 0 completion (P3) — 12.5h

### One-time Action
10. Vite Docker restart (P3) — 5m manual

---

## Dependencies

```
ManageGeneralSettings Refactor (P2)
    ↓
Landing Page Settings Phase 1 (P2)
    ↓
Server Render SEO Phase 2 (future)

Server Render SEO Phase 3 (P1)
    ↓
TypeScript Errors Fix (P0)

Credit Pack UI Testing (P1)
    ↓
VN Market Pricing Web UI (P1)

ElevenLabs Voice UI (P2)
    ↓
Daemon Phase 1 (already done)

Storyboard Phase 0 (P3)
    ↓
Phase 1-3 (Backend + Daemon)
    ↓
Phase 4 (Frontend single-flow)
```

---

## Agent Assignment Summary

| Agent | Tasks | Total Effort |
|-------|-------|--------------|
| @web | P0: Fix TS errors, Fix test; P1: Server Render SEO, Pricing UI, Credit Pack testing; P2: Scene Repeater, ElevenLabs UI; P3: Storyboard Phase 0 | ~23h |
| @backend | P2: ManageGeneralSettings refactor, Landing Page Settings | ~4h |
| @daemon | P3: Storyboard Phase 1-3 (shared with backend) | ~8h |
| @tester | P1: Credit Pack UI testing | ~1h |
| Manual | Vite Docker restart | 5m |

---

## Risk Assessment

| Task | Risk | Mitigation |
|------|------|------------|
| TypeScript errors fix | Low | Straightforward prop additions |
| Server Render SEO Phase 3 | Low | Simple import changes, no logic changes |
| Credit Pack UI testing | Medium | Requires manual visual testing |
| VN Market Pricing UI | Low | UI updates, backend already done |
| ManageGeneralSettings refactor | Medium | Large file refactor, needs careful testing |
| Landing Page Settings | Medium | Cross-cutting backend+frontend |
| Storyboard Phase 0 | High | Complex refactor, many files |
| ElevenLabs Voice UI | Low | UI integration, backend ready |

---

## Success Criteria

### For P0 Tasks
- [ ] `cd apps/web && npx tsc --noEmit` → 0 errors
- [ ] All tests pass
- [ ] Clean build without warnings

### For P1 Tasks
- [ ] Landing page text visible in HTML without JS
- [ ] Pricing page shows correct Pro 210k price
- [ ] Credit pack cards display and function correctly
- [ ] No visual regressions

### For P2 Tasks
- [ ] Admin can manage landing page settings
- [ ] Video pages simplified to single scene
- [ ] ElevenLabs voice options available in UI
- [ ] All existing tests still pass

### For P3 Tasks
- [ ] Storyboard page.tsx reduced to ~15 lines
- [ ] All storyboard hooks extracted and working
- [ ] Single-flow narrative mode functional

---

## Notes

1. **TypeScript errors are blocking** — should be fixed first
2. **Server Render SEO is 90% done** — just needs Phase 3 wiring
3. **Credit Pack UI is implemented** — needs testing only
4. **Backend work is lighter** — most heavy lifting done
5. **Storyboard refactor is largest task** — consider breaking into smaller chunks
6. **Vite fix is trivial** — but requires manual Docker restart

---

## Next Actions

### For @web agent:
1. Fix 13 hideText prop errors in section components
2. Fix PricingPlans.test.tsx beforeEach issue
3. Update page.tsx to use server shell imports
4. Test credit pack UI visually
5. Update pricing page UI

### For @backend agent:
6. Refactor ManageGeneralSettings to tab-per-file pattern
7. Add landing page settings fields and API endpoint

### For @coordinator:
8. Monitor progress and coordinate handoffs
9. Ensure worklogs are written after each task
10. Update task-status.md as tasks complete

---

*Last updated: 2026-06-01*
*Next review: After P0 tasks complete*