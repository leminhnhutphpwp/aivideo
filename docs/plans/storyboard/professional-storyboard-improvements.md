# Professional Storyboard Improvements — Kế Hoạch Nâng Cấp

## Ngày
2026-06-02

## Trạng thái
📋 **Plan Complete** — Ready for implementation

## Referenced Documents
- `docs/plans/storyboard-professional-analysis.md` — Phân tích chi tiết 3 storyboard chuyên nghiệp
- `docs/plans/storyboard/professional-storyboard-analysis.md` — Gap analysis current vs professional
- `docs/plans/storyboard/phase0-refactor-detail.md` — Refactor plan đangInProgress
- `docs/plans/storyboard/single-flow-narrative.md` — Architecture dual mode
- `task-status.md` — Current project status

---

## 1. Executive Summary (Tóm Tắt Điều Hành)

### 1.1 Key Insight — Chúng Ta Đã Có Gì?

> **🔴 Bài Học Quan Trọng Nhất: One-Shot ĐÃ LÀ Timeline!**

Phân tích code thực tế cho thấy:
- **One-Shot mode** đã có topological sort (scene ordering) — đây CHÍNH LÀ timeline logic
- **Multi-Scene mode** đã có per-scene duration — chỉ thiếu timestamp display
- **KHÔNG CẦN** rebuild toàn bộ hệ thống — chỉ cần thêm timestamp display và minor adjustments

### 1.2 Trạng Thái Hiện Tại — Code Reality

| Aspect | One-Shot Mode | Multi-Scene Mode | Professional Standard |
|--------|---------------|------------------|----------------------|
| **Scene Ordering** | ✅ Topological sort (topological-sort.ts) | ✅ Topological sort | Linear timeline |
| **Duration** | ✅ Single `totalDuration` field | ✅ Sum of all `duration_seconds` | Per-scene start/end |
| **Per-Scene Duration** | ❌ Không dùng (chỉ dùng totalDuration) | ✅ `duration_seconds` per scene | ✅ Each scene has duration |
| **Timeline View** | ❌ Chỉ có React Flow canvas | ❌ Chỉ có React Flow canvas | ✅ Horizontal bar |
| **Timestamp Display** | ❌ Không hiển thị | ❌ Không hiển thị | ✅ "00:00-00:05" |
| **Camera/Style/Mood/Lighting** | ✅ Shared skills (storyboard-level) | ✅ Per-scene skills | ✅ Per-scene |
| **Driving Audio** | ✅ Storyboard-level | ✅ Per-scene | ✅ Per-scene |
| **First/Last Frame** | ✅ Storyboard-level | ✅ Per-scene | ✅ Per-scene |

### 1.3 Khoảng Cách Thực Tế (Not Over-Engineered)

| Gap | Severity | Current State | What's Missing | Effort |
|-----|----------|---------------|----------------|--------|
| **Timestamp Display** | 🟡 Medium | Duration exists, no timestamps | Show "00:00-00:05" per scene | **2-3h** |
| **Per-Scene Duration in One-Shot** | 🟢 Low | Only `totalDuration` used | Add per-scene duration control | **3-4h** |
| **Timeline Bar (Optional)** | 🟢 Nice-to-have | Canvas only | Horizontal timeline view | **8-10h** |
| **Character Lock** | 🟡 Medium | Per-scene reference images | Storyboard-level character persist | **10-12h** |
| **Opening/Closing Frames** | 🟢 Nice-to-have | Not supported | Logo/intro/outro frames | **6-8h** |

---

## 2. Phân Tích Code Chi Tiết (Code-Level Analysis)

### 2.1 One-Shot Mode — Đã Có

**File: `multi-scene-editor.tsx`**
```typescript
// Duration: Single totalDuration field (line 77)
const [totalDuration, setTotalDuration] = useState(10);

// Scene ordering: Topological sort (line 236-237)
const calcTotalDuration = nodes.reduce((s, n) => s + ((n.data as any)?.duration || 5), 0);
const effectiveTotalDuration = renderMode === 'single_flow' ? totalDuration : calcTotalDuration;

// Shared skills: Camera, style, mood, lighting, narration (lines 78-82)
const [sharedCamera, setSharedCamera] = useState('');
const [sharedStyle, setSharedStyle] = useState('');
const [sharedMood, setSharedMood] = useState('');
const [sharedLighting, setSharedLighting] = useState('');
const [sharedNarration, setSharedNarration] = useState('');
```

