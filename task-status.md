# Task Status — AI Video Platform

> Last updated: 2026-06-23

---

## Current Sprint

### Storyboard default render mode = One-Shot + toggle reorder — Complete
- **Status**: Completed (2026-06-23)
- **Agent**: @web
- **Worklog**: `apps/web/worklogs/2026-06-23-storyboard-default-render-mode.md`.
- **Shipped**: New storyboard projects now default to **One-Shot** (`single_flow`) instead of
  Ghép cảnh (`multi_scene`); mode toggle reordered to **One-Shot → Multi-Panel → Ghép cảnh**.
  Existing storyboards still restore their saved `render_mode` (`use-load-storyboard.ts:96`).
- **Verified**: web `tsc` 0; `vitest` 51 passed (render-mode-provider 18/18, default-assertions updated).

### Maintenance mode toggle (dashboard / landing) — Complete
- **Status**: Completed (2026-06-23)
- **Agent**: @web
- **Worklog**: `apps/web/worklogs/2026-06-23-maintenance-mode-toggle.md`.
- **Shipped**: Two independent runtime env switches — `MAINTENANCE_DASHBOARD` /
  `MAINTENANCE_LANDING` (server-side, `.env`, restart-to-apply, no rebuild). New
  `src/middleware.ts` rewrites gated routes to a polished `/maintenance` page (HTTP 503,
  area-specific VN copy, brand decor). Dashboard = app route prefixes; landing = `/`. Auth +
  `/api` + `/maintenance` stay reachable.
- **Verified**: web `tsc` 0; live (both ON) `/`, `/dashboard`, `/studio/*` → 503, `/login` +
  `/maintenance` → 200; independence (landing-only ON → `/dashboard` passes); both screenshots reviewed.

### Voiceover TTS availability gating — Complete
- **Status**: Completed (2026-06-22)
- **Worklog**: `apps/web/worklogs/2026-06-22-voiceover-availability-gating.md`.
- **Shipped**: `GET /media/voices` now returns `available` (true iff a voice provider has
  credentials). `VoiceSelector` shows an early warning banner + reports usability; `VoiceoverModal`
  disables submit when no TTS is configured — instead of the old "looks fine, fails at generate"
  gap. Voiceover stays a separate post-render flow (button only when `status==='completed'`);
  video generation untouched.
- **Verified**: daemon+web `tsc` 0; daemon 142 passed / web 51 passed; live `/voices`
  `available:true` (ckey key present) + ElevenLabs empty→unusable branch.

### Daemon TTS default-voice regression fix — Complete
- **Status**: Completed (2026-06-22)
- **Worklog**: `apps/daemon/worklogs/2026-06-22-tts-default-voice-fix.md`.
- **Shipped**: Restored default-voice fallback in CKey + ElevenLabs TTS (regression from
  `d5c591d` that made them throw on empty `voice`). Daemon suite back to green (142 passed).

### Studio polish: vocab single-source, searchable pickers, storyboard fixes, admin skill-manager — Complete
- **Status**: Completed (2026-06-22)
- **Worklogs**: `apps/daemon/worklogs/2026-06-21-studio-vocab-single-source.md`,
  `apps/web/worklogs/2026-06-22-storyboard-{panel-half-render-fix,ai-panel-autosave,toolbar-overflow-menu}.md`,
  `backend/worklogs/2026-06-21-skill-manager-search-pagination.md`,
  `backend/worklogs/2026-06-21-storyboard-retry-cap.md`,
  `backend/worklogs/2026-06-22-standardize-user-error-messages.md`.
