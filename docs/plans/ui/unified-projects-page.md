# Unified `/projects` Page — Design Plan

## Date
2026-06-05

## Overview
Merge `/studio/storyboard` (storyboard list) into `/projects` (daemon projects list) so there's ONE page showing every user project. The frontend fetches from both `daemon.listProjects()` and `laravel.storyboards()`, merges client-side into a unified typed list. No backend or daemon API changes needed — data storage stays as-is.

## Key Insight
Storyboard-created daemon projects have `user_id = 'laravel-app'` (set by `DaemonClient`), while regular user projects have the user's actual UUID. The daemon's `listProjects` filters by `x-user-id`, so storyboard-owned daemon projects **already do not appear** in the frontend's project list. This means:

- **`daemon.listProjects()`** → only standalone projects (created from Studio directly)
- **`laravel.storyboards()`** → storyboard business entities
- These two sets are naturally disjoint — no filtering needed

## User Stories
- As a user, I want to see ALL my work (storyboards + generated videos/images/audio) in one place
- As a user, I want to filter by type so I can find what I need quickly
- As a user, I want to click a storyboard and open its builder/editor
- As a user, I want to click a generated project and see its detail/tasks
- As a user, I want the list sorted by most recent first

## Design Analysis

### Existing Routes

| Route | Layout | Purpose | Current data source |
|-------|--------|---------|-------------------|
| `/projects` | Dashboard (sidebar) | Project list | `daemon.listProjects()` |
| `/projects/[id]` | Dashboard (sidebar) | Project detail | `daemon.getProject()` + tasks |
| `/studio/storyboard` | Dashboard (sidebar) | Storyboard list | `laravel.storyboards()` |
| `/studio/storyboard/flow/[uuid]` | Builder (full-screen) | Viewer/editor | `laravel.storyboard(uuid)` |
| `/jobs` | Dashboard (sidebar) | All jobs/tasks | `daemon.listProjects()` + `laravel.renderJobs()` |

### Storyboard Fields (from `laravel.storyboards()` API)
```typescript
{
  uuid: string;           // "550e8400-..."
  title: string;
  status: 'draft' | 'analyzing' | 'analyzed' | 'rendering' | 'rendered' | 'completed' | 'failed';
  video_type: string;     // "ugc_review", "brand_tvc", etc.
  quality_tier: string;   // "standard", "premium", etc.
  scenes_count: number;
  credits_cost: number;
  total_duration: number | null;
  created_at: string;     // ISO date
  updated_at: string;     // ISO date
  output_path: string | null;
  render_mode: 'multi_scene' | 'single_flow' | 'storyboard_image';
  consistency_score: number | null;
  // ... more fields
}
```

### Daemon Project Fields (from `daemon.listProjects()`)
```typescript
{
  uuid: string;             // random UUID
  name: string;
  surface: 'video' | 'image' | 'audio' | null;
  skillId: string | null;
  lastTaskFile: string | null;
  lastTaskStatus: 'queued' | 'running' | 'done' | 'failed' | null;
  createdAt: number;        // unix ms
  updatedAt: number;        // unix ms
  metadata: Record<string, unknown> | null;
}
```

### Storyboard-created Daemon Project ID Patterns
The Laravel `StoryboardRenderer` creates daemon projects with these IDs:
- `{storyboardUuid}-single-flow` — single-flow render
- `{storyboardUuid}-scene-{n}` — multi-scene render (n = scene_number)
- `multi-panel-{storyboardUuid}` — multi-panel image generation
- `{storyboardUuid}-voiceover-{uuid}` — voiceover generation (via DaemonClient)

These have `user_id = 'laravel-app'` so they're invisible to the frontend. No filtering needed.

---

## Technical Design

### Data Model

**New file**: `apps/web/src/lib/api/unified-project-types.ts`

