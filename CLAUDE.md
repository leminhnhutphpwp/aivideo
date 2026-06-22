# CLAUDE.md — AI Video Platform

> Project guide for **Claude Code CLI**. Auto-loaded every session.
> Deeper, on-demand material lives in `.claude/` (agents, skills, rules, workflows) — see `.claude/README.md`.
> `AGENTS.md` is the original OpenCode guide; this file is its Claude Code counterpart.

## What this is

AI-native SaaS that auto-generates viral short videos (TikTok, Reels, YouTube Shorts).
Prompt-first. **Vietnamese is the primary UI locale.** Stage: pre-MVP, active development.

## Architecture — 3 layers

```
Next.js (3000) ──HTTP──► Laravel (8000) ──proxy + webhook──► Daemon (7456)
   Web / UI            Control plane                    Execution plane
                  auth · credits · queue ·         media generation,
                  admin · email · realtime          16 AI providers
```

- **Laravel = control plane** — auth (JWT), credits/billing, queue (Horizon), admin (Filament v5), email, realtime (Reverb).
- **Daemon = execution plane** — media generation with 16 providers (Qwen/Wan, Kling, Haiper, Luma, Runway…). Express + better-sqlite3.
- **Web** calls Laravel for auth/credits/billing, and reaches the daemon **only through the Laravel proxy** (never directly).

## Stack

| Layer | Tech | Location |
|-------|------|----------|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind 4, GSAP/Motion | `apps/web/` |
| Backend | Laravel 12, JWT, Queue + Horizon, Reverb (WS), Filament v5 | `backend/` |
| Media engine | Express, better-sqlite3, 16 providers | `apps/daemon/` |
| Databases | MySQL (Laravel, in Docker) · SQLite (daemon) | |
| Storage | MinIO (dev) → Cloudflare R2 (prod, bucket `apaiplatform`) | |

## Ports

| Service | Port |   | Service | Port |
|---------|------|---|---------|------|
| Web | 3000 |   | MinIO API | 9000 |
| Backend API | 8000 |   | MinIO Console | 9001 |
| Daemon | 7456 |   | Reverb WS | 8080 |

## Subagents (`.claude/agents/`)

Delegate with the **Task tool** (`subagent_type: <name>`). Each has a strict scope.

| Agent | Scope | Use for |
|-------|-------|---------|
| `coordinator` | global | Task delegation & planning |
| `backend` | `backend/` | Laravel: auth, credits, queue, admin, email |
| `web` | `apps/web/` | Next.js: pages, components, stores |
| `daemon` | `apps/daemon/` | Media engine, providers, webhooks |
| `planner` | global | Feature design, task breakdown |
| `explorer` | global | Read-only codebase search |
| `tester` | global | Write & run tests |

## Skills (`.claude/skills/`) — load via the Skill tool when relevant

`architecture` · `api-contract-daemon` · `billing-and-credits` · `job-lifecycle` ·
`queue-and-jobs` · `realtime-reverb` · `planning` · `simulation-mode` · `ai-system`

## Commands

```bash
# Dev environment (Docker)
bash scripts/dev.sh start            # start all
bash scripts/dev.sh restart backend  # apply Laravel code changes
bash scripts/dev.sh restart web      # apply Next.js changes

# Backend (ALWAYS inside the container — host MySQL is separate!)
docker exec backend-app-1 php artisan migrate
docker exec backend-app-1 php artisan db:seed --class=SomeSeeder
docker exec backend-app-1 php artisan optimize:clear

# Daemon: rebuild on src/ or .env change
docker compose -f backend/docker-compose.dev.yml up -d --force-recreate daemon
```

## Verify (run before claiming done)

```bash
cd apps/web    && npx tsc --noEmit        # expect 0 errors
cd apps/daemon && npx tsc --noEmit        # expect 0 errors
docker exec backend-app-1 php artisan test --filter="RenderJobPipelineTest|RenderJobTest"   # 19 pass
node apps/daemon/scripts/verify-media-models.mjs   # model sync
```

> ✅ **Test suite status (2026-06-22):** full `php artisan test` is **green —
> 448 passed / 1 skipped / 0 failed** (re-run 2026-06-22; +1 since 447 = storyboard
> error-message coverage). The prior drift (70 failed) was cleared on
> 2026-06-19; root cause was `AiPromptCompiler` fataling on a null `CKEY_API_KEY`
> (see `backend/worklogs/2026-06-19-test-drift-fix-aipromptcompiler.md`). +2 from a
> full-system test that found & fixed a render blocker (`qualityTierCode` named-param
> in `StoryboardRenderer` → see `backend/worklogs/2026-06-19-full-system-test-issues/`).
> If you see a red full-suite again, check this baseline before assuming it's your regression.

## Conventions

1. Vietnamese as primary UI locale.
2. Small, verifiable patches. Match surrounding code style.
3. **Never commit or push unless explicitly asked.**
4. **Never** `migrate:fresh` / `db:wipe` / mass-DELETE — real test data lives in the DB. Use targeted `db:seed --class=...`.
5. Respect agent scope boundaries — backend code in `backend/`, web in `apps/web/`, daemon in `apps/daemon/`.
6. After any task: write a worklog (`<scope>/worklogs/<YYYY-MM-DD>-<slug>.md`) and update `task-status.md`. See `.claude/rules/documentation/SKILL.md`.

## Domain rules (high-value, see `.claude/skills/` for detail)

