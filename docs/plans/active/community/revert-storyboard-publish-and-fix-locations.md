# Revert Storyboard Publish & Fix RenderJob Publish Locations

## Date
2026-06-13

## Overview
The previous implementation incorrectly added publish functionality to Storyboards. The correct architecture is that community features operate on RenderJobs (individual assets), NOT Storyboards. This plan reverts the incorrect changes and adds publish buttons to the correct locations where RenderJob detail pages exist.

## Background

### Correct Architecture (Already Implemented)
- **Backend API**: `PATCH /render-jobs/{uuid}/publish` — works correctly
- **Backend API**: `PATCH /render-jobs/{uuid}/unpublish` — works correctly  
- **Community Feed**: queries `RenderJob::published()` — works correctly
- **PublishModal component**: exists at `apps/web/src/components/community/publish-modal.tsx` — but NOT USED

### What's WRONG (Needs to be Reverted)
1. Storyboard migration added `visibility`, `published_at`, `tags` columns — NOT NEEDED
2. Storyboard model has `publish()`, `unpublish()`, `isPublished()` methods — NOT NEEDED
3. StoryboardController has publish/unpublish endpoints — NOT NEEDED
4. Storyboard viewer page has publish button — WRONG LOCATION

## User Stories
- As a user, I want to publish my completed RenderJob assets to the community
- As a user, I want to unpublish my assets from the community
- As a user, I want to see publish status on my render jobs

## Technical Design

### Phase 1: Revert Incorrect Storyboard Changes

#### 1.1 Remove Migration
**File**: `backend/database/migrations/2026_06_13_000001_add_community_fields_to_storyboards_table.php`
- Action: DELETE this migration file
- Impact: Removes `visibility`, `published_at`, `tags` columns from `storyboards` table

#### 1.2 Remove from Storyboard Model
**File**: `backend/app/Models/Storyboard.php`
- Remove from `$fillable`: `'visibility', 'published_at', 'tags'`
- Remove from `$casts`: `'published_at' => 'datetime'`, `'tags' => 'array'`
- Remove methods:
  - `isPublished()`
  - `publish(string $visibility, array $tags = [])`
  - `unpublish()`

#### 1.3 Remove from StoryboardController
**File**: `backend/app/Http/Controllers/API/StoryboardController.php`
- Remove methods:
  - `publish(Request $request, Storyboard $storyboard)`
  - `unpublish(Request $request, Storyboard $storyboard)`

#### 1.4 Remove Routes
**File**: `backend/routes/api.php`
- Remove lines:
  ```php
  Route::patch('/storyboards/{storyboard:uuid}/publish', [StoryboardController::class, 'publish']);
  Route::patch('/storyboards/{storyboard:uuid}/unpublish', [StoryboardController::class, 'unpublish']);
  ```

#### 1.5 Remove Frontend Client Methods
**File**: `apps/web/src/lib/api/client.ts`
- Remove methods:
  - `communityPublishStoryboard()`
  - `communityUnpublishStoryboard()`

#### 1.6 Remove from Storyboard Viewer Page
**File**: `apps/web/src/app/(builder)/studio/storyboard/flow/[uuid]/page.tsx`
- Remove import: `import { PublishModal } from '@/components/community/publish-modal';`
- Remove state variables:
  - `const [publishModalOpen, setPublishModalOpen] = useState(false);`
  - `const [publishLoading, setPublishLoading] = useState(false);`
  - `const [unpublishLoading, setUnpublishLoading] = useState(false);`
  - `const isPublished = !!sb?.published_at && sb?.visibility !== 'private';`
- Remove handler: `handleUnpublish` callback
- Remove UI elements:
  - Publish button ("Đăng lên Cộng đồng")
  - Unpublish button ("Đã đăng")
  - `<PublishModal>` component
- Remove `Share2` icon from imports

### Phase 2: Add Publish to Correct Locations

#### 2.1 Jobs Page (Job History)
**File**: `apps/web/src/app/(dashboard)/jobs/page.tsx`

**Current State**: The page lists all tasks (daemon + Laravel render jobs) in `JobItemCard` components. Completed tasks show "Hoàn tất" status.