**File: `compiled-prompt-panel.tsx`**
```typescript
// Shows totalDuration at bottom (line 348)
<div className="flex items-center gap-1.5 text-[10px] text-slate-500">
  <Clock className="h-3 w-3" />
  <span>{totalDuration}s</span>
</div>
```

**File: `property-panel-basic.tsx`**
```typescript
// Per-scene duration ONLY shows in multi_scene mode (line 35)
{renderMode === 'multi_scene' && (<>
  <div className="space-y-1.5">
    <label className="text-[10px] font-semibold text-slate-500 block">Thời lượng cảnh</label>
    {/* Duration pills */}
  </div>
</>)}
```

### 2.2 Multi-Scene Mode — Đã Có

**File: `storyboard-types.ts`**
```typescript
// Per-scene duration_seconds field (line 7)
duration_seconds: number;

// All per-scene fields available
camera_movement: string | null;
lighting: string | null;
style: string | null;
mood: string | null;
reference_image: string | null;
last_frame_image: string | null;
narration: string | null;
```

### 2.3 Topological Sort — Đã Có

**File: `topological-sort.ts`**
```typescript
// Full implementation exists (21 lines)
export function topologicalSort(nodes: Node[], edges: Edge[]): string[] {
  // BFS-based topological sort
  // Handles edge connections between scenes
  // Returns ordered array of scene IDs
}
```

---

## 3. Kế Hoạch Cải Thiện — Minimal Changes Only

### Phase 1: Quick Wins (Tuần 1 — 5-7h)

**Mục tiêu:** Các cải thiện nhanh, giá trị cao, effort thấp.

| # | Tính năng | Effort | Chi tiết | Agent |
|---|-----------|--------|----------|-------|
| 1.1 | **Timestamp Display** | 2-3h | Hiển thị calculated timestamps per scene (00:00 → 00:05) | @web |
| 1.2 | **Per-Scene Duration in One-Shot** | 3-4h | Cho phép user set duration per scene trong One-Shot mode | @web |

**Tổng Phase 1: 5-7h (1 ngày)**

#### Chi Tiết 1.1: Timestamp Display

**Problem:** Hiện tại chỉ hiển thị `{totalDuration}s` ở bottom bar, không có per-scene timestamps.

**Solution:** Tính toán và hiển thị timestamps dựa trên scene ordering (topological sort).

**Frontend Changes:**
```typescript
// New utility: apps/web/src/lib/utils/timestamp.ts
export function calculateTimestamps(scenes: { id: string; duration_seconds: number }[]):
  { id: string; start: number; end: number; label: string }[] {

  let currentTime = 0;
  return scenes.map(scene => {
    const start = currentTime;
    const end = currentTime + scene.duration_seconds;
    currentTime = end;
    return {
      id: scene.id,
      start,
      end,
      label: `${formatTime(start)}-${formatTime(end)}`,
    };
  });
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
```

**Component Changes:**
```typescript
// Update: scene-node.tsx — Add timestamp display
// Location: flow/shared/scene-node.tsx

interface SceneNodeProps {
  data: any;
  selected: boolean;
  timestamp?: { start: number; end: number; label: string };
}

// In render:
{timestamp && (
  <span className="text-[9px] text-slate-500 font-mono">
    {timestamp.label}
  </span>
)}
```

**Backend Changes:** Không cần — timestamps derived từ duration.

**Database Changes:** Không cần.

#### Chi Tiết 1.2: Per-Scene Duration in One-Shot

**Problem:** Hiện tại One-Shot mode chỉ dùng `totalDuration` single field, không cho user set duration per scene.

**Solution:** Thêm duration control per scene trong One-Shot mode (giống Multi-Scene).

