# Task Status — AI Video Platform

> Last updated: 2026-06-03

---

## ✅ Recently Completed

### 6 High Priority Backlog Tasks — All Verified Complete
- **Completed**: 2026-06-03
- **Agent**: @general + @tester
- **Summary**: 
  - ✅ Refactor ManageGeneralSettings → Tab-per-file (20 tabs created)
  - ✅ Remove Scene Repeater (single scene form, no multi-scene)
  - ✅ Merge ProviderPricing into VideoTypeResource (Repeater in VideoTypeForm)
  - ✅ Credit Pack UI (CreditPackSection.tsx + BankInfoModal.tsx)
  - ✅ Landing Page Settings (44 fields, API endpoint, admin tabs)
  - ✅ Storyboard Phase 0 Refactor (1456→19 lines, 17 hooks extracted)
- **Verification**: ✅ Backend tests 29/29, daemon tsc clean, web tsc clean

### Merge ProviderPricing into VideoTypeResource — Plan Created
- **Completed**: 2026-06-03
- **Agent**: @coordinator
- **Plan**: `docs/plans/pricing/merge-provider-pricing-into-video-type.md`
- **Summary**: 
  - Tạo plan chi tiết hợp nhất ProviderPricing vào VideoTypeResource
  - Sử dụng Filament Repeater để quản lý nested provider pricings
  - Không cần database migration — giữ nguyên cấu trúc hiện tại
  - Ước tính 5h thực hiện (form integration, table enhancement, deprecate standalone)
  - Bao gồm rollback plan và success criteria

### Pricing System Review — Full Analysis
- **Completed**: 2026-06-01
- **Agent**: @coordinator
- **Plan**: `docs/plans/billing/pricing-review.md`
- **Summary**: 
  - Phân tích margin cho tất cả combinations (wan2.6, wan2.7, happyhorse × 720p/1080p × 5s-30s)
  - Phát hiện: Quality tier multiplier = 1.0 → KHÔNG phân biệt standard/premium/ultra
  - Phát hiện: HappyHorse margin âm (-25% đến -42%) cho video ngắn
  - Đề xuất: Tăng quality multiplier (premium=1.5, ultra=2.5), provider multiplier (happyhorse=3.0), resolution multiplier (1080p=1.8)
  - Sau fix: Tất cả combinations sẽ có margin dương (34%+)

### Pricing System + Landing Page — Big Update
- **Completed**: 2026-05-31
- **Agent**: @coordinator (@backend + @planner + @web + @tester)
- **Worklog**: `worklogs/2026-05-31-pricing-plan-final.md`
- **Summary**: 
  - Chốt giá Pro 210k/18k credits, DurationTier margin tăng dần 10%→50%
  - Thống nhất CreditCalculator về PricingCalculator, quality tier không nhân giá
  - Xóa PricingAddon, sync CreditSettings, thêm email plan_upgraded
  - Landing page settings: 44 fields quản lý từ admin, 13 server shells cho SEO
  - Mobile optimization: Forge, Workflow, Ecosystem, Sound
  - Visual fixes: giảm độ tối ảnh, tăng glow, fix buttons, preloader
  - SEO: fix og-image, sitemap 17 URLs, server-render text
- **Verification**: ✅ Tests 19/19, tsc web+daemon clean, API pricing/landing-page đúng

---
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

### Remove Scene Repeater — Video Pages → Single Scene Form
- **Priority**: 🔴 High
- **Scope**: web
- **Plan**: `docs/plans/ui/remove-scene-repeater.md`
- **Status**: 📋 Plan complete — ready for implementation
- **Effort**: ~1.5h
- **Steps**:
  - [ ] Sửa `video/[feature]/page.tsx`: single scene state, bỏ loop/add/remove, đơn giản generate (45m)
  - [ ] Sửa `video-scene-editor.tsx`: bỏ `index`/`onRemove`, đổi header (20m)
  - [ ] Sửa `video-sidebar.tsx`: bỏ scene count, đổi text button (15m)
  - [ ] Xóa/redirect `multi-scene/page.tsx` → `/studio/storyboard` (10m)
  - [ ] Cập nhật i18n keys (10m)
  - [ ] tsc check + verify (10m)
- **Dependencies**: Không — có thể làm ngay
- **Notes**: Storyboard đã làm multi-scene tốt hơn. Form 1 scene đơn giản hơn UX. Backend không cần thay đổi.