```typescript
export type UnifiedProjectType = 'storyboard' | 'video' | 'image' | 'audio' | 'other';

export type UnifiedStatus = 'draft' | 'analyzing' | 'analyzed' | 'processing' | 'done' | 'failed' | 'queued';

export interface UnifiedProject {
  // Common
  id: string;                        // unique React key
  source: 'storyboard' | 'daemon';
  type: UnifiedProjectType;
  title: string;
  status: UnifiedStatus;
  statusLabel: string;               // Vietnamese display label
  createdAt: string | number;
  updatedAt: string | number;
  href: string;                      // click destination

  // Preview
  hasThumbnail: boolean;
  thumbnailUrl?: string | null;      // blob URL or download URL

  // Storyboard-specific
  storyboard?: {
    uuid: string;
    scenesCount: number;
    creditsCost: number;
    totalDuration: number | null;
    qualityTier: string;
    videoType: string;
    renderMode: string;
    outputPath: string | null;
  };

  // Daemon-specific
  daemon?: {
    projectId: string;
    surface: string | null;
    lastTaskStatus: string | null;
    lastTaskFile: string | null;
  };
}
```

### Status Mapping Table

| Source | Source Status | Mapped `UnifiedStatus` | Display Label |
|--------|--------------|----------------------|---------------|
| Storyboard | `draft` | `draft` | Bản nháp |
| Storyboard | `analyzing` | `analyzing` | Đang phân tích |
| Storyboard | `analyzed` | `analyzed` | Đã phân tích |
| Storyboard | `rendering` | `processing` | Đang xử lý |
| Storyboard | `rendered` | `done` | Hoàn thành |
| Storyboard | `completed` | `done` | Hoàn thành |
| Storyboard | `failed` | `failed` | Thất bại |
| Daemon | `queued` | `queued` | Đang chờ |
| Daemon | `running` | `processing` | Đang xử lý |
| Daemon | `done` | `done` | Hoàn thành |
| Daemon | `failed` | `failed` | Thất bại |

### Type Mapping

| Source | Condition | Mapped Type |
|--------|-----------|-------------|
| Storyboard | Always | `storyboard` |
| Daemon | `surface === 'video'` | `video` |
| Daemon | `surface === 'image'` | `image` |
| Daemon | `surface === 'audio'` | `audio` |
| Daemon | No surface / other | `other` |

### Click Behavior

| Type | Navigate to |
|------|------------|
| `storyboard` | `/studio/storyboard/flow/{storyboardUuid}` |
| `video`/`image`/`audio`/`other` | `/projects/{daemonProjectId}` |

### Thumbnail Strategy

| Source | Thumbnail Logic |
|--------|----------------|
| Storyboard (completed) | Use `laravel.downloadStoryboard(uuid)` to get video URL. Show `<video>` element. |
| Storyboard (not completed/no output) | Show empty state with scenes placeholder (current behavior) |
| Daemon (has `lastTaskFile`) | `fetchRawFile(projectId, lastTaskFile)` → blob URL. Show `<img>`. |
| Daemon (no file) | Show `Clapperboard` icon placeholder |

### Merging and Sorting Logic

**New file**: `apps/web/src/lib/api/unified-projects.ts`

```typescript
export async function fetchUnifiedProjects(): Promise<UnifiedProject[]> {
  // Fetch in parallel
  const [daemonProjects, storyboardsRes] = await Promise.allSettled([
    daemon.listProjects(),
    laravel.storyboards({ per_page: 100 }).catch(() => null),
  ]);

  const items: UnifiedProject[] = [];

  // Map daemon projects → UnifiedProject
  if (daemonProjects.status === 'fulfilled') {
    for (const p of daemonProjects.value) {
      items.push(daemonProjectToUnified(p));
    }
  }

  // Map storyboards → UnifiedProject
  if (storyboardsRes.status === 'fulfilled' && storyboardsRes.value?.data) {
    for (const sb of storyboardsRes.value.data) {
      items.push(storyboardToUnified(sb));
    }
  }

  // Sort by updatedAt descending
  items.sort((a, b) => {
    const aTime = typeof a.updatedAt === 'number' ? a.updatedAt : new Date(a.updatedAt).getTime();
    const bTime = typeof b.updatedAt === 'number' ? b.updatedAt : new Date(b.updatedAt).getTime();
    return bTime - aTime;
  });

  return items;
}
```

### Filter Tabs Configuration

```typescript
const FILTER_TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'storyboard', label: 'Storyboard' },
  { key: 'video', label: 'Video' },
  { key: 'image', label: 'Ảnh' },
  { key: 'audio', label: 'Âm thanh' },
];
```

The page reads `?type=` query param to pre-select the active tab:
- `/projects` → 'all'
- `/projects?type=storyboard` → 'storyboard'
- `/projects?type=video` → 'video'
- etc.

