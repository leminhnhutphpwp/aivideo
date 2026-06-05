# Project Context Summary

## What's Built
AI Video Platform — a prompt-first, AI-native SaaS for video generation, targeting Vietnamese users. Media generation via Alibaba Cloud DashScope (Wan2.1, Wan2.6, Wan2.7) with 13+ AI providers for I2V, T2V, T2I, voiceover, and audio.

## Core Features
- **Storyboard Editor**: Dual-mode (multi-scene / single-flow / storyboard_image) with React Flow canvas
- **Multi-Panel Image Mode**: 3rd render mode — user uploads multi-panel image or AI generates one
- **Pricing System**: Dynamic pricing via `PricingCalculator`, admin-managed, auto-updating frontend
- **Credit System**: User credits, exchange rate routing, credit packs with VN bank transfer
- **Admin Dashboard**: Filament v5 — 45+ resources, tab-per-file organization
- **Simulation Mode**: Toggle-able fake media generation for testing without API costs
- **Voiceover**: Post-generation TTS via ElevenLabs, ffmpeg merge
- **Email**: Plans, billing, verification (Laravel mail)
- **Realtime**: Laravel Reverb WebSocket (port 8080)

## Milestone Status (as of 2026-06-05)

### ✅ Complete
- ✅ Multi-Panel Image Storyboard Mode — Phase 1 & 2
- ✅ CreditSettings Refactor — Key-Value Routing
- ✅ 6 High Priority Backlog Tasks (ManageGeneralSettings, Scene Repeater removal, ProviderPricing merge, Credit Pack UI, Landing Page, Storyboard Phase 0)
- ✅ Profitable Pricing Strategy
- ✅ Fix Pricing Multipliers
- ✅ VN Market Pricing Strategy
- ✅ ElevenLabs Voice UI
- ✅ Merge ProviderPricing into VideoTypeResource
- ✅ Simulation Mode
- ✅ Competitor Comparison Section
- ✅ Environment Config Audit
- ✅ Bug Fix: Render Without Compiled Prompt
- ✅ Rebranding Wise → Wavise Studio + GSAP Polish
- ✅ Polling Max Retries (60 retry limit in viewer)

### 🔴 P0 — Production Readiness (current sprint)
- [ ] Regenerate `.opencode/memory/` files
- [ ] Create `docs/plans/roadmap.md`
- [ ] Triage 4 pre-existing backend test failures
- [ ] Write StoryboardImagePanel tests
- [ ] Improve storyboard viewer (cancel/retry/progress)
- [ ] Realtime progress via Laravel Reverb
- [ ] Error boundaries & 404 pages

### 🟡 P1 — Core Feature Completion
- [ ] Storyboard viewer improvements (cancel/retry/progress)
- [ ] Realtime WebSocket progress
- [ ] Error boundaries & 404 pages

## Architecture Decisions
- Laravel is control plane AND proxy to daemon
- Daemon API not exposed to host — Docker internal network only
- All media generation goes through daemon's RENDER_REGISTRY with `withSimulation()` decorator
- `PricingCalculator` is single source of truth for ALL credit estimation
- Duration tiers from DB, never hardcoded
- Voiceover is ALWAYS post-generation only

## Current Test Status
- Backend: 116 passed, 4 pre-existing failures (CreditApiTest, SocialiteTest, SecurityTest, PricingConflictAnalysisTest)
- Web tsc --noEmit: 0 errors
- Daemon tsc --noEmit: 0 errors
- Model verification: sync confirmed
