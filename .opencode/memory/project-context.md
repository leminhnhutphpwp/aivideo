# Project Context — Persistent Memory

## Overview
AI Video Platform is an AI-native SaaS for creating viral videos automatically. 
Prompt-first, supports multi-platform (TikTok, Reels, YouTube Shorts).
Target market: Vietnamese users.

## Brand
- Previously called "Wise" → rebranded to **Wavise Studio** (rebranding completed 2026-05-28)
- Domain/landing page: Wavise branding, GSAP cinematic animations

## Recent Major Changes (May-June 2026)

### June 2026
- **Multi-Panel Image Storyboard Mode** (Phase 1+2) — Added 3rd render mode "Storyboard Ảnh"
- **Environment Config Audit** — Full audit of all 8 env files across web/backend/daemon
- **Fix Render Without Compiled Prompt** — Viewer page auto-compiles before render
- **Competitor Comparison Section** — Added to pricing page

### May 2026
- **CreditSettings Refactor** — Key-value routing + single source of truth (exchange_rate = 0.1)
- **6 High Priority Backlog Tasks** — ManageGeneralSettings tabs, Scene Repeater removal, ProviderPricing merge, Credit Pack UI, Landing Page Settings, Storyboard Phase 0 refactor
- **Pricing System Overhaul** — Quality/providers/resolution multipliers fixed, margins improved
- **Pricing + Landing Page Big Update** — Pro 210k/18k credits, DurationTier margins, SEO
- **Rebranding & GSAP Polish** — Wise → Wavise Studio, GSAP animations on landing page
- **Security Hardening & Scale Optimization**
- **Daemon Phase 4 Registry Refactor**
- **Documentation Overhaul & Model Sync Fix**

## Pending Work
- **Profitable Pricing Strategy** — Web UI for pricing page pending (backend done)
- **Pricing Multipliers** — Frontend pricing display verification pending
- **VN Market Pricing Strategy** — Web UI update for new prices pending
- **Merge ProviderPricing into VideoTypeResource** — Plan created, implementation pending

## Architecture Evolution
- Originally had subproject references in `backend/` and `apps/` — removed and consolidated
- Migrated from `.agents/` to `.opencode/` directory structure
- Scripts consolidated from per-service to unified `scripts/`
- Monitoring stack (Prometheus/Grafana) recently added

## Team
- **Solo developer**: `leminhnhutphpwp` (Lê Minh Nhựt) — 169 commits
- Other identities: `@minhnhut99devmacos` (32), `@minhnhut99dev` (5)
- Development setup: macOS local, Docker backend, DataSwap mirror

## Key Design Decisions

### Why Laravel as proxy (not direct daemon access)?
- Security: daemon has no auth middleware
- Docker networking: daemon not exposed to host
- Single API surface for frontend

### Why SQLite for daemon?
- Daemon is stateless in production (R2 for storage)
- SQLite for dev convenience and local file management
- Project/file metadata doesn't need relational DB

### Why Two Storyboard Modes?
- Multi-scene: traditional, maximum creative control
- One-Shot: optimized for social media (single prompt, faster)
- Storyboard Image: for multi-panel image generation

### Why CKey gpt-4o-mini for prompt compilation?
- Vietnamese language capabilities (good with Vietnamese prompts)
- Cost-effective (mini model)
- Consistent structured output
