# Project Viewer UX Fix — Implementation Plan

## Date
2026-06-07

## Overview
Fix 10 issues in the project viewer page (`/projects/[id]`) where the simulation/real generation flow has critical UX gaps: no video player for completed tasks, "Xem kết quả" button hidden, no media previews in history, stale closures in WebSocket handlers, and backend API missing output URLs.

## Problem Summary

| # | Severity | Issue | Root Cause |
|---|----------|-------|------------|
| 1 | CRITICAL | No video/audio player in task card | `FileInfo` loads blob URL but never renders `<video>`/`<audio>` |
| 2 | CRITICAL | "Xem kết quả" button never shows | `page.tsx` never passes `onViewResult`/`hasOutput` to `CinematicGenerationStatus` |
| 3 | HIGH | No inline video preview on completion | Completed video tasks require clicking "Xem" — should auto-show player |
| 4 | HIGH | No visual media in JobHistory | `job-history.tsx` only renders text cards, no media thumbnails |
| 5 | MEDIUM | Backend strips `output_path` from index | `RenderJobController::index()` map explicitly removes it |
| 6 | MEDIUM | Frontend type `RenderJobRecord` missing output fields | `assets`, `output_url` not defined in types |
| 7 | MEDIUM | Stale closure in WS handler | `fetchData` captured in closure but not in useEffect deps |
| 8 | MEDIUM | Race condition daemon "done" → RenderJob "queued" | Momentary inconsistency between systems |
| 9 | UI/UX | No success animation on completion | `done` state has no celebration effect |
| 10 | UI/UX | No WebSocket fallback indicator | If WS disconnects, user doesn't know polling is active |

---

## Implementation Phases

### Phase 1: Critical + High (Core UX fixes)
| # | Task | Depends On | Agent |
|---|------|-----------|-------|
| 1.1 | Add video/audio player to `FileInfo` in `task-card.tsx` | None | @web |
| 1.2 | Pass `hasOutput`/`onViewResult` from `page.tsx` | 1.1 | @web |
| 1.3 | Auto-load video/audio previews on completion | 1.1 | @web |
| 1.4 | Add media preview thumbnails to `JobHistory` | 5, 6 (type fix) | @web |
| 1.5 | Fix stale closure in WS effect | None | @web |

### Phase 2: Medium (Backend + Type alignment)
| # | Task | Depends On | Agent |
|---|------|-----------|-------|
| 2.1 | Add `output_url` and `assets` to RenderJob index response | None | @backend |
| 2.2 | Add `output_url`, `assets`, `mime_type` to `RenderJobRecord` type | None | @web |
| 2.3 | Fix race condition with debounce in `page.tsx` | None | @web |

### Phase 3: UI Polish
| # | Task | Depends On | Agent |
|---|------|-----------|-------|
| 3.1 | Add success animation to `CinematicGenerationStatus` | 1.2 | @web |
| 3.2 | Add WebSocket fallback "still waiting" indicator | 1.5 | @web |

---

## Component Design

### 1. Video/Audio Player in TaskCard (`FileInfo` redesign)

**Current behavior:**
- Image files: auto-loads preview via `useEffect`, renders `<img>`
- Video/audio files: shows "Xem" button → `loadPreview()` blob but no `<video>` element
- `FileInfo` only renders inside `!isImage` branch (video/audio)

**Target behavior:**
- Video files (`mime.startsWith('video/')`): auto-load preview, render `<video>` with controls
- Audio files (`mime.startsWith('audio/')`): auto-load preview, render `<audio>` with controls
- Image files: keep current behavior (already working)
- All: keep download button
- Video/audio: remove "Xem" button (replaced by inline player)

**Component structure in `FileInfo`:**

