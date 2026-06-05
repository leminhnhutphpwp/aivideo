# Architecture — Persistent Memory

## 3-Layer Architecture

```
Next.js (port 3000) ──HTTP──► Laravel (Auth, Credits, Queue, Admin, port 8000)
                                      │
                                      │ (webhook callback)
                                      ▼
                              Daemon (port 7456, Express Media Engine)
```

### Layer Responsibilities

**Web (Next.js 15)** — User-facing UI
- Prompt-first dashboard, dark mode, Vietnamese locale
- Storyboard editor (dual mode: multi-scene + One-Shot)
- Calls Laravel API for auth/credits/billing
- Calls Laravel proxy for daemon media/projects
- WebSocket via Laravel Reverb for realtime progress

**Backend (Laravel 12)** — Control Plane
- Auth (JWT, OTP-based forgot/reset password, email verification)
- Credits & billing (plans, credit packs, payments via Sepay)
- Queue management (Horizon + Redis)
- Admin dashboard (Filament v5)
- Email notifications
- Proxies daemon API to frontend
- Rate limiting (ThrottleApiRequests middleware)

**Daemon (Express)** — Execution Plane
- Media generation with 16 AI providers
- Project/file management (SQLite storage)
- Task queue for media jobs
- Skills system (10 skill types for video/image direction)
- Simulation mode for testing without API costs
- Webhook callbacks to Laravel

## Request Flow

### Media Generation
```
Frontend → client.ts → laravelRequest() → GET/POST /api/daemon/... 
→ Laravel DaemonController proxy → http://daemon:7456/api/... 
→ Daemon processes → webhook callback → Laravel HandleJobCompletion
```

### Auth
```
Frontend → client.ts → laravelRequest() → POST /api/auth/login 
→ Laravel AuthController → JWT token returned → stored in Authorization header
```

### File Uploads
```
Frontend → daemon.uploadFile() → Laravel (FormData, not via proxy) → Daemon storage
```

## Daemon Networking
- Daemon API is NOT exposed to host — only reachable via Docker internal network
- Laravel connects via `http://daemon:7456` (Docker service discovery)
- Frontend cannot directly call daemon — always through Laravel proxy
- Only the Docker daemon (`backend-daemon-1`) is the "real" one — kill any host daemons on port 7456

## Storyboard Architecture

### Two Render Modes (+ 1 new)

| Mode | Description | Workflow |
|------|-------------|----------|
| `multi_scene` | Traditional scene-by-scene | Each scene has independent settings. FFmpeg concatenates at end. |
| `single_flow` | One-Shot — single compiled prompt | Shared skills at storyboard level. Daemon produces final video directly. No FFmpeg concat. |
| `storyboard_image` | Multi-panel image | AI generates multi-panel image → pipes into R2V with shot_type:"multi" |

### Mode Toggle
- URL routing: `/studio/storyboards/flow?mode=multi|single`
- `RenderModeProvider` context + pill toggle ("Ghép cảnh / One-Shot") with confirm dialog
- Canvas data preserved when switching modes

### Compiled Prompt
- Endpoint: `POST /api/storyboards/{uuid}/compile-prompt`
- Service: `AiPromptCompiler` (uses CKey gpt-4o-mini)
- Status badge: idle/compiling/compiled/stale/error
- Reads shared skills for single_flow, per-scene skills for multi_scene

### Shared Skills (One-Shot)
Stored at storyboard level as 5 nullable columns:
`camera_movement`, `style`, `mood`, `lighting`, `narration`

### Reference Media
- **One-Shot**: `driving_audio`, `first_frame_image`, `last_frame_image` are storyboard-level fields
- **Multi-scene**: Same fields are per-scene
- `buildPayload.ts` places fields at correct level based on render mode

## Asset System
- In `HandleJobCompletion`: asset type is dynamic based on provider capability
  - `t2i` or `i2i` capability → `image` type
  - Everything else → `video` type
- Use `$hasAsset` guard instead of `$hasVideo` to handle both
- `AssetController::index()` filters `where('type', '!=', 'thumbnail')` to avoid duplicates in pickers
- NEVER expose raw daemon paths to frontend — use `fetchRawFile(projectId, fileName)`

## Voiceover (Post-Generation)
- **CRITICAL**: Voiceover is a completely separate step AFTER video rendering completes
- Never include `voice`, `narration`, or `background_music` in `generateMedia()` params
- Endpoint: `POST /api/storyboards/{uuid}/add-voiceover`
- Flow: Generate TTS via `DaemonClient::generateAudio()` → download audio → ffmpeg merge locally
- Model: `elevenlabs-v3`, surface: `audio`, audioKind: `speech`

## Media Models Source of Truth
- **Daemon `models.ts`**: Definitive list of all models and providers
- **Laravel `ModelSelector`**: Admin dropdown defaults and available models
- **`PricingSystemSeeder`**: Quality tier model mappings and provider pricing
- Verify sync: `node apps/daemon/scripts/verify-media-models.mjs`

## Daemon Providers (13+)
OpenAI, Volcengine Ark, xAI Grok, Nano Banana, ImageRouter, Custom Image API, Leonardo.ai, ElevenLabs, HyperFrames, MiniMax, SenseAudio, FishAudio, Stub

## Skills System (10 types)
- `apps/skills/` directory contains SKILL.md files for:
  - image-direction, video-direction, video-brand, video-compose, video-contract
  - video-discovery, video-marketing-psychology, video-post-process
  - video-repurpose, video-storyboard
- Agent instructions in English, display labels in Vietnamese
- Daemon must have `/skills` volume mount to serve skills API
- Missing mount → skills API returns `{"video_directions":[],...}`

## Rate Limiting
- Middleware: `ThrottleApiRequests`
- Per-plan limits: free=120, starter=300, pro=600, studio=1000, enterprise=2000 req/min
- Auth routes: 60 req/min default
- Vietnamese 429 message: "Bạn thao tác quá nhanh, vui lòng chờ trong giây lát!"

## Database
- **Backend**: MySQL 8 in Docker container (separate from host MySQL)
- **Daemon**: SQLite at `apps/daemon/.od/`
- Migrations: Run INSIDE container: `docker exec backend-app-1 php artisan migrate`
- Seeders: Run INSIDE container, ONLY specific seeders: `docker exec backend-app-1 php artisan db:seed --class=SpecificSeeder`
- NEVER run `migrate:fresh`, `db:wipe`, or full `db:seed` (DatabaseSeeder) — will reset admin user