- **Shipped**:
  - **Single-source studio vocabulary** (`apps/daemon/src/media/studio-vocab.json` + `vocab.ts`)
    consumed by `/skills/author` + new `GET /media/vocab`; web `options.ts` guarded by a
    vocab-sync test. Fixes empty studio dropdowns from non-canonical skill presets.
  - **12 trend skills** (image/video-direction) authored as **draft** (await admin publish).
  - **Searchable pickers** — RichSelect inline search (>7 options), video presets search +
    show-more, admin skill-manager search + accordion + per-group numbered pagination.
  - **Storyboard fixes** — half-render on open (`initial={false}`), AI multi-panel **auto-saves**
    the storyboard before generating (kills the "Vui lòng lưu storyboard trước" deadlock),
    top toolbar decluttered into a "⋯" overflow menu, render-attempt **cap (5)** + sanitized
    failure banner, removed the placeholder "Phân tích" action.
  - **User-safe error messages** — `StoryboardController` routes 5xx through a `systemError()`
    helper (generic VN message + real error logged); English 4xx messages translated to VN.
  - **AI authoring always `draft`** (`SkillAuthoringService` force-prepend), `AiPromptCompiler`
    now uses admin AI config via `LlmConfigResolver` (fixes "Failed to compile prompt").
- **Commits**: apps `b3e0d14`, `bc36d13`, `8551cdb`; backend `70b0abb`, `cbeb5a1`.
  Synced to monorepo branch (NOT promoted to `main`).
- **Config gate**: image/video generation needs a real `DASHSCOPE_API_KEY` (intl) in
  `apps/daemon/.env` — the committed value is a placeholder (401 until set).

### AI System (config / authoring / prompt enhance) + platform fixes — Complete
- **Status**: Completed (2026-06-20)
- **Worklogs**: `backend/worklogs/2026-06-20-ai-system-and-platform-fixes.md`,
  `apps/daemon/worklogs/2026-06-20-ai-endpoints.md`,
  `apps/web/worklogs/2026-06-20-enhance-prompt-and-feature-gating.md`.
  **Training skill**: `.claude/skills/ai-system/SKILL.md`.
- **Shipped**:
  - **Admin AI config** (`AiSettings` + `/admin/manage-ai-settings` + `LlmConfigResolver`) —
    LLM + web-search providers incl. **Custom API**, passed to the daemon per request; `.env` fallback.
  - **AI skill authoring** (`POST /api/skills/author` → draft) + schema endpoint.
  - **Reusable prompt enhancer** (`POST /api/ai/enhance-prompt` + `<EnhancePromptButton>` / `useEnhancePrompt`) —
    auto-matches input language, mobile bottom-sheet preview.
  - **Local skills manager** (`/admin/skill-manager`): file CRUD, **draft/publish**, category
    classification (multi/single/unloaded), AI-author button.
  - **Tavily web-search** helper (optional trend grounding).
  - **ErrorSanitizer**: hide provider/model/credential leaks at every frontend boundary.
  - **Plan feature-gating** (`Plan::capabilities` → studio "Tính năng đang bảo trì").
  - Fixes: project-status (daemon latest-task), `model_mapping` repeater dehydrate,
    `image_multi_panel`→`storyboard_video`, **retry cap** (`max_attempts_per_project`=5),
    reasoning-model JSON parse (`<think>` strip).
- **Verification**: tsc 0 (web + daemon), `php -l` clean, end-to-end via real ckey/MiniMax-M3
  + Playwright + curl. Committed + synced to monorepo.
- **Config note**: set a real provider/key in `/admin/manage-ai-settings` to enable AI live
  (CKEY default is a placeholder). Reasoning models are slow — use a non-reasoning model
  (e.g. gpt-4o-mini) for snappy prompt enhancement.