```tsx
function FileInfo({ file, projectId, onFetchFile }: { ... }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isImage = file.mime?.startsWith('image/');
  const isVideo = file.mime?.startsWith('video/');
  const isAudio = file.mime?.startsWith('audio/');

  const loadPreview = async () => {
    if (!file.name || previewUrl) return;
    setLoading(true);
    try {
      const { blobUrl } = await onFetchFile(projectId, file.name);
      setPreviewUrl(blobUrl);
    } catch { setPreviewUrl(null); }
    finally { setLoading(false); }
  };

  // Auto-load ALL media types (not just images)
  useEffect(() => {
    if ((isImage || isVideo || isAudio) && file.name && !previewUrl) {
      loadPreview();
    }
  }, []);

  const handleDownload = async () => { ... /* same */ };

  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-3 text-[11px]">
        {file.mime && <span className="text-slate-500"><FileType className="h-3 w-3 inline" /> {file.mime}</span>}
        {file.size != null && <span className="text-slate-500">{fmtBytes(file.size)}</span>}
      </div>

      {/* Video player */}
      {isVideo && (
        <div className="rounded-lg overflow-hidden border border-white/5 bg-black/40 max-w-[480px]">
          {previewUrl ? (
            <video
              src={previewUrl}
              controls
              autoPlay={false}
              className="w-full h-auto max-h-[360px] object-contain"
              poster="/video-poster-placeholder.png"
            >
              Trình duyệt không hỗ trợ phát video
            </video>
          ) : (
            <div className="flex items-center justify-center h-32">
              {loading ? (
                <div className="h-6 w-6 rounded-full border-2 border-white/10 border-t-[#FF5A1F] animate-spin" />
              ) : (
                <button onClick={loadPreview} className="text-xs text-[#FF5A1F] hover:underline cursor-pointer">
                  Nhấn để xem video
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Audio player */}
      {isAudio && (
        <div className="rounded-lg overflow-hidden border border-white/5 bg-white/[0.01] max-w-[400px] px-3 py-4">
          {previewUrl ? (
            <audio
              src={previewUrl}
              controls
              className="w-full h-10"
            >
              Trình duyệt không hỗ trợ phát âm thanh
            </audio>
          ) : (
            <div className="flex items-center justify-center h-10">
              {loading ? (
                <div className="h-5 w-5 rounded-full border-2 border-white/10 border-t-[#FF5A1F] animate-spin" />
              ) : (
                <button onClick={loadPreview} className="text-xs text-[#FF5A1F] hover:underline cursor-pointer">
                  Nhấn để nghe
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Image preview (existing, unmodified) */}
      {isImage && (
        <div className="rounded-lg overflow-hidden border border-white/5 bg-white/[0.01] max-w-[320px]">
          {previewUrl ? (
            <img src={previewUrl} alt={file.name || 'Preview'} className="w-full h-auto object-contain max-h-[240px]" />
          ) : (
            <div className="flex items-center justify-center h-32">
              {loading ? (
                <div className="h-6 w-6 rounded-full border-2 border-white/10 border-t-[#FF5A1F] animate-spin" />
              ) : (
                <button onClick={loadPreview} className="text-xs text-[#FF5A1F] hover:underline cursor-pointer">
                  Nhấn để xem ảnh
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      {file.name && (
        <div className="flex gap-2 pt-1">
          {/* Remove "Xem" button for video/audio — inline player replaces it */}
          {/* Keep "Xem" for other types (e.g., unknown MIME) */}
          {!isImage && !isVideo && !isAudio && (
            <Button onClick={loadPreview} className="h-7 px-3 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-[10px] font-bold border border-emerald-500/20">
              <Play className="h-3 w-3 mr-1 fill-current" />Xem
            </Button>
          )}
          <Button onClick={handleDownload} variant="outline" className="h-7 px-3 rounded-lg border-white/10 text-[10px] font-bold">
            <Download className="h-3 w-3 mr-1" />Tải
          </Button>
        </div>
      )}

      {file.usedStubFallback && (
        <p className="text-[10px] text-amber-500 flex items-center gap-1">
          <AlertCircle className="h-3 w-3 shrink-0" />Dự phòng — đã có lỗi khi tạo
        </p>
      )}
    </div>
  );
}
```