### Storyboard Dual Mode — Phase 0 Refactor → Single-Flow Narrative
- **Priority**: 🔴 High
- **Scope**: web (cross-cutting: all shared, multi-scene, single-flow)
- **Architecture Plan**: `docs/plans/storyboard/single-flow-narrative.md`
- **Detailed Plan**: `docs/plans/storyboard/phase0-refactor-detail.md` ← **READY**
- **Status**: 📋 Detailed plan complete — 1019 lines, 32 files to create, 6 files to edit
- **Effort**: ~12.5 giờ tổng (Phase 0: 4.5h, Phase 1-5: 8h)
- **Current State**:
  - 6 hooks exist (useCanvasState, useUndoRedo, useSceneForm, useCanvasActions, useEdgeManager, useAutoTags)
  - 3 shared components exist (SceneNode, CtxMenu, Section)
  - 2 constants files, build-payload.ts, render-mode-provider/toggle exist
  - **BUT** page.tsx NEVER updated — still 1456 lines with all inline code
  - Remaining: 10 hooks, 4 components, 5 UI layouts, 8 multi-scene files, thin router
- **Steps**:
  - [ ] Phase 0.1: Wire constants — remove inline genId/ACCENT/COLORS/inputC/pill* from page.tsx, add imports (10m)
  - [ ] Phase 0.2: Complete components — create 4 (LoadingScreen, AiDraftModal, TemplateModal, ConfirmMerge) + wire 3 existing (35m)
  - [ ] Phase 0.3: Extract 10 remaining hooks — useCreditEstimation, usePlayback, useAiDraft, useTemplateImport, useReferencePicker, useLoadStoryboard, useSyncRefs, useKeyboardShortcuts, useZoomTracker, useTierConfig (50m)
  - [ ] Phase 0.4: Complete lib utils — topological-sort.ts + verify build-payload.ts (10m)
  - [ ] Phase 0.5: Extract UI layout — Toolbar, LayersPanel, CanvasWrapper, BottomBar, EdgeLabelPopup (40m)
  - [ ] Phase 0.6: Extract multi-scene — PropertyPanel + 4 sections + handleSave + handleRender + MultiSceneEditor (40m)
  - [ ] Phase 0.7: Thin router + verify regression — page.tsx → ~15 lines, 20 test cases (25m)
  - [ ] Phase 0.8: Viewer badge + verify storyboard-types.ts (10m)
  - [ ] Phase 1-3: Backend migration, AI compile pipeline, single-flow render (@backend + @daemon)
  - [ ] Phase 4: Frontend single-flow: editor, prompt panel, hooks, save/render (3h)
  - [ ] Phase 5: Testing (1h)
- **Dependencies**: Backend agent cho Phase 1-3, Daemon agent cho Phase 2-3
- **Notes**: Phase 0 bắt buộc trước khi thêm single-flow — file 1456 dòng hiện tại không thể extend thêm

---

## ✅ Recently Completed

### Pricing System Review — Full Analysis
- **Completed**: 2026-06-01
- **Agent**: @coordinator
- **Plan**: `docs/plans/billing/pricing-review.md`
- **Summary**: Phân tích margin toàn diện, phát hiện quality tier multiplier = 1.0导致happyhorse lỗ, đề xuất fix multipliers
- **Status**: ✅ IMPLEMENTED — New pricing with 20% minimum margin deployed

### Pricing Plan Final — DurationTier + PlanSeeder + CreditSettings
- **Completed**: 2026-05-31
- **Agent**: @coordinator (@backend + @planner + @tester)
- **Worklog**: `worklogs/2026-05-31-pricing-plan-final.md`
- **Plan**: `docs/plans/billing/final-pricing-plan.md`
- **Scope**: Backend (PricingSystemSeeder, PlanSeeder, CreditSettingsSeeder, CreditController)
- **Summary**: Chốt kế hoạch giá: margin theo duration (5s=10%→30s=50%). DurationTier multipliers mới. Pro 199k/30.000 credits (~18 video). Starter 99k/12.000 credits. Studio 499k/100.000 credits.
- **Verification**: ✅ Tests 18/18, tsc clean, API pricing trả đúng credits (5s=1682, 30s=16800), plans API đúng giá

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

### Profitable Pricing Strategy — Attract Users Without Losing Money
- **Priority**: 🔴 High (Critical)
- **Scope**: backend, web
- **Plan**: `docs/plans/billing/profitable-pricing-strategy.md`
- **Status**: ✅ Backend implemented — @web pending
- **Effort**: ~6h total (backend 2h ✅, web 2h pending, testing 2h pending)
- **Summary**: 
  - Phân tích chi phí API thực tế từ DashScope: 5s 720P = 11,100 VND, 5s 1080P = 18,500 VND
  - Margin hiện tại 50%+ nhưng giá cao gấp 5-10x so với Kling
  - Implemented Option B+C Hybrid: base credits 1,500, quality 1.3x, provider 1.15x
  - Giá mới: 5s I2V 720P Premium = 16,820 VND (was 28,080, -40%)
  - Pro plan: 30,000 credits cho 199k VND (~18 videos, was ~7)
  - Margin mới: 15-25% (was 50%+)
- **Completed Steps**:
  - [x] @backend: Update PricingSystemSeeder.php (base credits, multipliers)
  - [x] @backend: Update PlanSeeder.php (new plan tiers)
  - [x] @backend: Update credit-packs.php
