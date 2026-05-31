# Task Status — AI Video Platform

> Last updated: 2026-05-31

---

## 🔄 Active Tasks

### Server-Render Landing Page Text cho SEO — "Server Shell + Client Islands"
- **Priority**: 🟡 Medium
- **Scope**: web
- **Plan**: `docs/plans/ui/server-render-landing-seo.md`
- **Status**: 📋 Plan complete — ready for implementation
- **Effort**: ~6h
- **Steps**:
  - [ ] Phase 1: Tạo 13 Server Shell files trong `sections/server/` (2h)
  - [ ] Phase 2: Thêm `hideText` prop vào 13 Client Components (2.5h)
  - [ ] Phase 3: Refactor `page.tsx` — import shells, bỏ dynamic cho above-fold (0.5h)
  - [ ] Phase 4: Verify (tsc, curl HTML, Lighthouse, visual check) (1h)
- **Dependencies**: Không — có thể làm song song với các task khác
- **Notes**: Tách text content (h1/h2/p) ra Server Components để Googlebot luôn thấy. Client components giữ GSAP animations, hooks, interactivity. Dùng DEFAULTS text cho server render — không cần gọi API. Phase 2 (future): server-side fetch từ `/api/landing-page`.

### Refactor ManageGeneralSettings → Tab-per-File
- **Priority**: 🔴 High (blocker cho Landing Page Settings)
- **Scope**: backend
- **Plan**: `docs/plans/ui/manage-general-settings-refactor.md`
- **Status**: 📋 Plan complete — ready for implementation
- **Effort**: ~1h
- **Steps**:
  - [ ] Phase 0: Tạo thư mục `SettingsTabs/`
  - [ ] Phase 1: Tạo 19 Tab classes (`WebsiteTab`, `HeroTab`, `ShowcaseTab`, `AuthBackgroundTab`, `SeoTab` + 12 Landing tabs + `FooterTab`)
  - [ ] Phase 2: Viết lại `ManageGeneralSettings::form()` thành thin orchestrator
  - [ ] Phase 3: Verify (clear cache, open admin, test save, 18/18 tests)
- **Dependencies**: Không — có thể làm ngay, trước khi thêm tab landing page mới
- **Notes**: Copy-paste nguyên logic, không thay đổi field/validation/label. Sau refactor, Landing Page Settings chỉ cần tạo file tab mới + add 1 dòng trong orchestrator.

### Landing Page Settings — Admin quản lý nội dung landing page
- **Priority**: 🟡 Medium
- **Scope**: backend, web
- **Plan**: `docs/plans/ui/landing-page-settings.md`
- **Status**: 📋 Plan complete — ready for Phase 1 (after ManageGeneralSettings refactor)
- **Effort**: ~8h tổng (Phase 1: 3h, Phase 2: 5h)
- **Steps**:
  - [ ] Phase 1.1: Backend — Thêm 11 field Hero + Portal vào GeneralSettings.php
  - [ ] Phase 1.2: Backend — Thêm tab "Landing Hero" + "Landing Portal" vào ManageGeneralSettings
  - [ ] Phase 1.3: Backend — Public API `GET /api/landing-page`
  - [ ] Phase 1.4: Backend — Test API endpoint
  - [ ] Phase 1.5: Web — `useLandingSettings()` hook + context
  - [ ] Phase 1.6: Web — Refactor HeroSection nhận props
  - [ ] Phase 1.7: Web — Refactor PortalSection nhận props
  - [ ] Phase 2.1: Backend — Thêm ~24 field section labels/headings
  - [ ] Phase 2.2: Backend — Thêm 4 tab section content
  - [ ] Phase 2.3: Web — Refactor 11 section components
  - [ ] Phase 2.4: Web — Integrate context vào page.tsx
- **Dependencies**: Backend trước, Web sau; cần Refactor ManageGeneralSettings hoàn tất trước Phase 1.2

### Storyboard Dual Mode — Phase 0 Refactor → Single-Flow Narrative
- **Priority**: 🔴 High
- **Scope**: web (cross-cutting: all shared, multi-scene, single-flow)
- **Plan**: `docs/plans/storyboard/single-flow-narrative.md`
- **Status**: 📋 Planning complete — ready for Phase 0
- **Effort**: ~12.5 giờ tổng (Phase 0: 4.5h, Phase 1-5: 8h)
- **Steps**:
  - [ ] Phase 0.1: Tách types & constants (15m)
  - [ ] Phase 0.2: Tách components: SceneNode, CtxMenu, Section, LoadingScreen, Modals (45m)
  - [ ] Phase 0.3: Tách 16 hooks từ FlowEditorPage (1h)
  - [ ] Phase 0.4: Tách lib utilities: buildPayload, topologicalSort (15m)
  - [ ] Phase 0.5: Tách UI layout: Toolbar, LayersPanel, CanvasWrapper, BottomBar (45m)
  - [ ] Phase 0.6: Tách multi-scene specifics: PropertyPanel + sections + handleSave (45m)
  - [ ] Phase 0.7: Entry point thin router + RenderModeProvider + verify regression (30m)
  - [ ] Phase 0.8: Cập nhật viewer page (15m)
  - [ ] Phase 1-3: Backend migration, AI compile pipeline, single-flow render (@backend + @daemon)
  - [ ] Phase 4: Frontend single-flow: editor, prompt panel, hooks, save/render (3h)
  - [ ] Phase 5: Testing (1h)
- **Dependencies**: Backend agent cho Phase 1-3, Daemon agent cho Phase 2-3
- **Notes**: Phase 0 bắt buộc trước khi thêm single-flow — file 1313 dòng hiện tại không thể extend thêm

---