### Page Layout

```
┌─────────────────────────────────────────────────────────┐
│ [H1: Dự án]                              [+ Tạo mới]   │
│ Mô tả ngắn về trang dự án                              │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ [Tất cả] [Storyboard] [Video] [Ảnh] [Âm thanh]     │ │
│ │                                      🔍 Tìm kiếm... │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐           │
│ │ 🎬   │ │ 📝   │ │ 🖼️  │ │ 🎵   │ │ 🎬   │           │
│ │Video │ │Story │ │Image│ │Audio│ │Video│           │
│ │Hoàn  │ │Phân  │ │Lỗi  │ │Chờ  │ │Xử lý│           │
│ │thành │ │tích  │ │     │ │     │ │     │           │
│ │20/5  │ │19/5  │ │18/5 │ │17/5 │ │16/5 │           │
│ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘           │
│                                                         │
│ (Grid: 5 columns on desktop, 4 on tablet, 2 on mobile) │
└─────────────────────────────────────────────────────────┘
```

**Card layout** (each card):
- **Thumbnail area**: 16:9 aspect ratio (uniform for all types)
  - Storyboard completed: video element with play overlay
  - Storyboard not completed: scenes placeholder blocks
  - Daemon with file: image preview
  - Daemon without file: gradient placeholder + icon
- **Type badge**: top-left, e.g., "Storyboard", "Video", "Image", "Audio"
- **Status badge**: top-right, color-coded
- **Title**: truncated single line
- **Metadata row**: type-dependent
  - Storyboard: "5 cảnh · 120cr · 30s"
  - Daemon: "video · 16/05/2026"

### Sidebar / Navigation Changes

1. **Storyboard submenu item** under Studio changes link:
   - From: `/studio/storyboard`
   - To: `/projects?type=storyboard`

2. **`/studio/storyboard` route** becomes a simple redirect page:
   - Next.js page that does `router.replace('/projects?type=storyboard')`

3. **`(builder)/studio/storyboard/flow` and `flow/[uuid]`** — UNCHANGED. These are in the `(builder)` layout group (full-screen, no sidebar) and will continue to work as the editor/viewer.

4. **`/projects` submenu** in sidebar stays the same.

### Component Tree

```
app/(dashboard)/projects/page.tsx
  └── <UnifiedProjectsPage>              // page component
       ├── Header (title + "Tạo mới" button → /studio)
       ├── FilterBar (tabs + search)
       └── ProjectGrid
            └── <UnifiedProjectCard>      // new card component
                 ├── Thumbnail section (video/img/placeholder)
                 ├── Type badge (storyboard/video/image/audio)
                 ├── Status badge (color-coded)
                 ├── Title line
                 └── Metadata row
```

---

## File-by-File Changes

### NEW FILES

| # | File | Purpose |
|---|------|---------|
| 1 | `apps/web/src/lib/api/unified-project-types.ts` | `UnifiedProject` interface + type helpers |
| 2 | `apps/web/src/lib/api/unified-projects.ts` | `fetchUnifiedProjects()` merge function |
| 3 | `apps/web/src/components/projects/unified-project-card.tsx` | New card component for unified list |

### MODIFIED FILES

| # | File | Change |
|---|------|--------|
| 4 | `apps/web/src/app/(dashboard)/projects/page.tsx` | Complete rewrite — uses unified data, filter tabs, new card component |
| 5 | `apps/web/src/app/(dashboard)/studio/storyboard/page.tsx` | Replace list with redirect to `/projects?type=storyboard` |
| 6 | `apps/web/src/components/layout/sidebar.tsx` | Change Storyboard href → `/projects?type=storyboard` |
| 7 | `apps/web/src/lib/i18n.ts` | Add new translation keys for filter tabs and status labels |
| 8 | `apps/web/src/components/ui/project-card.tsx` | Keep for backward compatibility (used in detail page contexts), or minor updates |

### UNCHANGED FILES

| File | Why unchanged |
|------|---------------|
| `apps/web/src/app/(builder)/studio/storyboard/flow/page.tsx` | Editor stays as-is |
| `apps/web/src/app/(builder)/studio/storyboard/flow/[uuid]/page.tsx` | Viewer stays as-is |
| `apps/web/src/app/(dashboard)/projects/[id]/page.tsx` | Detail page stays as-is for daemon projects |
| `apps/web/src/app/(dashboard)/jobs/page.tsx` | Jobs page stays separate |
| `backend/app/Http/Controllers/API/StoryboardController.php` | No backend changes |
| `apps/daemon/src/routes/projects.ts` | No daemon changes |

