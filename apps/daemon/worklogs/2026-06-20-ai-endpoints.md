# Daemon AI endpoints + project status — Worklog

## Date
2026-06-20

## Overview
Added LLM-backed endpoints (skill authoring, prompt enhancement), a Tavily web-search
helper, a draft/publish filter on the skills API, and a fix so the project list reports
the real status. All LLM endpoints accept an `llm`/`search` config override from Laravel
(AiSettings) and fall back to `.env` (`resolveLlmProvider`).

## Files Changed
| File | Change |
|------|--------|
| `src/routes/media.ts` | `POST /media/skills/author` (LLM → new skill JSON, grounded on an example skill in the category); `POST /media/enhance-prompt` (rewrite a draft prompt, grounded on the selected skill's `prompt_template`/`anti_patterns` + options); `POST /media/skills/reload` (cache invalidation); `GET /media/skills` now filters `status: draft` (`?include_draft=1` for admin) and exposes `status`. Both LLM endpoints accept a request `llm` override; `enhance-prompt` accepts a `search` override |
| `src/routes/media.ts` (`extractJsonFromLlm`) | Shared robust JSON parser used by ai-draft / skills-author / enhance-prompt: strips `<think>…</think>` (reasoning models like MiniMax), code fences, and surrounding prose by extracting the outer JSON value. **This fixed the "provider OK but app error" bug.** |
| `src/media/providers.ts` | `resolveSearchProvider()` (Tavily) mirroring `resolveLlmProvider()` |
| `src/media/search.ts` (new) | `webSearch(query, max, override?)` → Tavily `/search`; returns `[]` gracefully when unconfigured or on error |
| `src/skills/index.ts` | export `loadSkills` (used to re-load a skill by category for authoring/enhance grounding) |
| `src/routes/projects.ts` | project list now sets `lastTaskStatus` from the **latest task of ANY status** (was a `WHERE status='done'`-only query → failed-only projects had no status → frontend defaulted to 'done') |
| `.env` | commented guidance for `LLM_PROVIDER`/`LLM_MODEL`/`SEARCH_PROVIDER`/`TAVILY_API_KEY` |

## Key Decisions
1. **Reasoning-model tolerance**: reasoning LLMs emit `<think>…</think>` before JSON → `JSON.parse` failed. `extractJsonFromLlm` strips it + extracts the JSON object. Applied to all three LLM endpoints.
2. **enhance-prompt auto-matches the draft's language** (EN→EN, VI→VI) unless an explicit `locale` is passed. Reason: don't force Vietnamese on English prompts.
3. **Skill grounding by re-loading the skill in the daemon** (not passed from frontend) — single source of truth (SKILL.md), smaller payloads.
4. **Simulation short-circuit** in `enhance-prompt` returns a mock so the feature is testable without a real key (respecting the "keep SIMULATION_MODE off" rule — short-circuit only runs when simulation is already enabled).

## Verification
- [x] `npx tsc --noEmit` → 0 errors
- [x] `enhance-prompt`: EN input → EN output, VI input → VI output (real ckey/MiniMax-M3)
- [x] LLM override path: fake `llm` → fetch the custom endpoint (not ".env not configured")
- [x] skills draft filter: set a skill draft → excluded from `/media/skills`, included with `?include_draft=1`
- [x] project status: a failed-only project now returns `lastTaskStatus: 'failed'`

## Handoff Notes
- **@backend**: these endpoints are fronted by Laravel (`PromptEnhancementService`, `SkillAuthoringService`) which inject the `llm`/`search` override from `AiSettings` via `LlmConfigResolver`. See `backend/worklogs/2026-06-20-ai-system-and-platform-fixes.md`.
- **@web**: `enhance-prompt` returns `{ enhanced_prompt, suggestions[] }`; `/media/skills` no longer returns drafts.

## Status
✅ Completed
