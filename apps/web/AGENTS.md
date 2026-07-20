# Web App — Next.js 15

> **⚠️ MANDATORY — Strictly enforced**:
> This agent handles **ONLY** `apps/web/` (Next.js).
> **DO NOT** touch `backend/` or `apps/daemon/`.

## Cross-References

| Purpose | Path |
|---------|------|
| OpenCode rules | `.opencode/rules/` |
| OpenCode skills | `.opencode/skills/` |
| Architecture | `docs/architecture.md` |
| Conventions | `docs/conventions.md` |
| Laravel backend — DO NOT EDIT | `backend/` |
| Daemon — DO NOT EDIT | `apps/daemon/` |
| Backend work logs (handoff) | `backend/worklogs/` |

## Structure

```
apps/web/
├── src/
│   ├── app/               # App Router pages
│   │   ├── (auth)/         # Login, Register
│   │   ├── (dashboard)/    # Dashboard, Studio, Projects, Jobs, Assets, Billing, Credits, Settings, Admin
│   │   └── (builder)/      # Storyboard builder
│   │       └── studio/storyboard/
│   │           ├── flow/            # Dual-mode editor (multi-scene + One-Shot)
│   │           │   ├── shared/      # SceneNode, CtxMenu, Section, toolbar, canvas, layers, hooks
│   │           │   ├── multi-scene/ # Property panels, save/render for multi-scene
│   │           │   ├── single-flow/ # CompiledPromptPanel, status badge, compile hook
│   │           │   ├── hooks/       # useCanvasState, useUndoRedo, useEdgeManager, useAutoTags...
│   │           │   └── lib/         # buildPayload, topologicalSort
│   │           └── [uuid]/          # Viewer page + VoiceoverModal
│   ├── components/        # UI: sidebar, topbar, studio components, ui kit
│   ├── lib/               # API client (client.ts), navigation, types, utils
│   └── stores/            # Zustand (ui-store.ts)
├── public/                # Static assets
├── next.config.ts
├── tsconfig.json           # @/* → ./src/*
└── package.json
```

## Routes

| Path | Page |
|---|---|
| `/` | Login |
| `/register` | Register |
| `/dashboard` | Dashboard |
| `/studio` | Video Studio |
| `/studio/storyboard` | Storyboard list |
| `/studio/storyboard/flow` | Storyboard editor (dual mode) |
| `/studio/storyboard/flow/[uuid]` | Storyboard viewer + voiceover |
| `/projects` | Projects list |
| `/jobs` | Generation jobs |
| `/assets` | Asset library |
| `/billing` | Billing |
| `/credits` | Credits |
| `/settings` | Settings |
| `/admin` | Admin |

## Conventions

- App Router, TypeScript strict
- Tailwind CSS 4 + Lucide React + Motion
- Prompt-first UI, dark mode (#000000, accent #FF5A1F)
- Vietnamese as primary locale
- API client: `src/lib/api/client.ts` (daemon port 7456)

### Storyboard Architecture (Dual Mode)
- **Flow editor**: Shared React Flow canvas with dual mode support
- **Mode toggle**: `RenderModeProvider` context + `RenderModeToggle` pill
- **Multi-scene** (`mode=multi`): Per-scene editing, FFmpeg concat backend
- **One-Shot** (`mode=single`): Shared skills at storyboard level, single generation
- **Compiled prompt**: `useCompilePrompt` hook with stale detection
- **Shared code**: canvas state, undo/redo, scene form via `flow/hooks/` and `flow/shared/`

### Image Security
- **NEVER use raw daemon paths** in `<img src="">`
- Always use `fetchRawFile(projectId, fileName)` → returns `{ blobUrl, blob }`

### Pricing UI
- Use `laravel.pricingCalculate()` for credit estimation
- Use `laravel.pricingDurations()` for duration options
- Never hardcode credit formulas or duration arrays

### Voiceover (Post-Generation)
- **Separate from generation**: NEVER included in `daemon.generate()` params
- **VoiceoverModal**: "Thêm giọng đọc" button on viewer page
- API: `POST /api/storyboards/{uuid}/add-voiceover`

### Edge Labels
- Template import auto-fills: first "Mở đầu", last "Kết thúc", middle "Chuyển tiếp"
- One-Shot: single edge → "Kết thúc"

### Rate Limiting UX
- 429: Display `"Bạn thao tác quá nhanh, vui lòng chờ trong giây lát!"` with retry countdown

## Quick Start

```bash
# Web runs as a Docker Compose service (apps/web/Dockerfile.dev).
bash scripts/dev.sh start          # → http://localhost:3000
bash scripts/dev.sh restart web    # apply web code changes
```

## Writing Worklogs

After every task, write a worklog to `apps/web/worklogs/<YYYY-MM-DD>-<task-slug>.md`.

See `docs/conventions.md` for the worklog template.