- **Render modes**: `multi_scene` (per-scene skills, FFmpeg concat) · `single_flow` (one compiled prompt, no concat) · `storyboard_image` (multi-panel image → R2V).
- **Reference media** (`driving_audio`, `first/last_frame`): storyboard-level in One-Shot, per-scene in multi-scene. `buildPayload()` routes by mode.
- **Model params**: ALWAYS check official DashScope / Model Studio docs before adding/changing model parameters — never assume. https://help.aliyun.com/zh/model-studio/
- **Pricing**: `PricingCalculator::calculate()` is the single source (backend + frontend must agree). Durations from `DurationTier::active()` — never hardcode. `credits = ceil(VND × exchange_rate)`.
- **Voiceover**: post-generation only — separate `POST /api/storyboards/{uuid}/add-voiceover`. Never in `generateMedia()` params.
- **Assets**: never expose raw daemon paths to the frontend; fetch via authenticated API. `AssetController::index()` filters out `thumbnail` type.
- **Rate limiting**: per-plan (free 120 → enterprise 2000 req/min). VN 429 message: `"Bạn thao tác quá nhanh, vui lòng chờ trong giây lát!"`.

## Key documents

| Doc | Path |
|-----|------|
| Project status | `task-status.md` |
| Archived tasks | `HISTORY.md` |
| Roadmap | `docs/plans/roadmap.md` |
| Architecture / plans | `docs/plans/` |
| OpenCode guide (origin) | `AGENTS.md` |
| Scripts | `scripts/README.md` |

## Feature → where to look

Start a task here, then read **only** these. Don't bulk-read the repo — see the
`.claude/rules/context-efficiency` rule and `.claude/workflows/development` for the full
reading order. Browse the plan **folder**, open the **one** relevant file.

| Task touches… | Start (skill/rule) | Primary code | Plans |
|---|---|---|---|
| Storyboard render / scenes / final video | `job-lifecycle`, `simulation-mode` | `backend/app/Services/StoryboardRenderer.php`, `…/Controllers/API/StoryboardController.php`, `apps/daemon/src/` | `docs/plans/active/storyboard/` |
| Single render job / model select | `job-lifecycle` | `…/Controllers/API/RenderJobController.php`, `app/Services/ModelSelector.php` | — |
| Community: publish / feed / remix | — | `…/Controllers/API/CommunityController.php`, `apps/web/src/components/community/` | `docs/plans/active/community/` |
| Billing / credits / pricing | `billing-and-credits` | `backend/app/Services/Pricing/`, `app/Services/CreditService.php` | `docs/plans/completed/billing/` |
| Queue / jobs / Horizon | `queue-and-jobs` | `backend/app/Jobs/` | — |
| Realtime / websockets | `realtime-reverb` | Reverb events / channels | — |
| Laravel ↔ daemon contract / webhooks | `api-contract-daemon` | `backend/app/Services/DaemonClient.php`, daemon `src/` | `docs/plans/active/integration/` |
| Daemon / providers / media gen | `architecture` | `apps/daemon/AGENTS.md`, `apps/daemon/src/` | — |
| Auth / JWT | rule `security` | `backend/` auth controllers/middleware | — |
| AI: LLM config / skill authoring / prompt enhance | `ai-system` | `backend/app/Support/{LlmConfigResolver,ErrorSanitizer}.php`, `app/Settings/AiSettings.php`, `app/Services/{SkillAuthoringService,PromptEnhancementService,SkillService}.php`, `apps/daemon/src/routes/media.ts` (`extractJsonFromLlm`, `/enhance-prompt`, `/skills/author`) | — |
| Local skills (CRUD / draft-publish / categories) | `ai-system` | `backend/app/Services/SkillService.php`, `app/Filament/Pages/SkillManager.php`, `apps/skills/`, daemon `src/skills/loader.ts` | — |
| Plan feature-gating (capabilities) | `ai-system` | `backend/app/Models/Plan.php` (`toSnapshot.capabilities`), `apps/web/src/lib/feature-capabilities.ts`, `components/feature-gate.tsx` | — |
| AI prompt enhancer (reusable UI) | `ai-system` | `apps/web/src/hooks/use-enhance-prompt.ts`, `components/studio/enhance-prompt-button.tsx` | — |
| Cross-layer / "how does X flow" | `architecture` | use CodeGraph MCP first | `docs/architecture.md` |

## CodeGraph MCP

Wired for Claude Code via `.mcp.json` (server `codegraph`, runs `codegraph serve --mcp`).
After a Claude Code **restart** + approving the server, `mcp__codegraph__*` tools become available
(`.claude/settings.json` auto-allows them). Prefer them for structural queries — symbol defs,
callers, callees, impact — they're far cheaper on context than reading whole files. Grep/Glob/Read
remain valid fallbacks. Index lives at `.codegraph/codegraph.db` (~838 files, rebuilt 2026-06-11).

> ⚠️ **Do NOT run `codegraph sync` / `codegraph index` from the project root.** The root
> `.gitignore` ignores `apps/` and `backend/` (they're tracked separately), and CodeGraph honors
> gitignore — a plain sync/index will **wipe** the index down to ~8 root files. The MCP server runs
> with `--no-watch` for exactly this reason (the auto-sync watcher would corrupt the index on the
> first file change). To rebuild manually: temporarily remove the `apps/` + `backend/` lines from
> `.gitignore`, run `codegraph index -f`, then restore `.gitignore` (verify md5 unchanged).