**Changes Needed**:
1. Add `PublishModal` import
2. Add state for publish modal per task: `publishModalOpen: string | null` (task UUID)
3. Add publish/unpublish handlers calling `laravel.communityPublish()` / `laravel.communityUnpublish()`
4. Add publish button to `JobItemCard` for completed tasks with `id` (Laravel render jobs)

**UI Placement**: In the `JobItemCard` component, add a publish button next to the status label when:
- Task has `id` (is a Laravel render job)
- Task status is `done`/`completed`
- Task is not currently publishing

**Button Design**:
```tsx
{isDone && task.id && !task.id.startsWith('laravel:') && (
  <button onClick={() => setPublishModalOpen(task.id || null)}
    className="cursor-pointer h-8 flex items-center gap-1.5 px-3 rounded-xl bg-[#FF5A1F] hover:bg-[#FF6B35] text-[11px] text-white font-semibold transition-all">
    <Share2 className="h-3 w-3" />
    <span className="hidden sm:inline">Đăng</span>
  </button>
)}
```

**PublishModal Integration**:
```tsx
<PublishModal
  isOpen={!!publishModalOpen}
  onClose={() => setPublishModalOpen(null)}
  assetName={tasks.find(t => t.id === publishModalOpen)?.prompt || 'Tác phẩm'}
  creditsCost={0}
  onConfirm={async (visibility, tags) => {
    if (!publishModalOpen) return;
    try {
      await laravel.communityPublish(publishModalOpen, visibility, tags);
      addToast('Đăng lên cộng đồng thành công!', 'success');
      fetchTasks(); // Refresh list
    } catch (e: any) {
      if (e?.status === 403) addToast('Tính năng dành cho gói Pro trở lên', 'error');
      else if (e?.status === 429) addToast('Đã đạt giới hạn publish hôm nay', 'error');
      else addToast(e?.message || 'Lỗi', 'error');
    }
  }}
/>
```

#### 2.2 Project Detail Page
**File**: `apps/web/src/app/(dashboard)/projects/[id]/page.tsx`

**Current State**: Shows project tasks and `JobHistory` component with render jobs.

**Changes Needed**:
1. Add `PublishModal` import
2. Add state: `publishModalOpen: string | null` (render job UUID)
3. Add publish button to `JobHistory` component (pass callback)
4. Or add publish button directly in project detail page near the render job display

**Option A - Add to JobHistory Component** (Recommended):
- Modify `apps/web/src/components/projects/job-history.tsx` to accept `onPublish` callback
- Each completed job gets a publish button

**Option B - Add to Project Detail Page**:
- Add publish button next to the primary render job display
- Show publish status on the render job

**Recommended Approach**: Modify `JobHistory` component to support publish actions.

#### 2.3 JobHistory Component Enhancement
**File**: `apps/web/src/components/projects/job-history.tsx`

**Changes**:
1. Add props: `onPublish?: (job: RenderJobRecord) => void`, `onUnpublish?: (job: RenderJobRecord) => void`
2. Add publish/unpublish buttons to each completed job
3. Add `Share2` and `CheckCircle` icons

**Button Design**:
```tsx
{job.status === 'completed' && onPublish && (
  <button onClick={() => onPublish(job)}
    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF5A1F]/10 hover:bg-[#FF5A1F]/20 text-[#FF5A1F] text-[10px] font-bold transition-all border border-[#FF5A1F]/20">
    <Share2 className="h-3 w-3" />
    Đăng
  </button>
)}
```

### Data Flow

```
User clicks "Đăng" button
    ↓
PublishModal opens
    ↓
User selects visibility + tags, clicks confirm
    ↓
Frontend calls: laravel.communityPublish(uuid, visibility, tags)
    ↓
Backend: CommunityController::publish() — validates, updates RenderJob
    ↓
Frontend: Refreshes task list / shows success toast
```

### API Contracts (Existing - No Changes Needed)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| PATCH | `/render-jobs/{uuid}/publish` | Publish asset to community |
| PATCH | `/render-jobs/{uuid}/unpublish` | Unpublish asset |

### Frontend Components

| Component | Purpose | Status |
|-----------|---------|--------|
| `PublishModal` | Modal for selecting visibility and tags | ✅ Exists, needs integration |
| `JobItemCard` | Task card in Jobs page | Modify to add publish button |
| `JobHistory` | Render job history in Project page | Modify to add publish button |

### Database Changes