---

## Detailed File Specifications

### File 1: `unified-project-types.ts`

```typescript
export type UnifiedProjectType = 'storyboard' | 'video' | 'image' | 'audio' | 'other';
export type UnifiedStatus = 'draft' | 'analyzing' | 'analyzed' | 'processing' | 'done' | 'failed' | 'queued';

export interface UnifiedProject {
  /** Unique key for React rendering */
  id: string;
  /** Source system */
  source: 'storyboard' | 'daemon';
  /** Visual type for filtering */
  type: UnifiedProjectType;
  /** Display title */
  title: string;
  /** Mapped status */
  status: UnifiedStatus;
  /** Vietnamese status label */
  statusLabel: string;
  /** ISO string or unix ms */
  createdAt: string | number;
  /** ISO string or unix ms */
  updatedAt: string | number;
  /** Navigation href when clicked */
  href: string;
  /** Whether a thumbnail/preview is available */
  hasThumbnail: boolean;
  /** URL for thumbnail (blob URL for daemon, download URL for storyboard) */
  thumbnailUrl?: string | null;
  /** Storyboard-specific metadata */
  storyboard?: {
    uuid: string;
    scenesCount: number;
    creditsCost: number;
    totalDuration: number | null;
    qualityTier: string;
    videoType: string;
    renderMode: string;
    outputPath: string | null;
  };
  /** Daemon-specific metadata */
  daemon?: {
    projectId: string;
    surface: string | null;
    lastTaskStatus: string | null;
    lastTaskFile: string | null;
  };
}
```

**Status config** (shared helper):
```typescript
export const STATUS_CONFIG: Record<UnifiedStatus, { label: string; color: string; icon: React.ElementType | null }> = {
  draft:     { label: 'Bản nháp',      color: 'bg-slate-500/20 text-slate-400',          icon: null },
  analyzing: { label: 'Đang phân tích', color: 'bg-[#FF5A1F]/20 text-[#FF8A5B]',       icon: Loader2 },
  analyzed:  { label: 'Đã phân tích',  color: 'bg-emerald-500/20 text-emerald-400',     icon: null },
  processing:{ label: 'Đang xử lý',    color: 'bg-orange-500/20 text-orange-400',       icon: Loader2 },
  done:      { label: 'Hoàn thành',    color: 'bg-emerald-500/20 text-emerald-400',     icon: null },
  failed:    { label: 'Thất bại',      color: 'bg-red-500/20 text-red-400',             icon: null },
  queued:    { label: 'Đang chờ',      color: 'bg-amber-500/20 text-amber-400',         icon: Clock },
};
```

### File 2: `unified-projects.ts`

Two mapper functions + the merge function:

```typescript
import { daemon, laravel, fetchRawFile } from './client';
import type { UnifiedProject, UnifiedProjectType, UnifiedStatus } from './unified-project-types';

function storyboardToUnified(sb: any): UnifiedProject {
  const statusMap: Record<string, UnifiedStatus> = {
    draft: 'draft', analyzing: 'analyzing', analyzed: 'analyzed',
    rendering: 'processing', rendered: 'done', completed: 'done', failed: 'failed',
  };
  const status = statusMap[sb.status] || 'draft';
  return {
    id: `storyboard-${sb.uuid}`,
    source: 'storyboard',
    type: 'storyboard',
    title: sb.title || 'Untitled',
    status,
    statusLabel: STATUS_CONFIG[status].label,
    createdAt: sb.created_at,
    updatedAt: sb.updated_at,
    href: `/studio/storyboard/flow/${sb.uuid}`,
    hasThumbnail: !!sb.output_path,
    thumbnailUrl: sb.output_path ? laravel.downloadStoryboard(sb.uuid) : null,
    storyboard: {
      uuid: sb.uuid,
      scenesCount: sb.scenes_count || 0,
      creditsCost: sb.credits_cost || 0,
      totalDuration: sb.total_duration || null,
      qualityTier: sb.quality_tier || '',
      videoType: sb.video_type || '',
      renderMode: sb.render_mode || 'multi_scene',
      outputPath: sb.output_path || null,
    },
  };
}

function daemonProjectToUnified(p: any): UnifiedProject {
  const typeMap: Record<string, UnifiedProjectType> = {
    video: 'video', image: 'image', audio: 'audio',
  };
  const surface = p.surface || 'other';
  const type = typeMap[surface] || 'other';
  
  const statusMap: Record<string, UnifiedStatus> = {
    done: 'done', running: 'processing', queued: 'queued', failed: 'failed',
    interrupted: 'failed',
  };
  const rawStatus = p.lastTaskStatus || 'done';
  const status = statusMap[rawStatus] || 'done';

  return {
    id: `daemon-${p.uuid}`,
    source: 'daemon',
    type,
    title: p.name || 'Untitled',
    status,
    statusLabel: STATUS_CONFIG[status].label,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    href: `/projects/${p.uuid}`,
    hasThumbnail: !!p.lastTaskFile,
    thumbnailUrl: null, // fetched lazily by card component
    daemon: {
      projectId: p.uuid,
      surface: p.surface,
      lastTaskStatus: rawStatus,
      lastTaskFile: p.lastTaskFile || null,
    },
  };
}

export async function fetchUnifiedProjects(): Promise<UnifiedProject[]> {
  const [daemonProjects, storyboardsRes] = await Promise.allSettled([
    daemon.listProjects().catch(() => []),
    laravel.storyboards({ per_page: 100 }).catch(() => null),
  ]);

  const items: UnifiedProject[] = [];

  if (daemonProjects.status === 'fulfilled') {
    for (const p of daemonProjects.value) {
      items.push(daemonProjectToUnified(p));
    }
  }

  if (storyboardsRes.status === 'fulfilled' && storyboardsRes.value?.data) {
    for (const sb of storyboardsRes.value.data) {
      items.push(storyboardToUnified(sb));
    }
  }

  items.sort((a, b) => {
    const aTime = typeof a.updatedAt === 'number' ? a.updatedAt : new Date(a.updatedAt).getTime();
    const bTime = typeof b.updatedAt === 'number' ? b.updatedAt : new Date(b.updatedAt).getTime();
    return bTime - aTime;
  });

  return items;
}
```

### File 3: `UnifiedProjectCard` component

Key behaviors:
- **Mount**: If daemon project with `lastTaskFile`, calls `fetchRawFile()` → creates blob URL → sets for `<img>`. Cleans up on unmount.
- **Click**: Uses `<Link href={project.href}>` for navigation
- **Status badge**: From `STATUS_CONFIG`
- **Type badge**: Upper-left pill with color per type (storyboard = `#FF5A1F`, video = `#3B82F6`, image = `#10B981`, audio = `#8B5CF6`)
- **Thumbnail aspect**: 16:9 for all types

```typescript
// unified-project-card.tsx — simplified structure:
export function UnifiedProjectCard({ project }: { project: UnifiedProject }) {
  // Fetch blob URL for daemon projects
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  useEffect(() => {
    if (project.source === 'daemon' && project.daemon?.lastTaskFile) {
      fetchRawFile(project.daemon.projectId, project.daemon.lastTaskFile)
        .then(({ blobUrl }) => setPreviewUrl(blobUrl))
        .catch(() => {});
      return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
    }
    // storyboard thumbnail comes from laravel.downloadStoryboard() directly
  }, [project.daemon?.lastTaskFile]);

  return (
    <Link href={project.href}>
      {/* 16:9 thumbnail */}
      {/* Type badge */}
      {/* Status badge (with spinner if processing) */}
      {/* Title */}
      {/* Metadata */}
    </Link>
  );
}
```

### File 4: `projects/page.tsx` (rewrite)