**Frontend Changes:**
```typescript
// Update: property-panel-basic.tsx
// Location: flow/multi-scene/property-panel-basic.tsx

// Remove the renderMode check for duration display (line 35)
// Before: {renderMode === 'multi_scene' && (<>
// After: Always show duration control

<div className="space-y-1.5">
  <label className="text-[10px] font-semibold text-slate-500 block">Thời lượng cảnh</label>
  <div className="flex gap-1">
    {(durations || []).map(d => (
      <button key={d} onClick={() => onUpdateField('duration_seconds', d)}
        className={cn(pillBase, durationSeconds === d ? pillActive : pillInactive)}>
        {d}s
      </button>
    ))}
  </div>
</div>
```

**Impact on totalDuration calculation:**
```typescript
// Update: multi-scene-editor.tsx
// When in single_flow mode, calculate totalDuration from sum of scene durations

const calcTotalDuration = nodes.reduce((s, n) => s + ((n.data as any)?.duration || 5), 0);
// In single_flow mode, use sum of scene durations instead of single totalDuration
const effectiveTotalDuration = renderMode === 'single_flow'
  ? calcTotalDuration  // Use sum of per-scene durations
  : calcTotalDuration; // Same for multi_scene
```

**Backend Changes:** Không cần — data model đã hỗ trợ.

**Database Changes:** Không cần.

---

### Phase 2: Medium Impact (Tuần 2 — 10-14h)

**Mục tiêu:** Các cải thiện giá trị trung bình.

| # | Tính năng | Effort | Chi tiết | Agent |
|---|-----------|--------|----------|-------|
| 2.1 | **Timeline Bar (Optional)** | 8-10h | Horizontal timeline view với drag-to-reorder | @web |
| 2.2 | **Character Lock MVP** | 10-12h | Storyboard-level character reference | @web + @backend |

**Tổng Phase 2: 18-22h (2-3 ngày)**

#### Chi Tiết 2.1: Timeline Bar (Optional)

**Problem:** Hiện tại chỉ có React Flow canvas, không có visual timeline.

**Solution:** Thêm toggle button để switch giữa Canvas và Timeline view.

**Frontend Changes:**
```typescript
// New component: apps/web/src/components/storyboard/timeline-bar.tsx
// Horizontal bar showing scenes in sequence

interface TimelineBarProps {
  scenes: { id: string; duration: number; prompt: string }[];
  totalDuration: number;
  selectedSceneId?: string;
  onSceneSelect: (id: string) => void;
  onDurationChange: (id: string, duration: number) => void;
}

// Layout:
// [Scene 1: 5s] [Scene 2: 10s] [Scene 3: 5s] [END]
// 00:00         00:05          00:15         00:20
```

**Toggle Implementation:**
```typescript
// Add toggle button in toolbar (multi-scene-editor.tsx)
const [viewMode, setViewMode] = useState<'canvas' | 'timeline'>('canvas');

// In Toolbar component
<Button onClick={() => setViewMode(viewMode === 'canvas' ? 'timeline' : 'canvas')}>
  {viewMode === 'canvas' ? <TimelineIcon /> : <CanvasIcon />}
  {viewMode === 'canvas' ? 'Timeline' : 'Canvas'}
</Button>
```

**Backend Changes:** Không cần — data model hỗ trợ linear sequences.

**Database Changes:**
```sql
-- Optional: Add sort_order for explicit ordering
ALTER TABLE storyboard_scenes ADD COLUMN sort_order INT NULL;
```

#### Chi Tiết 2.2: Character Lock MVP

**Problem:** Mỗi scene có reference image riêng, không lock xuyên suốt.

**Solution:** Storyboard-level character reference persist across scenes.

**Backend Changes:**
```php
// New Migration: Create character_locks table
Schema::create('character_locks', function (Blueprint $table) {
    $table->id();
    $table->foreignId('storyboard_id')->constrained()->onDelete('cascade');
    $table->string('name');
    $table->json('reference_images'); // Array of image paths
    $table->text('style_notes')->nullable();
    $table->timestamps();
});

// Update storyboard_scenes
Schema::table('storyboard_scenes', function (Blueprint $table) {
    $table->foreignId('character_lock_id')->nullable()->after('storyboard_id');
});
```