**Key decisions:**
- Video: `controls` attribute, no `autoPlay` (user must press play)
- Audio: `controls` attribute, compact height
- Remove "Xem" button for video/audio since player is inline
- Auto-load for all media types (not just images) — triggers on mount
- `max-w` constrained to prevent full-width video in card

**Affected rendering in `TaskCard` (lines 240-252):**
- Remove the separation of image/video rendering. Simplify to:
  ```tsx
  {isDone && task.file && (
    <OutputPreview file={task.file} projectId={projectId} onFetchFile={onFetchFile} />
  )}
  ```
  Where `OutputPreview` detects MIME type and renders appropriate media element.
  This merges the two branches (image grid vs FileInfo) into one component.

### 2. "Xem kết quả" Button + CinematicGenerationStatus Props

**Current:** `CinematicGenerationStatus` accepts `onViewResult` and `hasOutput` but `page.tsx` passes neither.

**Fix in `page.tsx`:**

```tsx
// Add scroll-to-result callback
const handleViewResult = useCallback(() => {
  // Scroll to the first completed task
  const completedTask = tasks.find(t => t.status === 'done');
  if (completedTask) {
    const el = document.getElementById(`task-${completedTask.taskId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}, [tasks]);

// Determine if we have output to view
const hasOutput = tasks.some(t => t.status === 'done' && t.file);