```typescript
export default function UnifiedProjectsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const typeParam = searchParams.get('type') || 'all';
  const [activeTab, setActiveTab] = useState(typeParam);
  const [searchQuery, setSearchQuery] = useState('');
  const [projects, setProjects] = useState<UnifiedProject[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync URL param → state
  useEffect(() => { setActiveTab(typeParam); }, [typeParam]);

  // Fetch unified list
  useEffect(() => {
    fetchUnifiedProjects()
      .then(setProjects)
      .finally(() => setLoading(false));
  }, []);

  // Filter by tab + search
  const filtered = projects.filter(p => {
    const typeMatch = activeTab === 'all' || p.type === activeTab;
    const searchMatch = p.title.toLowerCase().includes(searchQuery.toLowerCase());
    return typeMatch && searchMatch;
  });

  // Update URL when tab changes
  const onTabChange = (tab: string) => {
    const params = new URLSearchParams(searchParams);
    if (tab === 'all') params.delete('type');
    else params.set('type', tab);
    router.replace(`/projects${params.toString() ? '?' + params.toString() : ''}`);
    setActiveTab(tab);
  };

  return (
    <div className="flex flex-col gap-4 md:gap-8 lg:gap-10 pb-20 px-2 md:px-0">
      <Header title="Dự án" description="Tất cả dự án trong một nơi" />
      <FilterBar tabs={FILTER_TABS} activeTab={activeTab} onTabChange={onTabChange} searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      {loading ? <Spinner /> : (
        <ProjectGrid>
          {filtered.map(p => <UnifiedProjectCard key={p.id} project={p} />)}
          {filtered.length === 0 && <EmptyState />}
        </ProjectGrid>
      )}
    </div>
  );
}
```

### File 5: `/studio/storyboard/page.tsx` (redirect)

Replace the entire file with a simple redirect:

```typescript
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StoryboardListRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/projects?type=storyboard'); }, [router]);
  return (
    <div className="flex items-center justify-center py-32">
      <div className="h-6 w-6 rounded-full border-2 border-white/10 border-t-[#FF5A1F] animate-spin" />
    </div>
  );
}
```

### File 6: `sidebar.tsx` — change Storyboard href

In the Studio submenu array, change:
```typescript
{ icon: Clapperboard, label: 'Storyboard', href: '/studio/storyboard' },
```
To:
```typescript
{ icon: Clapperboard, label: 'Storyboard', href: '/projects?type=storyboard' },
```

### File 7: `i18n.ts` — new translation keys

Add these keys to the Vietnamese locale:
```typescript
'projects.tabs.all': 'Tất cả',
'projects.tabs.storyboard': 'Storyboard',
'projects.tabs.video': 'Video',
'projects.tabs.image': 'Ảnh',
'projects.tabs.audio': 'Âm thanh',
'projects.status.draft': 'Bản nháp',
'projects.status.analyzing': 'Đang phân tích',
'projects.status.analyzed': 'Đã phân tích',
'projects.status.processing': 'Đang xử lý',
'projects.status.done': 'Hoàn thành',
'projects.status.failed': 'Thất bại',
'projects.status.queued': 'Đang chờ',
'projects.desc': 'Tất cả dự án trong một nơi',
'projects.empty': 'Chưa có dự án nào',
```

---

## Edge Cases

### 1. Both fetches fail
- Show empty state with "Không thể tải danh sách dự án" and retry button
- Both API calls use `.catch()` to prevent one failure from breaking the other

### 2. One source fails, other succeeds
- Show whatever succeeded. If daemon fails but storyboards load → show storyboards.
- If storyboards fail but daemon loads → show daemon projects.

### 3. Storyboard has no `scenes_count` (pre-v1 entity)
- The `index()` method uses `->withCount('scenes')` so it's always present.
- Fallback to `0` if missing.

### 4. Daemon project has no `lastTaskStatus`
- Default to `'done'` (completed with unknown status). Show "Hoàn thành" badge.
- Or show no status badge if field is completely absent.

### 5. User navigates directly to `/projects?type=invalid`
- Invalid type param should default to 'all'. The `type` filter only matches valid `UnifiedProjectType` values.

### 6. Storyboard completed but `output_path` is null
- `hasThumbnail` checks `!!sb.output_path`. If null, show placeholder.

### 7. Daemon project with deleted files
- `fetchRawFile()` will throw → caught silently → show placeholder icon.

### 8. `/studio/storyboard/flow/[uuid]` is accessed directly (bookmarked)
- This still works — it's in the `(builder)` layout group and has no dependency on the projects page.

### 9. Storyboard UUID vs Daemon project UUID collision
- Impossible — storyboard UUIDs are MySQL auto-increment-based (Laravel model), daemon project UUIDs are random UUIDs (crypto.randomUUID). Different namespaces.

### 10. Pagination for large lists
- Storyboard list is already paginated (20 per page). For now, fetch first 100.
- Future: could add "Load more" button or infinite scroll.
- Daemon projects typically number in tens, not hundreds.

