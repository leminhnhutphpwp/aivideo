# Documentation System Overhaul + Model Sync Fix — Coordinator Worklog

## Date
2026-05-28

## Overview
Comprehensive QC of entire project, created mandatory documentation rules for all agents, fixed model/provider sync between daemon and Laravel, rewrote verify-media-models.mjs to be dynamic.

## Files Changed

| File | Change |
|------|--------|
| `.opencode/rules/documentation/SKILL.md` | **NEW** — mandatory worklog format, template, writing rules, task-status template, agent requirements |
| `task-status.md` | **NEW** — project task status tracker (Active, Completed, Backlog, Agent Sessions) |
| `AGENTS.md` (root) | Added "Documentation After Every Task" section + worklog/task-status workflow |
| `backend/AGENTS.md` | Added "After Every Task: Write Worklog" section with quick template |
| `apps/daemon/AGENTS.md` | Added "After Every Task: Write Worklog" section with quick template |
| `apps/web/AGENTS.md` | Added "After Every Task: Write Worklog" section with quick template |
| `apps/AGENTS.md` | Converted CodeGraph section from Vietnamese to English |
| `.opencode/agents/backend.md` | Added "After Task Completion (MANDATORY)" 4-step workflow |
| `.opencode/agents/daemon.md` | Added "After Task Completion (MANDATORY)" 4-step workflow |
| `.opencode/agents/web.md` | Added "After Task Completion (MANDATORY)" 4-step workflow |
| `.opencode/agents/coordinator.md` | Added session start checklist + worklog enforcement steps |
| `.opencode/README.md` | Added `documentation` rule to rules table |
| `apps/daemon/scripts/verify-media-models.mjs` | **REWRITE** — dynamic provider/model parsing from providers.ts, 3-way sync check (DEFAULT_MODELS, getAvailableModels, QualityTier.mapping) |
| `backend/app/Services/ModelSelector.php` | Added missing model `wan2.1-vace-plus` to `getAvailableModels()` |
| `backend/database/seeders/PricingSystemSeeder.php` | Added `'default'` key to all 3 QualityTier `model_mapping` entries |
| `apps/web/worklogs/rebranding_and_gsap_polish.md` | Unchanged (existing, partial) |
| `apps/daemon/worklogs/2026-05-28-phase1-fixes.md` | Unchanged (existing, good) |
| `apps/daemon/worklogs/2026-05-28-phase4-registry-refactor.md` | Unchanged (existing, good) |
| `backend/worklogs/` | Still empty (no backend tasks done today) |

## Key Decisions

1. **English for all agent instructions** — Kept Vietnamese only in `apps/skills/` (product content/UI labels) and README.md files. All agent config (.opencode/agents/, AGENTS.md) now 100% English
2. **Worklog as hard rule** — "Violating this rule = task is NOT complete" enforced in every agent definition
3. **Dynamic verify script** — No more hardcoded provider lists. Parses providers.ts AST-style via regex to auto-discover providers and models
4. **3-way sync check** — Verify script now checks all 3 places models appear: DEFAULT_MODELS, getAvailableModels(), QualityTier.model_mapping
5. **`default` key in QualityTier** — Each tier now has a `default` fallback model so new video types don't fall through to system default blindly
6. **ProviderPricing is dead code** — Has 0 callers in codebase. Left untouched for now

## Verified Issues Found (pre-existing, not fixed)

| # | Issue | Severity |
|---|-------|----------|
| 1 | `ProviderPricing` model — 0 callers, populated with old provider names (happyhorse, kling, luma, runway) that don't match daemon | 🟡 Dead code |
| 2 | `CreditCalculator` not model-aware — same cost for all models of same type | 🟡 Needs architecture discussion |
| 3 | Web worklog `rebranding_and_gsap_polish.md` — doesn't follow template format | 🟢 Documentation debt |

## Verification

- [x] Docker: 11/11 containers healthy
- [x] Backend tests: 18/18 passed
- [x] Daemon `npx tsc --noEmit`: No errors
- [x] Web `npx tsc --noEmit`: No errors
- [x] `node apps/daemon/scripts/verify-media-models.mjs`: PASS (34 models, 0 drifts)

## Handoff Notes

- **@backend needs to know**: `PricingSystemSeeder.php` was updated — run `docker exec backend-app-1 php artisan db:seed --class=PricingSystemSeeder` to apply new QualityTier `default` keys. `ModelSelector.php` has `wan2.1-vace-plus` added.
- **@daemon needs to know**: `verify-media-models.mjs` rewritten — now dynamic. No need to update provider list manually.
- **@web needs to know**: No API changes. Daemon worklogs mention ElevenLabs voice UI needed — not yet picked up.
- **All agents**: New mandatory worklog rule in `.opencode/rules/documentation/SKILL.md` — read it.

## Status

✅ Completed