**New API Endpoints:**
```php
// routes/api.php
Route::apiResource('storyboards/{uuid}/characters', CharacterLockController::class);
```

**Frontend Changes:**
```typescript
// New component: apps/web/src/components/storyboard/character-lock-panel.tsx
// Character cards with thumbnails
// - Click to select
// - "Thêm nhân vật" button
// - Edit/Delete actions
// - Visual indicator trên scene node khi character locked
```

---

### Phase 3: Future Enhancements (Tương Lai)

**Mục tiêu:** Các tính năng nâng cao, polish.

| # | Tính năng | Effort | Chi tiết | Agent |
|---|-----------|--------|----------|-------|
| 3.1 | **Opening/Closing Frames** | 6-8h | Logo/intro/outro support | @web + @backend |
| 3.2 | **Transition Types** | 8-10h | Cut, Fade, Dissolve between scenes | @web + @backend |
| 3.3 | **Bilingual Support** | 12-14h | Vietnamese + English descriptions | @web + @backend |
| 3.4 | **Visual Consistency Score** | 16-20h | AI-calculated consistency metric | @web + @backend + @daemon |
| 3.5 | **Storyboard Export** | 20-24h | PDF/image export of storyboard | @web + @backend |

**Tổng Phase 3: ~62-76h (Future)**

---

## 4. Technical Specifications (Thông Số Kỹ Thuật)

### 4.1 Feature: Timestamp Display

| Layer | Changes |
|-------|---------|
| **Backend** | Không cần |
| **Frontend** | New utility `timestamp.ts`, update `scene-node.tsx` to show timestamps |
| **Database** | Không cần |
| **API** | Không cần |

### 4.2 Feature: Per-Scene Duration in One-Shot

| Layer | Changes |
|-------|---------|
| **Backend** | Không cần |
| **Frontend** | Update `property-panel-basic.tsx` to show duration in all modes, update `multi-scene-editor.tsx` totalDuration calculation |
| **Database** | Không cần |
| **API** | Không cần |

### 4.3 Feature: Timeline Bar (Optional)

| Layer | Changes |
|-------|---------|
| **Backend** | Không cần |
| **Frontend** | New component `timeline-bar.tsx`, toggle button in toolbar |
| **Database** | Optional: `sort_order` column |
| **API** | Không cần |

### 4.4 Feature: Character Lock MVP

| Layer | Changes |
|-------|---------|
| **Backend** | New table `character_locks`, new controller, new API endpoints |
| **Frontend** | New component `character-lock-panel.tsx`, character selector in scene properties |
| **Database** | New table + foreign key |
| **API** | New CRUD endpoints |

---

## 5. Effort Estimation (Ước Lượng Công Sức)

### 5.1 Chi Tiết Từng Feature

| # | Feature | Backend | Frontend | Database | Total | Dependencies |
|---|---------|---------|----------|----------|-------|--------------|
| 1.1 | Timestamp Display | 0h | 2-3h | 0h | **2-3h** | Không |
| 1.2 | Per-Scene Duration One-Shot | 0h | 3-4h | 0h | **3-4h** | Không |
| 2.1 | Timeline Bar (Optional) | 0h | 8-10h | 1h | **9-11h** | Phase 1.1 |
| 2.2 | Character Lock MVP | 6-8h | 10-12h | 3h | **19-23h** | Không |
| 3.1 | Opening/Closing Frames | 3-4h | 5-6h | 1h | **9-11h** | Không |
| 3.2 | Transition Types | 3-4h | 5-6h | 1h | **9-11h** | Phase 2.1 |
| 3.3 | Bilingual Support | 4-5h | 8-10h | 2h | **14-17h** | Không |
| 3.4 | Visual Consistency Score | 8-10h | 6-8h | 2h | **16-20h** | Phase 2.2 |
| 3.5 | Storyboard Export | 8-10h | 12-14h | 0h | **20-24h** | Phase 2.1 |