- **Pending Steps**:
  - [ ] @web: Update pricing page with new values
  - [ ] @web: Add competitor comparison section
  - [ ] @tester: End-to-end testing

### Fix Pricing Multipliers — Quality, Provider, Resolution
- **Priority**: 🔴 High (Critical - đang lỗ)
- **Scope**: backend
- **Plan**: `docs/plans/billing/pricing-review.md`
- **Status**: ✅ IMPLEMENTED
- **Effort**: ~1.5h
- **Steps**:
  - [x] Fix quality multiplier: standard=1.0, premium=1.3, ultra=1.8
  - [x] Fix provider multiplier: wan 2.6=1.0, wan 2.7=1.15
  - [x] Fix resolution multiplier: 1080p=1.8
  - [x] Run seeder: `docker exec backend-app-1 php artisan db:seed --class=PricingSystemSeeder`
  - [x] Verify API pricing calculate
  - [ ] Verify frontend pricing display — PENDING
  - [x] Update final-pricing-plan.md
  - [x] Write worklog

### VN Market Pricing Strategy — Cập nhật PlanSeeder + Credit Pack + Pricing UI
- **Priority**: 🔴 High
- **Scope**: backend, web
- **Plan**: `docs/plans/billing/final-pricing-plan.md`
- **Status**: ✅ Backend done — cần @web cập nhật UI
- **Effort remaining**: ~3.5h (web UI)
- **Steps**:
  - [x] Backend: DurationTier multipliers
  - [x] Backend: PlanSeeder
  - [x] Backend: CreditSettingsSeeder
  - [x] Backend: Landing page settings (44 fields admin)
  - [x] Frontend: Landing page dynamic text
  - [x] Frontend: Server-render SEO
  - [ ] Web: Cập nhật trang /pricing với giá mới Pro 199k/30k credits, Starter 99k/12k, Studio 499k/100k
  - [ ] Web: Credit pack purchase UI
    - **Plan**: `docs/plans/billing/credit-pack-ui.md`
    - **Status**: 📋 Plan complete — ready for implementation
    - **Effort**: ~4.5h (web only)
    - **Steps**:
      - [ ] Add PACK_OPTIONS constant + i18n keys
      - [ ] Create CreditPackSection.tsx (3 pack cards + select + confirm)
      - [ ] Refactor BillingModals.tsx: extract BankInfoModal, remove manual input
      - [ ] Modify BillingHero: "Nạp ngay" → scroll to packs
      - [ ] Modify billing/page.tsx: wire all components
      - [ ] tsc + visual verify + worklog

### ElevenLabs Voice UI
- **Priority**: 🟡 Medium
- **Scope**: web
- **Dependencies**: Daemon Phase 1 worklog (voice endpoints ready)
- **Notes**: `apps/web/src/` needs voice selector UI for ElevenLabs TTS + SFX

### Merge ProviderPricing into VideoTypeResource
- **Priority**: 🟡 Medium
- **Scope**: backend
- **Plan**: `docs/plans/pricing/merge-provider-pricing-into-video-type.md`
- **Status**: 📋 Plan complete — ready for implementation
- **Effort**: ~5h
- **Steps**:
  - [ ] Phase 1: Add Provider Pricing tab to VideoTypeForm.php with Repeater
  - [ ] Phase 2: Update VideoTypesTable with provider count and badges
  - [ ] Phase 3: Hide standalone ProviderPricingResource from navigation
  - [ ] Phase 4: Test CRUD operations and PricingCalculator
  - [ ] Phase 5: Write worklog and update documentation
- **Dependencies**: None — can start immediately
- **Notes**: No database migration needed. Existing relationship handles nested CRUD. Keep standalone resource accessible via direct URL for 30 days as fallback.

---

## 🤖 Agent Sessions

| Date | Agent | Worklog | Result |
|------|-------|---------|--------|
| 2026-06-03 | @coordinator | `docs/plans/pricing/merge-provider-pricing-into-video-type.md` | ✅ Plan Created |
| 2026-06-01 | @coordinator | `docs/plans/billing/pricing-review.md` | ✅ Done |
| 2026-05-31 | @coordinator | `worklogs/2026-05-31-pricing-plan-final.md` | ✅ Done |
| 2026-05-30 | @coordinator | `worklogs/2026-05-30-security-hardening-scale-optimization.md` | ✅ Done |
| 2026-05-28 | @coordinator | `worklogs/2026-05-28-doc-overhaul-model-sync-fix.md` | ✅ Done |
| 2026-05-28 | @daemon | `apps/daemon/worklogs/2026-05-28-phase4-registry-refactor.md` | ✅ Done |
| 2026-05-28 | @daemon | `apps/daemon/worklogs/2026-05-28-phase1-fixes.md` | ✅ Done |
| 2026-05-28 | @web | `apps/web/worklogs/rebranding_and_gsap_polish.md` | ✅ Done |
