---
name: architecture
description: 3-layer architecture overview for AI Video Platform
compatibility: opencode
metadata:
  scope: global
  type: reference
---

## 3-Layer Architecture

```
Next.js (apps/web) ──HTTP──► Laravel (backend)
                                   │
                                   └──► Daemon (apps/daemon, port 7456)
```

## Layers

### Frontend (apps/web)
- Next.js 15 App Router
- Port 3000
- Calls Laravel for auth/credits, Daemon for media

### Backend (backend/)
- Laravel 12
- Port 8000
- Control plane: auth, credits, queue, admin, email

### Daemon (apps/daemon)
- Express + SQLite
- Port 7456
- Execution plane: media generation with 13 providers

## Daemon API Overview

- Projects CRUD, file management
- 13 media providers (Seedance, Runway, Kling, Veo, Sora, ElevenLabs...)
- Task queue with SQLite persistence
- Webhook callback on completion/failure

## Community Architecture

```
Storyboard (project container)
  ├── Scene 1 → RenderJob 1 (individual video asset)
  ├── Scene 2 → RenderJob 2
  └── Scene 3 → RenderJob 3
                           ↓
                    Published to Community
```

- **Community operates on RenderJobs**, NOT Storyboards
- Publish: `PATCH /render-jobs/{uuid}/publish`
- Feed: `RenderJob::published()`
- See `docs/plans/community/README.md` for details

## When to use this skill

Reference this when:
- Understanding system architecture
- Planning cross-service changes
- Debugging service communication
- Working on community features (remember: RenderJob, not Storyboard)

## Related docs

- `docs/plans/README.md` — Full architecture
- `docs/plans/community/README.md` — Community architecture
- `docs/plans/appclient/` — Daemon API details
- `backend/.agents/skills/api-contract-daemon.md` — Laravel↔Daemon contract