### 5.2 Tổng Theo Phase

| Phase | Features | Total Effort | Duration |
|-------|----------|--------------|----------|
| **Phase 1** | Timestamps, Per-Scene Duration | **5-7h** | 1 ngày |
| **Phase 2** | Timeline Bar, Character Lock | **28-34h** | 3-4 ngày |
| **Phase 3** | Opening/Closing, Transition, Bilingual, Consistency, Export | **~68-83h** | Future |
| **Grand Total** | | **~101-124h** | |

### 5.3 Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Timeline view breaks existing canvas users | Low | Medium | Keep both views, toggle switch |
| Character lock adds complexity | Medium | Medium | Start with storyboard-level only |
| Per-scene duration confuses One-Shot users | Low | Low | Show as optional, default to shared duration |
| Database migration fails | Low | High | Test in Docker first |
| API breaking changes | Low | High | Version endpoints, backward compat |

---

## 6. Success Metrics (Chỉ Số Thành Công)

### 6.1 User Engagement

| Metric | Current | Target | How to Measure |
|--------|---------|--------|----------------|
| Storyboard completion rate | ~60% | ~85% | Analytics: create → render ratio |
| Time to first render | ~15 min | ~8 min | Analytics: time tracking |
| Character consistency | Manual check | Auto-calculated | New consistency score feature |
| User satisfaction | Qualitative | Quantitative | NPS survey after feature launch |

### 6.2 Feature Adoption

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Timestamp display usage | >80% of users | Analytics: view mode toggle tracking |
| Per-scene duration in One-Shot | >50% of storyboards | Database: duration_seconds NOT NULL count |
| Character lock usage | >30% of storyboards | Database: character_locks table count |
| Timeline bar usage | >40% of users | Analytics: view mode toggle tracking |

### 6.3 Technical Quality

| Metric | Target | How to Measure |
|--------|--------|----------------|
| TypeScript errors | 0 new | `npx tsc --noEmit` |
| Test coverage | >80% new features | PHPUnit + Jest |
| Performance | <200ms render | Lighthouse + custom metrics |
| Accessibility | WCAG 2.1 AA | Automated + manual audit |

---

## 7. Next Steps (Bước Tiếp Theo)

### 7.1 Immediate Actions (Tuần Này)

| # | Action | Owner | Due |
|---|--------|-------|-----|
| 1 | Review plan này với team | @coordinator | 2026-06-02 |
| 2 | Prioritize Phase 1 features | @coordinator | 2026-06-03 |
| 3 | Create detailed technical specs cho Phase 1 | @web | 2026-06-04 |
| 4 | Start implementation: Timestamp Display (2-3h) | @web | 2026-06-05 |
| 5 | Start implementation: Per-Scene Duration One-Shot (3-4h) | @web | 2026-06-06 |

### 7.2 Short-term Actions (2 Tuần)

| # | Action | Owner | Due |
|---|--------|-------|-----|
| 6 | Complete Phase 1 | @web | 2026-06-07 |
| 7 | Create detailed technical specs cho Phase 2 | @web + @backend | 2026-06-09 |
| 8 | Start implementation: Timeline Bar (8-10h) | @web | 2026-06-11 |
| 9 | Start implementation: Character Lock MVP (10-12h) | @web + @backend | 2026-06-13 |
| 10 | Complete Phase 2 | @web + @backend | 2026-06-16 |

### 7.3 Medium-term Actions (1 Tháng)

| # | Action | Owner | Due |
|---|--------|-------|-----|
| 11 | Review Phase 1-2 results | @coordinator | 2026-06-23 |
| 12 | Prioritize Phase 3 features | @coordinator | 2026-06-24 |
| 13 | Start Phase 3 implementation | @web + @backend | 2026-06-25 |
| 14 | User testing + feedback collection | @tester | 2026-06-30 |

---

## 8. Document History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-02 | Initial creation | @planner |
| 2026-06-02 | Rewrite with accurate code analysis — removed over-engineering | @planner |

---

*This plan is a living document. Update as implementation progresses.*