| Table | Migration | Purpose |
|-------|-----------|---------|
| `storyboards` | REMOVE migration | Remove incorrect community columns |

## Edge Cases

1. **What if user tries to publish a non-completed job?**
   - Backend validates: `$renderJob->status !== 'completed'` → returns 422
   - Frontend: Only show publish button for completed jobs

2. **What if user exceeds daily publish limit?**
   - Backend validates: `$todayCount >= $limit` → returns 429
   - Frontend: Show error toast "Đã đạt giới hạn publish hôm nay"

3. **What if user is not Pro?**
   - Backend validates: `!$user->isPro()` → returns 403
   - Frontend: Show error toast "Tính năng dành cho gói Pro trở lên"

4. **What if publish API call fails?**
   - Frontend: Catch error, show appropriate toast message

5. **What about existing storyboard published data?**
   - Migration rollback will remove the columns
   - Any existing data in those columns will be lost (acceptable since it was incorrect)

## Risks & Trade-offs

| Risk | Mitigation |
|------|------------|
| Data loss from migration rollback | Acceptable - data was incorrectly placed |
| Users may expect publish on storyboard | Document correct architecture in release notes |
| PublishModal props may need adjustment | Review Modal interface, adjust if needed |

## Implementation Tasks

| # | Layer | Task | Agent | Est. |
|---|-------|------|-------|------|
| 1 | Backend | Delete migration file `2026_06_13_000001_add_community_fields_to_storyboards_table.php` | @backend | 5 min |
| 2 | Backend | Remove `publish()`, `unpublish()`, `isPublished()` from Storyboard model | @backend | 15 min |
| 3 | Backend | Remove `publish()`, `unpublish()` from StoryboardController | @backend | 10 min |
| 4 | Backend | Remove storyboard publish/unpublish routes from api.php | @backend | 5 min |
| 5 | Web | Remove `communityPublishStoryboard()`, `communityUnpublishStoryboard()` from client.ts | @web | 10 min |
| 6 | Web | Remove publish UI from storyboard viewer page | @web | 20 min |
| 7 | Web | Add publish button and modal to Jobs page (JobItemCard) | @web | 30 min |
| 8 | Web | Add publish props and buttons to JobHistory component | @web | 25 min |
| 9 | Web | Integrate PublishModal in Project detail page | @web | 20 min |
| 10 | Test | Verify publish flow works on correct pages | @tester | 30 min |
| 11 | Docs | Update architecture documentation | @planner | 10 min |

## File Changes Summary

### Files to DELETE
- `backend/database/migrations/2026_06_13_000001_add_community_fields_to_storyboards_table.php`

### Files to MODIFY (Backend)
- `backend/app/Models/Storyboard.php` — Remove community fields and methods
- `backend/app/Http/Controllers/API/StoryboardController.php` — Remove publish/unpublish
- `backend/routes/api.php` — Remove storyboard publish routes

### Files to MODIFY (Frontend)
- `apps/web/src/lib/api/client.ts` — Remove storyboard publish methods
- `apps/web/src/app/(builder)/studio/storyboard/flow/[uuid]/page.tsx` — Remove publish UI
- `apps/web/src/app/(dashboard)/jobs/page.tsx` — Add publish button to JobItemCard
- `apps/web/src/components/projects/job-history.tsx` — Add publish button props
- `apps/web/src/app/(dashboard)/projects/[id]/page.tsx` — Integrate publish modal

## Verification

- [ ] Backend: Storyboard model no longer has publish methods
- [ ] Backend: StoryboardController no longer has publish endpoints
- [ ] Backend: Routes no longer include storyboard publish
- [ ] Frontend: Storyboard viewer page has no publish button
- [ ] Frontend: Jobs page shows publish button for completed render jobs
- [ ] Frontend: Project detail page shows publish button in job history
- [ ] Frontend: PublishModal opens and calls correct API endpoint
- [ ] Frontend: Success/error toasts display correctly
- [ ] End-to-end: Can publish/unpublish render jobs from correct locations

## Handoff Notes

- **@backend**: Execute tasks 1-4 (revert storyboard changes)
- **@web**: Execute tasks 5-9 (remove storyboard UI, add to correct pages)
- **@tester**: Execute task 10 (verify end-to-end)
- **@planner**: Execute task 11 (update docs)