## ✅ Recently Completed

### Pricing Plan Final — DurationTier + PlanSeeder + CreditSettings
- **Completed**: 2026-05-31
- **Agent**: @coordinator (@backend + @planner + @tester)
- **Worklog**: `worklogs/2026-05-31-pricing-plan-final.md`
- **Plan**: `docs/plans/billing/final-pricing-plan.md`
- **Scope**: Backend (PricingSystemSeeder, PlanSeeder, CreditSettingsSeeder, CreditController)
- **Summary**: Chốt kế hoạch giá: margin theo duration (5s=10%→30s=50%). DurationTier multipliers mới. Pro 210k/18.000 credits (~11 video). Studio coming_soon. CreditSettings gọn còn 3 settings. Validation sync với DB.
- **Verification**: ✅ Tests 18/18, tsc clean, API pricing trả đúng credits (5s=1560, 30s=16800), plans API đúng giá

### Security Hardening + Production Scale Optimization
- **Completed**: 2026-05-30
- **Agent**: @coordinator
- **Worklog**: `worklogs/2026-05-30-security-hardening-scale-optimization.md`
- **Scope**: Cross-cutting (backend, daemon, web, infra)
- **Summary**: Secrets management overhaul (env vars, templates, validation), production health checks + resource limits + restart policies, Docker multi-stage builds, Nginx/PHP/MySQL/Redis tuning, Caddy load balancing + single-domain routing, Horizon worker scaling (10→23), DB connection pooling, app replicas 2→6
- **Verification**: ✅ Tests 18/18, tsc clean, model sync PASS, 8/8 containers healthy

### Documentation System Overhaul + Model Sync Fix
- **Completed**: 2026-05-28
- **Agent**: @coordinator
- **Worklog**: `worklogs/2026-05-28-doc-overhaul-model-sync-fix.md`
- **Scope**: Cross-cutting (backend, daemon, .opencode config)
- **Summary**: QC all services, created mandatory worklog/task-status rules, rewrote verify-media-models.mjs (dynamic), fixed ModelSelector + PricingSystemSeeder
- **Verification**: ✅ Docker healthy, tests 18/18, daemon tsc clean, web tsc clean, model sync PASS

### Phase 4 — Registry Refactor + Skeleton UX
- **Completed**: 2026-05-28
- **Agent**: @daemon
- **Worklog**: `apps/daemon/worklogs/2026-05-28-phase4-registry-refactor.md`
- **Summary**: Refactored provider dispatch from if-else to Map-based registry
- **Verification**: ✅ tsc clean, model sync PASS

### Phase 1 Critical Fixes — ElevenLabs Provider
- **Completed**: 2026-05-28
- **Agent**: @daemon
- **Worklog**: `apps/daemon/worklogs/2026-05-28-phase1-fixes.md`
- **Summary**: Added ElevenLabs TTS + SFX, fixed hardcoded voice default, dynamic AUDIO_MODELS_BY_KIND
- **Verification**: ✅ tsc clean, model sync PASS
- **Handoff pending**: @web needs to add ElevenLabs voice UI, @backend needs to run PricingSystemSeeder

### Rebranding & GSAP Cinematic Polish
- **Completed**: 2026-05-28
- **Agent**: @web
- **Worklog**: `apps/web/worklogs/rebranding_and_gsap_polish.md`
- **Summary**: Rebranded Wise → Wavise Studio, GSAP animations on landing page
- **Verification**: ✅ tsc --noEmit passed

---

## 📋 Backlog

### VN Market Pricing Strategy — Cập nhật PlanSeeder + Credit Pack + Pricing UI
- **Priority**: 🔴 High
- **Scope**: backend, web
- **Plan**: `docs/plans/billing/final-pricing-plan.md`
- **Status**: ✅ Backend done — cần @web cập nhật UI
- **Effort remaining**: ~3.5h (web UI)
- **Steps**:
  - [x] Backend: DurationTier multipliers (5s=0.78, 10s=1.75, 15s=3.0, 20s=4.67, 30s=8.40)
  - [x] Backend: PlanSeeder (Free=2.000, Pro=18.000/210k, Studio=coming_soon)
  - [x] Backend: CreditSettingsSeeder cleanup (còn 3 settings, validation sync DB)
  - [ ] Web: Cập nhật trang /pricing với giá mới Pro 210k, Studio "Sắp ra mắt"
  - [ ] Web: Credit pack purchase UI (50k/100k/200k)
  - [ ] Web: Plan selector hiển thị watermark indicator cho Free

### ElevenLabs Voice UI
- **Priority**: 🟡 Medium
- **Scope**: web
- **Dependencies**: Daemon Phase 1 worklog (voice endpoints ready)
- **Notes**: `apps/web/src/` needs voice selector UI for ElevenLabs TTS + SFX

---

## 🤖 Agent Sessions

| Date | Agent | Worklog | Result |
|------|-------|---------|--------|
| 2026-05-31 | @coordinator | `worklogs/2026-05-31-pricing-plan-final.md` | ✅ Done |
| 2026-05-30 | @coordinator | `worklogs/2026-05-30-security-hardening-scale-optimization.md` | ✅ Done |
| 2026-05-28 | @coordinator | `worklogs/2026-05-28-doc-overhaul-model-sync-fix.md` | ✅ Done |
| 2026-05-28 | @daemon | `apps/daemon/worklogs/2026-05-28-phase4-registry-refactor.md` | ✅ Done |
| 2026-05-28 | @daemon | `apps/daemon/worklogs/2026-05-28-phase1-fixes.md` | ✅ Done |
| 2026-05-28 | @web | `apps/web/worklogs/rebranding_and_gsap_polish.md` | ✅ Done |