---

## Risks & Trade-offs

| Risk | Mitigation |
|------|------------|
| **Performance**: Fetching two sources + blob URLs on list load | Merge is O(n), blob URLs lazy-loaded via `useEffect`. First paint shows titles/status. Thumbnails load async. |
| **Memory**: Blob URL leaks | `useEffect` cleanup calls `URL.revokeObjectURL()`. |
| **UX**: `/studio/storyboard` redirect might confuse users who were used to the old URL | Add a brief transition (spinner + "Đang chuyển hướng..."). The sidebar link is the primary entry point. |
| **Filter tab URL sync**: Browser back/forward with type params | Use `useSearchParams()` + `router.replace()` to keep URL in sync. |
| **i18n**: All new labels need Vietnamese + English | Add to `i18n.ts`, existing pattern is Vietnamese-first. |
| **Old project-card.tsx**: May become unused | Keep it for the detail page's related projects section. Not removing yet. |

### Trade-off: Jobs page stays separate
The `/jobs` page shows ALL running/completed tasks across projects and uses WebSocket polling. Merging it into the projects page would add complexity (live progress per project card). Decision: keep `/jobs` as a separate power-user page, but add a subtle animated status indicator on project cards when a project has active tasks.

### Trade-off: No pagination for now
Storyboard list and daemon project list are both limited (< 100 items). Adding pagination to the merged list would require cursor-based merging from two sources. Decision: defer until needed.

---

## Implementation Tasks

| # | Layer | Task | Agent | Est. | Dependencies |
|---|-------|------|-------|------|-------------|
| 1 | Web | Create `unified-project-types.ts` with interfaces + status config | @web | 15min | None |
| 2 | Web | Create `unified-projects.ts` with mapper functions + `fetchUnifiedProjects()` | @web | 20min | Task 1 |
| 3 | Web | Create `UnifiedProjectCard` component with thumbnail lazy-load, cleanup | @web | 45min | Task 1 |
| 4 | Web | Rewrite `projects/page.tsx` with filter tabs, search, URL sync, grid | @web | 60min | Tasks 1-3 |
| 5 | Web | Convert `/studio/storyboard/page.tsx` to redirect | @web | 10min | None |
| 6 | Web | Update sidebar Storyboard href → `/projects?type=storyboard` | @web | 5min | None |
| 7 | Web | Add i18n keys for filter tabs and status labels | @web | 10min | None |
| 8 | Web | TypeScript check + fix any type errors | @web | 15min | Tasks 1-7 |
| 9 | Tester | Verify end-to-end: storyboard list, daemon projects, filters, navigation | @tester | 30min | Tasks 1-8 |

### Total Estimated Effort: ~3.5 hours

### Completion Order
1. **i18n keys** (Task 7) — no deps, can go first
2. **Types** (Task 1) — foundation
3. **Merge logic** (Task 2) — depends on types
4. **Card component** (Task 3) — depends on types
5. **Page rewrite** (Task 4) — depends on card + merge
6. **Sidebar + redirect** (Tasks 5-6) — independent, can be parallel with 3-4
7. **TypeScript check** (Task 8) — final

---

## Verification Checklist

- [ ] `/projects` shows storyboards AND daemon projects in one grid
- [ ] Filter tabs: All / Storyboard / Video / Image / Audio work correctly
- [ ] `?type=storyboard` pre-selects the Storyboard tab
- [ ] Storyboard card click → `/studio/storyboard/flow/{uuid}` (builder layout)
- [ ] Daemon project card click → `/projects/{id}` (dashboard layout)
- [ ] Status badges show correctly for all source statuses
- [ ] Search filters by title
- [ ] `/studio/storyboard` redirects to `/projects?type=storyboard`
- [ ] Sidebar "Storyboard" link → `/projects?type=storyboard`
- [ ] `/studio/storyboard/flow/[uuid]` still works (builder unchanged)
- [ ] `/studio/storyboard/flow` still works (editor unchanged)
- [ ] `/projects/[id]` still works (detail page unchanged)
- [ ] `/jobs` still works (separate page unchanged)
- [ ] Empty state shows with appropriate message
- [ ] Error in one source doesn't break the other
- [ ] No memory leaks from blob URLs
- [ ] `npx tsc --noEmit` passes
