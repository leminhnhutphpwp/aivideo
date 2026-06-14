# Coding & Documentation Conventions

## Language
- **Code comments**: English
- **UI text**: Vietnamese
- **Documentation**: English (technical), Vietnamese (user-facing)
- **Git commits**: English

## Code Style

### TypeScript/JavaScript
- Strict TypeScript (no `any` type)
- ESLint + Prettier
- Functional components (React)
- Hooks for state management
- Named exports over default exports
- Async functions must handle errors

### PHP/Laravel
- PSR-12 coding standard
- PHPStan level 6+
- FormRequest for validation
- Service layer for business logic (`app/Services/`)
- Type hints: strict parameter and return types
- Never hardcode values — use `config()` and `.env`

### General
- Small, verifiable patches
- Add tests for new functionality
- Update docs when behavior changes
- Never commit secrets or keys

## Documentation Standards

### File Naming
- **Plans**: `docs/plans/<category>/<feature-name>.md`
- **Worklogs**: `<scope>/worklogs/<YYYY-MM-DD>-<task-slug>.md`
- **Skills**: `.opencode/skills/<name>/SKILL.md`

### Plan Template
```markdown
# [Feature Name] — Plan

## Date
YYYY-MM-DD

## Overview
2-3 sentences.

## User Stories
- As a [user], I want [action] so that [benefit]

## Technical Design
### Data Flow
### API Contracts
### Components

## Tasks
| # | Layer | Task | Agent | Est. |
|---|-------|------|-------|------|
```

### Worklog Template
```markdown
# [Task Name] — Worklog

## Date
YYYY-MM-DD

## Overview
Brief description.

## Files Changed
| File | Change |
|------|--------|
| `path/to/file` | Description |

## Key Decisions
1. ...

## Verification
- [ ] Tests pass
- [ ] Lint clean

## Handoff Notes
- **@agent needs to know**: ...
```

## Agent Rules

### Boundaries
| Agent | Scope | Never Touch |
|-------|-------|-------------|
| @backend | `backend/` | `apps/web/`, `apps/daemon/` |
| @web | `apps/web/` | `backend/`, `apps/daemon/` |
| @daemon | `apps/daemon/` | `backend/`, `apps/web/` |

### Post-Task Workflow
1. Run verification (typecheck, tests)
2. Write worklog in `<scope>/worklogs/`
3. Update `task-status.md`
4. Report to user

### CodeGraph Usage
**MANDATORY**: Use `codegraph_*` tools before grep/read for:
- Symbol definitions
- Callers/callees
- Impact analysis
- File structure

Only use grep for:
- Literal text search
- Comments/logs
- After CodeGraph returns no results

## Best Practices

### Storyboard Architecture
- **Multi-scene** (`render_mode: multi_scene`): Per-scene settings, FFmpeg concat
- **One-Shot** (`render_mode: single_flow`): Shared settings, single generation
- **Mode toggle**: `RenderModeProvider` context + pill toggle with confirm dialog
- **URL routing**: `/studio/storyboards/flow?mode=multi` or `?mode=single`
- **Compiled prompt**: `POST /api/storyboards/{uuid}/compile-prompt`

### Media Types
- **One-Shot**: `driving_audio`, `first_frame_image`, `last_frame_image` are storyboard-level fields
- **Multi-scene**: Same fields are per-scene
- **Always verify model support** before assuming parameter compatibility

### Asset Security
- **NEVER expose raw daemon paths** to frontend
- Use `fetchRawFile(projectId, fileName)` → returns `{ blobUrl, blob }`

### Community Architecture
- **Unit of publish**: RenderJob (individual assets), NOT Storyboard
- Publish: `PATCH /render-jobs/{uuid}/publish`
- Feed: `RenderJob::published()`
- NEVER create storyboard publish endpoints

### Pricing Best Practices
- **Single source**: `PricingCalculator::calculate()` for ALL credit estimation
- **Duration from DB**: `DurationTier::active()` via `GET /api/v1/pricing/durations`
- Never hardcode duration arrays or credit formulas

### Voiceover Pattern
- **POST-GENERATION ONLY**: Separate step after video rendering
- Never include voice/narration/background_music in `generateMedia()` params
- Endpoint: `POST /api/storyboards/{uuid}/add-voiceover`

### Rate Limiting
- **Middleware**: `ThrottleApiRequests` — per-plan limits
- **Auth routes**: Keep strict (60 req/min default)

### Edge Labels
- Template import auto-fills: first "Mở đầu", last "Kết thúc", middle "Chuyển tiếp"
- One-Shot mode: single edge → "Kết thúc"