### Full-System Test (Simulation) — Pipeline Green
- **Status**: Completed (2026-06-19)
- **Worklog**: `backend/worklogs/2026-06-19-full-system-test-issues/SUMMARY.md` (+ per-issue files)
- **Result**: Ran the main flow end-to-end against the live stack in simulation. Was **not
  runnable** (daemon couldn't even start); fixed **3 blockers** → pipeline now green:
  1. `daemon` compose service had no `command` (regression f0c1265) → daemon + app down. Fixed in `backend/docker-compose.dev.yml` (restored command, added `node_modules` anon volume + ffmpeg/build toolchain).
  2. `StoryboardRenderer::resolveModel()` passed stale named arg `qualityTierCode:` to `ModelSelector::resolve()` → PHP fatal, every scene failed to queue (swallowed into a 200). Fixed (positional arg).
  3. Daemon container missing `ffmpeg` (`spawn ffmpeg ENOENT`). Fixed (apk add at boot).
- **Verified**: Storyboard render → webhook → `completed` + final video (cross-service async
  loop proven). RenderJob render → publish → appears in `GET /v1/community/assets`.
- **Follow-ups**: regression test for #2; daemon `Dockerfile.dev` to bake ffmpeg; wire real
  tier-2 `render-publish.spec.ts` from the now-verified API flow. Not committed (awaiting owner).

### E2E Playwright — Tier 1 Complete
- **Status**: Completed (2026-06-19)
- **Worklog**: `apps/web/worklogs/2026-06-19-e2e-playwright-tier1.md`
- **Result**: Playwright stood up from scratch (`apps/web/playwright.config.ts` + `e2e/`). **7/7 tier-1 specs green** — auth (form, valid, invalid) + storyboard creation (projects list, builder nav, create-via-API appears). Run with `npm run test:e2e` (needs web :3000 + backend :8000 + seeded DB). Side-fix: migration `2026_06_06_000007` made idempotent (was failing fresh migrate on duplicate `users_username_unique`).
- **Tier 2 (render → publish) — DONE & GREEN (opt-in)**: `e2e/render-publish.spec.ts` now exercises the real full-stack pipeline (web→laravel→queue→daemon→webhook→laravel). Two specs pass against the live stack in simulation: (a) render-job → publish → appears in `/v1/community/assets`; (b) storyboard renders end-to-end to a `completed` final video. Run with `E2E_TIER2=1 npx playwright test render-publish` — requires the full stack up **with daemon simulation ON** (`SIMULATION_MODE=1` at compose up). Skipped by default: with simulation off a render calls real providers (real credits/latency). See `backend/worklogs/2026-06-19-full-system-test-issues/SUMMARY.md`.

### Backend Test Drift Fix — Complete
- **Status**: Completed (2026-06-19)
- **Worklog**: `backend/worklogs/2026-06-19-test-drift-fix-aipromptcompiler.md`
- **Result**: Full backend suite green — **445 passed, 1 skipped, 0 failed** (was 70 failed). Two root causes: (1) `AiPromptCompiler` fatal'd assigning null to typed `string $apiKey` when `CKEY_API_KEY` unset (real production bug, 69 failures) — fixed with `?? ` coalescing; (2) `capability` exposure assertion in `CommunityFeatureTest` relaxed (owner-confirmed non-sensitive).

### Community Features Audit — Complete
- **Status**: Completed (2026-06-14)
- **Plan**: `docs/plans/community/audit-and-fix-plan.md`
- **Worklog**: `worklogs/2026-06-14-community-bugfixes.md`
- **Result**: All 14 bugs fixed, duplicate publish prevention, daily comment limit check, timezone issues, comment rate limiting implemented and verified with tests.

### Community Features — Complete
- **Status**: Completed (2026-06-14)
- **Plan**: `docs/plans/community/revert-storyboard-publish-and-fix-locations.md`
- **Worklog**: `worklogs/2026-06-14-publish-flow-fix-evaluation.md`
- **Result**: Storyboard publish reverted. RenderJob publish added to correct Jobs page and JobHistory. Fully verified by tester.

### Documentation Optimization — Complete
- **Status**: Completed (2026-06-14)
- **Worklog**: `worklogs/2026-06-14-docs-optimization.md`

### Fix Asset Type Detection — Community Cards
- **Status**: Completed (2026-06-17)
- **Plan**: `docs/plans/community/fix-asset-type-detection.md`
- **Root cause**: Frontend uses `duration_seconds > 0` to detect video vs image; images can have non-zero duration
- **Backend**: Add `asset_type` field to `formatAssetCard()` in CommunityController
- **Frontend**: Update `AssetCard` interface + `community-card.tsx` + `remix-modal.tsx` to use `asset_type`
- **Files**:
  - `backend/app/Http/Controllers/API/CommunityController.php` (line 532-566)
  - `apps/web/src/lib/api/community-types.ts` (line 1-26)
  - `apps/web/src/components/community/community-card.tsx` (line 36)
  - `apps/web/src/components/community/remix-modal.tsx` (line 95)

---

## Test Health

> Re-run 2026-06-22 against current code. **All three suites green.** Daemon had 5 TTS
> failures (a regression from `d5c591d`); fixed by restoring default-voice fallback — see
> `apps/daemon/worklogs/2026-06-22-tts-default-voice-fix.md`.

### Daemon Tests (apps/daemon/)
```
Last Run:    2026-06-22 (npm test)
Test Files:  8 passed (8)
Tests:       142 passed, 4 skipped (146)
Status:      ✅ All pass
```
**Fixed 2026-06-22**: `d5c591d` accidentally changed CKey + ElevenLabs TTS to **throw** on an
empty `voice` (while the sibling `openai-generic` provider it added kept a `|| 'alloy'`
default, and the pipeline passes `voice || ''`). Restored the default-voice fallback
(`CKEY_DEFAULT_VOICE_ID` / `ELEVENLABS_DEFAULT_VOICE_ID`) for a consistent TTS contract.

### Web Tests (apps/web/)
```
Last Run:    2026-06-22 (npm test)
Test Files:  4 passed (4)
Tests:       51 passed (51)
Status:      ✅ All pass
```
**Note**: vitest `include` is `src/**/*.test.{ts,tsx}` → 4 files / 51 tests today. The earlier
"8 files / 117" baseline was inaccurate (counted files no longer present / a different config).

### Backend Tests (backend/)
```
Last Run:    2026-06-22 (Docker: backend-app-1)
Result:      448 passed · 1 skipped · 0 failed (1532 assertions)
Status:      ✅ All pass
```
(+1 since 447 — storyboard error-message coverage from the 2026-06-22 sprint.)

### Snapshot (2026-06-22)
| Suite | Result |
|-------|--------|
| Daemon | ✅ 142 passed · 4 skipped |
| Web | ✅ 51 passed |
| Backend | ✅ 448 passed · 1 skipped |

**Note**: Prior drift (70 failed) cleared 2026-06-19 — see
`backend/worklogs/2026-06-19-test-drift-fix-aipromptcompiler.md`.
Run inside Docker: `docker exec backend-app-1 php artisan test`
(host PHP lacks `pdo_sqlite`). The 1 skip is intentional (null-user FK case).
The app container needs `composer install` (vendor is an anon volume) before tests run.

---

## Future Considerations

| Item | Notes |
|------|-------|
| Backend Tests | Need Docker container or `pdo_sqlite` extension |
| E2E Tests | Playwright planned for Phase 3 |
| Integration Tests | Cross-service webhook flow end-to-end tests |

---

## Agent Sessions (Last 7 Days)

| Date | Agent | Worklog | Result |
|------|-------|---------|--------|
| 2026-06-14 | Antigravity | `worklogs/2026-06-14-community-bugfixes.md` | ✅ Fixed duplicate publish check, daily comment limit check, comment rate limiting, resolved timezone issues, fixed billing TS compiler error |
| 2026-06-14 | @planner | `docs/plans/community/audit-and-fix-plan.md` | ✅ Community features audit: 14 bugs found, fix plan created |
| 2026-06-14 | @general | `worklogs/2026-06-14-docs-optimization.md` | ✅ Documentation optimization complete |
| 2026-06-13 | @general + @tester | `worklogs/2026-06-13-testing-coverage-improvement.md` | ✅ Testing coverage: 37→259 tests |
| 2026-06-11 | @tester | `backend/worklogs/2026-06-11-test-drift-triage-fix.md` | ✅ Test drift triage: 455 pass (↑19) |

## Documentation & Worklog Updates

- **Documentation Optimization**: Completed and verified (2026-06-14).
- **Worklogs Summary**: Added consolidated summary `worklogs/2026-06-14-summary.md`.
- **Next Steps**: Review TypeScript error, archive legacy storyboard file.
