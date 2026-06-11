# Verify Progress + Claude Code Setup + Test Triage — Worklog

## Date
2026-06-11

## Overview
Verified real project progress (typecheck + tests), cloned `.opencode/` knowledge into a
Claude-Code-native `.claude/` folder + root `CLAUDE.md`, fixed two clearly-mechanical backend
test bugs, and synced docs to reality (roadmap 1.5–1.7 marked done; corrected the inaccurate
"4 pre-existing failures" claim to the real 45-failure drift picture).

## Verification Results
- ✅ Web `tsc --noEmit`: 0 errors
- ✅ Daemon `tsc --noEmit`: 0 errors
- ✅ Targeted backend suite (`RenderJobPipelineTest|RenderJobTest`): 19 passed
- ✅ Roadmap 1.5 (viewer cancel/retry), 1.6 (realtime Reverb WS), 1.7 (error/404) — confirmed implemented in code (were stale "Not Started" in roadmap.md)
- ⚠️ Full backend suite: 46 → **45 failed** / 409 passed / 1 skipped after fixes

## Files Changed
| File | Change |
|------|--------|
| `CLAUDE.md` (new) | Root Claude Code project guide (architecture, ports, agents, skills, commands, conventions, domain rules) |
| `.claude/` (new) | Cloned from `.opencode/` minus `node_modules`: `agents/`, `skills/`, `rules/`, `workflows/`, `README.md` |
| `.claude/agents/*.md` | Frontmatter converted to Claude Code schema (`name`/`description`/`tools`); `explorer` made read-only |
| `.claude/skills/*/SKILL.md` | Frontmatter normalized (`name` = folder, single `description`); added frontmatter to `planning` + `simulation-mode` |
| `backend/tests/Feature/ExampleTest.php` | Added `use RefreshDatabase` (health endpoint hit empty `:memory:` DB → 500) |
| `backend/tests/Feature/AssetApiTest.php` | Fixed non-fillable column key `'size'` → `'size_bytes'` (NOT NULL insert crash, 3 sites) |
| `docs/plans/roadmap.md` | 1.5/1.6/1.7 → Done; date → 2026-06-11; success criteria reflect real test numbers |
| `task-status.md` | Added "Test Suite Health" section; date → 2026-06-11 |
| `AGENTS.md` | Corrected stale "4 pre-existing failures" / "18 tests" notes |
| `.claude/rules/testing/SKILL.md` | Corrected pre-existing-failures note |

## Key Decisions
1. **Did NOT clone `node_modules`** (58M, OpenCode-only) — Claude Code doesn't need it.
2. **Only fixed unambiguous test bugs** (missing trait, wrong column). The remaining 45 failures
   are test/seed/contract **drift** — fixing them by matching assertions to current output would
   gut the tests' value. Left for owner-directed triage.
3. **Surfaced the 403-vs-404 and pricing-seed-count questions** as product decisions rather than
   guessing.

## Test Failure Triage (remaining 45)
- Response-shape drift (pagination `data` → `data.data`)
- Route-binding drift (`{id}` → `{uuid}` → 404)
- Security policy choice (other-user resource 404 vs expected 403)
- Seed/count drift (PricingApiTest expects 3, seed yields 2)
- Mockery setup (SocialiteTest)

## Handoff Notes
- **@backend**: full suite is red by drift, not regressions. Triage feature-by-feature; decide
  test-vs-code source of truth per assertion. Owner call needed on 403/404 + pricing seed counts.
- **All agents**: `CLAUDE.md` + `.claude/` are now the canonical set for Claude Code; keep in
  sync with `.opencode/` if shared guidance changes.

## Status
✅ Completed (verification, .claude setup, docs sync, 2 safe test fixes). Remaining test drift
deferred pending owner decisions.