// Pass to CinematicGenerationStatus
{hasActive && (
  <CinematicGenerationStatus
    status={...}
    prompt={renderJob?.prompt}
    elapsedSeconds={elapsedSeconds}
    progress={...}
    onViewResult={handleViewResult}
    hasOutput={hasOutput}
  />
)}
```

**For task card scroll target:** Add `id` prop to `TaskCard`:
```tsx
<motion.div id={`task-${task.taskId}`} ...>
```

### 3. JobHistory Media Previews

**Current:** `JobHistory` renders text-only cards with status, prompt, error, metadata tags.

**Target:** For completed jobs, show a media thumbnail strip or card with preview.

**Design options considered:**
- **Option A: Grid of thumbnails** — small cards in a grid, each showing a thumbnail + metadata. Best for visual browsing.
- **Option B: Inline media card** — for completed jobs, show a mini media player inline. Best for quick playback.
- **Option C: Expandable detail** — click to expand and show media. Best for preserving vertical space.

**Recommendation: Option A + C hybrid** — Show a thumbnail/still frame in the card header area. Click thumbnail to see the media expanded.
For simplicity in Phase 1, show a compact preview:

```tsx
// Inside job card, after status bar
{job.status === 'completed' && job.output_url && (
  <div className="mt-2 rounded-lg overflow-hidden border border-white/5 bg-black/30">
    {job.mime_type?.startsWith('video/') ? (
      <video
        src={job.output_url}
        controls
        className="w-full max-h-[200px] object-contain"
      />
    ) : (
      <img
        src={job.output_url}
        alt={job.prompt || 'Kết quả'}
        className="w-full max-h-[200px] object-contain"
      />
    )}
  </div>
)}
```

**Fallback:** If no `output_url` but status is `completed`, show a small "Có kết quả" badge with an icon.

### 4. Success Animation in CinematicGenerationStatus

When `status` transitions to `'done'`, show a subtle celebration:

```tsx
// Inside CinematicGenerationStatus, after the "done" message
{status === 'done' && (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
    className="relative"
  >
    {/* Ripple ring */}
    <motion.div
      className="absolute -inset-4 rounded-full border-2 border-emerald-500/20"
      animate={{
        scale: [1, 1.5, 1],
        opacity: [0.5, 0, 0.5],
      }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
    />
    
    {/* Glow effect behind the orb */}
    <motion.div
      className="absolute inset-0 rounded-2xl bg-emerald-500/10 blur-xl"
      animate={{ opacity: [0.3, 0.6, 0.3] }}
      transition={{ duration: 2, repeat: Infinity }}
    />

    {/* Success text with sparkles */}
    <motion.p
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="text-sm text-emerald-400 font-bold flex items-center gap-2"
    >
      <Sparkles className="h-4 w-4" />
      Hoàn thành!
    </motion.p>
  </motion.div>
)}
```

Update the OrbPulse for done state:
```tsx
function OrbPulse({ status }: { status: string }) {
  const isActive = status === 'queued' || status === 'running';
  const isDone = status === 'done';
  
  return (
    <div className="relative flex items-center justify-center h-16 w-16">
      {isDone && (
        <motion.div
          className="absolute inset-0 rounded-2xl bg-emerald-500/10"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
      <div className={cn(
        "absolute inset-0 rounded-2xl border transition-colors duration-500",
        isActive && "border-[#FF5A1F]/20 bg-[#FF5A1F]/5",
        isDone && "border-emerald-500/20 bg-emerald-500/5",
        !isActive && !isDone && "border-white/5 bg-white/5"
      )} />
      {isActive ? (
        <Loader2 className="h-6 w-6 text-[#FF5A1F] animate-spin" />
      ) : isDone ? (
        <CheckCircle2 className="h-6 w-6 text-emerald-400" />
      ) : (
        <Cpu className="h-6 w-6 text-slate-500" />
      )}
    </div>
  );
}
```

### 5. WebSocket Fallback "Still Waiting" Indicator

When the 30-second fallback poll is active but no WebSocket event was received recently, show a subtle indicator.

**Approach:** Track last WebSocket event timestamp in `page.tsx`. If > 15s since last WS event and tasks are active, show "still waiting" indicator.

```tsx
// In page.tsx
const [lastWsEvent, setLastWsEvent] = useState<number>(Date.now());
const [wsActive, setWsActive] = useState(true);

// WS handler
useEffect(() => {
  if (!userUuid) return;
  let wsTimedOut = false;
  
  const handleEvent = () => {
    setLastWsEvent(Date.now());
    wsTimedOut = false;
    fetchData();
  };

  const unsub = subscribeUserJobs(userUuid, {
    onCompleted: handleEvent,
    onFailed: handleEvent,
    onQueued: handleEvent,
  });
  
  // Check if WS has timed out (no events in 30s)
  const wsCheckInterval = setInterval(() => {
    if (hasActive && Date.now() - lastWsEvent > 15000) {
      setWsActive(false);
    } else {
      setWsActive(true);
    }
  }, 5000);

  const pollInterval = setInterval(fetchData, 30000);
  
  return () => {
    unsub?.();
    clearInterval(pollInterval);
    clearInterval(wsCheckInterval);
  };
}, [userUuid, hasActive, lastWsEvent]); // Note: fetchData via ref
```

**UI indicator** (in the top bar or inline with Timer):
```tsx
{hasActive && !wsActive && (
  <motion.p
    initial={{ opacity: 0, y: -5 }}
    animate={{ opacity: 1, y: 0 }}
    className="text-[10px] text-amber-500/70 flex items-center gap-1"
  >
    <span className="h-1.5 w-1.5 rounded-full bg-amber-500/70" />
    Đang chờ kết nối thời gian thực...
  </motion.p>
)}
```

### 6. Stale Closure Fix

**Issue:** The WebSocket effect only depends on `[userUuid]`, but `fetchData` is defined inside the component and could be stale.

**Fix:** Use `useCallback` for `fetchData` and `useRef` for the polling interval:

```tsx
// Option A: useCallback + add to deps
const fetchData = useCallback(async () => {
  // ... same implementation
}, [projectId]);

useEffect(() => {
  if (!userUuid) return;
  const unsub = subscribeUserJobs(userUuid, {
    onCompleted: () => fetchData(),
    onFailed: () => fetchData(),
    onQueued: () => fetchData(),
  });
  const interval = setInterval(fetchData, 30000);
  return () => { unsub?.(); clearInterval(interval); };
}, [userUuid, fetchData]); // fetchData in deps now
```

**But this re-subscribes on every re-render where `fetchData` identity changes.** Better approach:

```tsx
// Option B: useRef to store latest fetchData
const fetchDataRef = useRef(fetchData);
fetchDataRef.current = fetchData;

useEffect(() => {
  if (!userUuid) return;
  const safeFetch = () => fetchDataRef.current();
  const unsub = subscribeUserJobs(userUuid, {
    onCompleted: safeFetch,
    onFailed: safeFetch,
    onQueued: safeFetch,
  });
  const interval = setInterval(safeFetch, 30000);
  return () => { unsub?.(); clearInterval(interval); };
}, [userUuid]); // deps unchanged — no re-subscribe
```

**Recommendation: Option B** — minimal change, no risk of re-subscribe loops.

### 7. Backend: Add `output_url` to RenderJobController::index

**Current:** `index()` strips `output_path` and `assets` from the response.

**Fix:**

```php
// In RenderJobController::index()
$paginated['items'] = collect($paginated['items'])->map(function ($job) {
    $assets = $job->assets()->whereIn('type', ['video', 'image', 'audio'])->get();
    $primaryAsset = $assets->first();
    
    return [
        'uuid' => $job->uuid,
        'status' => $job->status,
        'prompt' => $job->prompt,
        'duration_seconds' => $job->duration_seconds,
        'resolution' => $job->resolution,
        'aspect_ratio' => $job->aspect_ratio,
        'error_message' => $job->error_message
            ? 'Hệ thống AI tạm thời không khả dụng. Vui lòng thử lại sau.'
            : null,
        'created_at' => $job->created_at,
        'updated_at' => $job->updated_at,
        // NEW FIELDS:
        'output_url' => $primaryAsset?->url ?? null,
        'mime_type' => $primaryAsset?->mime_type ?? null,
        'assets' => $assets->map(fn($a) => [
            'uuid' => $a->uuid,
            'type' => $a->type,
            'mime_type' => $a->mime_type,
            'url' => $a->url,
            'size_bytes' => $a->size_bytes,
        ])->toArray(),
    ];
})->toArray();
```

**Performance consideration:** Eager-load assets to avoid N+1:
```php
$query->with(['assets' => fn($q) => $q->whereIn('type', ['video', 'image', 'audio'])]);
```

### 8. RenderJobRecord Type Update

```tsx
// In types.ts
export interface RenderJobRecord {
  id: number;
  uuid: string;
  status: string;
  prompt: string;
  model?: string;
  capability?: string;
  video_type?: string;
  duration_seconds: number;
  aspect_ratio: string;
  resolution: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
  parameters?: Record<string, any>;
  // NEW:
  output_url?: string | null;
  mime_type?: string | null;
  assets?: {
    uuid: string;
    type: string;
    mime_type: string;
    url: string;
    size_bytes?: number;
  }[];
}
```

### 9. Race Condition Fix

**Issue:** Daemon marks task "done" but Laravel RenderJob is "queued" momentarily.

**Fix:** Debounce the "queued" event handler in WebSocket — if we see "done" in the same render cycle, don't flash "queued":

```tsx
// In page.tsx WebSocket handler
const handleWsEvent = useCallback((data: any) => {
  // Immediately trigger fetch to get latest state
  fetchData();
  // Don't rely on event status — always fetch from server
}, [fetchData]);
```

Also, add a "cooldown" in `fetchData` — skip the first 2 seconds after a queued event:
```tsx
const lastFetchRef = useRef(0);

const fetchData = useCallback(async () => {
  const now = Date.now();
  if (now - lastFetchRef.current < 2000) return; // debounce 2s
  lastFetchRef.current = now;
  // ... rest
}, [projectId]);
```

---

## Detailed File Changes

### `apps/web/src/components/projects/task-card.tsx`

**Changes:**
1. `FileInfo` component:
   - Add `isVideo = file.mime?.startsWith('video/')` and `isAudio = file.mime?.startsWith('audio/')`
   - Auto-load video/audio previews on mount (same `useEffect` as images)
   - Render `<video>` with controls for video, `<audio>` with controls for audio
   - Remove "Xem" button for video/audio (inline player replaces it)
   - Keep "Xem" button only for unknown MIME types
   - Keep download button for all types

2. `TaskCard` component:
   - Merge the two output render branches (lines 240-252) into one:
     - Remove `!isImage` condition in line 251
     - Render output preview for ALL completed tasks with files
     - `OutputPreview` handles MIME detection internally

3. Add `id` prop to the task card motion div: `id={`task-${task.taskId}`}`

### `apps/web/src/app/(dashboard)/projects/[id]/page.tsx`

**Changes:**
1. Add imports: `useCallback`
2. Add `handleViewResult` callback (scroll to task)
3. Add `hasOutput` computation
4. Pass `onViewResult` and `hasOutput` to `CinematicGenerationStatus`
5. Fix stale closure: add `const fetchDataRef = useRef(fetchData)` and use in WS effect
6. Add WS fallback state: `const [wsActive, setWsActive] = useState(true)`
7. Add WS timeout check interval
8. Add debounce in `fetchData` for race condition
9. Add "still waiting" UI indicator near the top bar or CinematicGenerationStatus

### `apps/web/src/components/projects/cinematic-generation-status.tsx`

**Changes:**
1. Update `OrbPulse` to accept `status` prop instead of `active: boolean`
2. Add done-state visual: glow ring, CheckCircle2 icon, Sparkles
3. Add success animation on status='done': scale-in, ripple effect
4. Already has `onViewResult`/`hasOutput` support — just needs props passed from parent

### `apps/web/src/components/projects/job-history.tsx`

**Changes:**
1. For jobs where `status === 'completed'` and `output_url` exists, render a media preview
2. Add a video player or image preview inside the job card
3. Show a small "Có kết quả" badge when no URL but completed

### `apps/web/src/components/projects/types.ts`

**Changes:**
Add to `RenderJobRecord`:
```tsx
output_url?: string | null;
mime_type?: string | null;
assets?: { uuid: string; type: string; mime_type: string; url: string; size_bytes?: number }[];
```

### `backend/app/Http/Controllers/API/RenderJobController.php`

**Changes:**
1. In `index()` method:
   - Add `->with(['assets' => fn($q) => $q->whereIn('type', ['video', 'image', 'audio'])])` to the query
   - Add `output_url`, `mime_type`, `assets` to the mapped response items

---

## Data Flow

```
WebSocket Event (JobCompleted/JobFailed)
        │
        ▼
page.tsx: fetchDataRef.current()
        │
        ├── daemon.getProject(projectId)
        ├── daemon.listTasks(projectId)     ← has file info with mime
        └── laravel.renderJobs(projectId)   ← has output_url from backend fix
                │
                ▼
        tasks[] with file.mime
        renderJobs[] with output_url
                │
        ┌───────┴───────┐
        ▼               ▼
TaskCard            JobHistory
  ├── isVideo → <video>   ├── completed → <video> or <img>
  ├── isAudio → <audio>   └── no media  → text badge
  └── isImage → <img>
        │
        ▼
CinematicGenerationStatus
  ├── hasOutput=true (tasks have done+file)
  ├── onViewResult → scroll to task
  └── done animation on completion
```

---

## Verification Steps

### Phase 1 Verification

| Task | How to Verify |
|------|---------------|
| 1.1 Video player | Generate video → open project page → see `<video>` with controls in task card → play works |
| 1.1 Audio player | Generate audio → open project page → see `<audio>` with controls in task card → play works |
| 1.2 Xem kết quả | Complete a task → scroll up → "Xem kết quả" button visible → click → scrolls to task |
| 1.3 Auto-load | Complete video task → video loads automatically (no "Xem" click needed) |
| 1.4 JobHistory media | Complete job → go to project page → scroll to "Lịch sử tác vụ" → see media preview in card |
| 1.5 Stale closure | Start job → WebSocket fires → data refreshes correctly → no "stale data" console warnings |

### Phase 2 Verification

| Task | How to Verify |
|------|---------------|
| 2.1 Backend API | `GET /api/render-jobs?daemon_project_id=X` → response includes `output_url`, `mime_type`, `assets` |
| 2.2 Frontend types | `tsc --noEmit` passes → no type errors for `job.output_url` usage |
| 2.3 Race condition | During active job → observe that "queued" doesn't flash after "done" |

### Phase 3 Verification

| Task | How to Verify |
|------|---------------|
| 3.1 Success animation | Job completes → see green glow ring, CheckCircle2 icon, sparkle text in the cinematic view |
| 3.2 WS fallback | Disconnect WebSocket → during active job → see "Đang chờ kết nối..." indicator within 30s |

### Quick Sanity Check
```bash
cd apps/web && npx tsc --noEmit   # Should pass with 0 errors
cd backend && docker compose -f docker-compose.dev.yml exec app php artisan test --filter="RenderJobTest"   # Should pass
```

---

## Dependencies Graph

```
Phase 1:
  1.1 (video player) ──independent──┐
  1.5 (stale closure) ──independent─┤
                                    ├──> 1.2 (pass props) ──> 1.3 (auto-load)
                                    └──> 1.4 (JobHistory preview)
                                                     │
Phase 2:                                             │
  2.1 (backend API) ─────────────────────────────────┘ (needed for assets)
  2.2 (frontend types) ───independent──┐
                                       └──> 2.3 (race condition)
                                                      
Phase 3:
  3.1 (success anim) ──depends on 1.2──
  3.2 (WS fallback) ──depends on 1.5──
```

---

## Effort Estimate

| Phase | Task | Agent | Estimated Time |
|-------|------|-------|---------------|
| 1.1 | Video/audio player in task-card.tsx | @web | 1h |
| 1.2 | Pass onViewResult/hasOutput in page.tsx | @web | 30min |
| 1.3 | Auto-load video/audio (included in 1.1) | @web | — |
| 1.4 | JobHistory media previews | @web | 45min |
| 1.5 | Stale closure fix | @web | 15min |
| 2.1 | Backend API add output_url | @backend | 30min |
| 2.2 | Update RenderJobRecord type | @web | 10min |
| 2.3 | Race condition debounce | @web | 15min |
| 3.1 | Success animation | @web | 30min |
| 3.2 | WS fallback indicator | @web | 20min |

**Total: ~4.5h** (3.5h web + 0.5h backend + 0.5h buffer)

---

## Risks & Trade-offs

| Risk | Mitigation |
|------|------------|
| **Blob URL memory leak**: Video/audio blob URLs are not revoked | Add cleanup `useEffect` that revokes blob URL on unmount |
| **Large video download**: Auto-loading large videos may use bandwidth | Only auto-load when task is `done`; video uses streaming via `<video src>` which doesn't download fully |
| **Backend N+1 query**: Loading assets per job in index | Eager-load with `with('assets')` — already mitigated |
| **WS re-subscribe loop**: If `fetchData` changes identity | Use `useRef` pattern (Option B) — no identity change |
| **Race condition still visible**: Debounce may still show flash | 2s debounce window covers most cases; full fix requires server-side coordination (out of scope) |
