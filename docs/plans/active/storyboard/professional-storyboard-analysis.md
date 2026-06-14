# Professional Storyboard Analysis — Wavise Studio

## Date
2026-06-02

## Overview
Phân tích 3 storyboard chuyên nghiệp từ góc nhìn planner để đánh giá khoảng cách giữa sản phẩm hiện tại và tiêu chuẩn ngành. Storyboard bao gồm: (1) 15s Film với Egg Character, (2) 12-Scene Sketch Style, (3) 12-Scene Photorealistic.

---

## 1. Common Patterns Across All 3 Storyboards

### 1.1 Cấu trúc chung
| Pattern | Mô tả | Wavise hiện tại |
|---------|-------|-----------------|
| **Scene-based layout** | Mỗi scene là 1 frame riêng biệt với metadata đầy đủ | ✅ Có (React Flow canvas) |
| **Sequential timeline** | Scenes sắp xếp theo thứ tự thời gian rõ ràng | ⚠️ Canvas tự do, không có timeline view |
| **Consistent character** | Nhân vật đồng nhất xuyên suốt các scenes | ❌ Chỉ có `reference_image` per scene, không có character lock |
| **Visual style consistency** | Cùng 1 style (sketch/photorealistic) xuyên suốt | ❌ Không có global style enforcement |
| **Camera shot labeling** | Mỗi scene ghi rõ loại camera shot | ✅ Có `camera_movement` field |
| **Duration per scene** | Thời lượng cụ thể cho mỗi scene | ✅ Có `duration_seconds` field |
| **Opening/Closing frames** | Frame đầu/đ最后 có logo hoặc "END - FADE OUT" | ❌ Không support intro/outro frames |

### 1.2 Flow cấu trúc
```
[Opening/Logo] → [Scene 1] → [Scene 2] → ... → [Scene N] → [Closing/Logo]
     ↓              ↓            ↓                  ↓              ↓
  Timestamp: 0s    0-1s        1-2s              N-1 to Ns      End
```

---

## 2. Camera Shot Types Analysis

### 2.1 Shots được sử dụng trong 3 storyboards

| Camera Shot | Image 1 | Image 2 | Image 3 | Wavise Support |
|-------------|---------|---------|---------|----------------|
| Wide Shot | ✅ | ✅ | ✅ | ⚠️ Có `camera_movement` nhưng không phân loại shot type |
| Medium Shot | ✅ | ✅ | ✅ | ⚠️ Tương tự |
| Close Up | ✅ | ✅ | ✅ | ⚠️ Tương tự |
| Low Angle Shot | ✅ | ✅ | ✅ | ⚠️ Tương tự |
| Wide Establishing Shot | ❌ | ✅ | ✅ | ❌ Không có |
| Drone Orbit Shot | ❌ | ✅ | ✅ | ❌ Không có |
| Tracking Side Shot | ❌ | ✅ | ✅ | ❌ Không có |
| Dynamic Follow Shot | ❌ | ✅ | ✅ | ❌ Không có |
| Over The Shoulder Shot | ❌ | ✅ | ✅ | ❌ Không có |
| Action Shot | ❌ | ✅ | ✅ | ❌ Không có |
| Wide Aerial Shot | ❌ | ✅ | ✅ | ❌ Không có |
| Silhouette Shot | ❌ | ✅ | ✅ | ❌ Không có |
| Epic Pull Back Shot | ❌ | ✅ | ✅ | ❌ Không có |

### 2.2 Phân loại Camera Shot cho Platform

**Category 1: Basic Shots (nên có)**
- Wide Shot (WS)
- Medium Shot (MS)
- Close Up (CU)
- Low Angle Shot
- High Angle Shot

**Category 2: Movement Shots (nâng cao)**
- Dolly In/Out
- Pan Left/Right
- Tilt Up/Down
- Tracking Shot
- Crane Shot

**Category 3: Cinematic/Professional Shots (premium)**
- Drone Orbit Shot
- Over The Shoulder (OTS)
- Action Shot
- Silhouette Shot
- Epic Pull Back Shot
- Wide Aerial Shot
- Dynamic Follow Shot
- Wide Establishing Shot

### 2.3 Recommendation
```typescript
// Camera shot type hierarchy
export enum CameraShotType {
  // Basic
  WIDE_SHOT = 'wide_shot',
  MEDIUM_SHOT = 'medium_shot',
  CLOSE_UP = 'close_up',
  EXTREME_CLOSE_UP = 'extreme_close_up',
  LOW_ANGLE = 'low_angle',
  HIGH_ANGLE = 'high_angle',
  BIRDS_EYE = 'birds_eye',
  
  // Movement
  DOLLY_IN = 'dolly_in',
  DOLLY_OUT = 'dolly_out',
  PAN_LEFT = 'pan_left',
  PAN_RIGHT = 'pan_right',
  TILT_UP = 'tilt_up',
  TILT_DOWN = 'tilt_down',
  TRACKING = 'tracking',
  CRANE = 'crane',
  
  // Cinematic
  DRONE_ORBIT = 'drone_orbit',
  OVER_SHOULDER = 'over_shoulder',
  ACTION_SHOT = 'action_shot',
  SILHOUETTE = 'silhouette',
  EPIC_PULL_BACK = 'epic_pull_back',
  WIDE_AERIAL = 'wide_aerial',
  DYNAMIC_FOLLOW = 'dynamic_follow',
  WIDE_ESTABLISHING = 'wide_establishing',
}
```

---

## 3. Timestamp/Duration Patterns

### 3.1 Pattern phân tích

| Pattern | Image 1 | Image 2 | Image 3 |
|---------|---------|---------|---------|
| **Format** | `0s-15s` (total) | `00:00-00:12` | `00:00-00:12` |
| **Per-scene** | Scene number + timestamp | Scene number + timestamp range | Scene number + timestamp range |
| **Duration** | 15s total / 15 scenes = 1s/scene | 12s total / 12 scenes = 1s/scene | 12s total / 12 scenes = 1s/scene |
| **Granularity** | Second-level | Second-level | Second-level |

### 3.2 Current Wavise Implementation
```typescript
// Current: duration_seconds per scene (no timeline position)
interface StoryboardScene {
  duration_seconds: number; // 5, 10, 15, 30
  // No: start_time, end_time, timeline_position
}
```

### 3.3 Gap Analysis
- **Missing**: Timeline view showing scenes in sequence with timestamps
- **Missing**: Visual timeline bar (like video editors)
- **Missing**: Total duration auto-calculation from scenes
- **Missing**: Scene ordering with drag-and-drop on timeline

### 3.4 Recommendation
```typescript
// Enhanced timeline support
interface TimelineScene {
  id: string;
  scene_number: number;
  start_time: number;  // seconds from start
  end_time: number;    // seconds from start
  duration: number;    // end_time - start_time
  prompt: string;
  // ... other fields
}

interface StoryboardTimeline {
  total_duration: number;
  scenes: TimelineScene[];
  fps: number;  // frames per second for preview
}
```

---

## 4. Description Format Analysis

### 4.1 Format trong 3 Storyboards

| Storyboard | Language | Format | Detail Level |
|------------|----------|--------|--------------|
| Image 1 | English | "Brief description" | Medium |
| Image 2 | Vietnamese | "Mô tả tiếng Việt" | High |
| Image 3 | Vietnamese | "Mô tả tiếng Việt" | High |

### 4.2 Current Wavise Implementation
```typescript
// Current: single prompt field, no structured description
interface StoryboardScene {
  prompt: string;           // Free text
  enriched_prompt: string | null;  // AI-enriched version
  camera_movement: string | null;  // Free text
  style: string | null;     // Free text
  mood: string | null;      // Free text
  lighting: string | null;  // Free text
  narration: string | null; // Free text
}
```

### 4.3 Gap Analysis
- **Missing**: Structured scene description (not just free text)
- **Missing**: Bilingual support (Vietnamese + English)
- **Missing**: Scene-by-scene breakdown with camera, action, dialogue
- **Missing**: Visual indicators for shot type, duration, transitions

### 4.4 Recommendation
```typescript
// Structured scene description
interface SceneDescription {
  // Core
  title: string;                    // "Cảnh 1: Mở đầu"
  summary: string;                  // "Egg character walks through urban street"
  
  // Visual
  camera_shot: CameraShotType;      // "Wide Establishing Shot"
  camera_movement: string;          // "Dolly in slowly"
  visual_description: string;       // Detailed visual description
  
  // Audio
  narration: string;                // Voiceover text
  dialogue: string;                 // Character dialogue
  sound_effects: string;            // "Graffiti spray sound"
  music_cue: string;                // "Upbeat hip-hop beat"
  
  // Technical
  duration_seconds: number;
  transition_to_next: string;       // "Cut", "Fade", "Dissolve"
  
  // References
  reference_image: string;
  style_guide: string;
}
```

---

## 5. Visual Consistency Approach

### 5.1 Patterns trong Professional Storyboards

| Approach | Image 1 | Image 2 | Image 3 |
|----------|---------|---------|---------|
| **Character consistency** | Same egg character in all frames | Same man + bird in all frames | Same man + bird in all frames |
| **Style consistency** | Same urban/streetwear style | Same watercolor/painting style | Same photorealistic style |
| **Color palette** | Consistent colors across scenes | Consistent palette | Consistent palette |
| **Art direction** | Clear art direction per storyboard | Clear art direction | Clear art direction |

### 5.2 Current Wavise Implementation
```typescript
// Current: per-scene reference, no global consistency
interface Storyboard {
  style_guide: any;  // Global style guide (JSON)
  scenes: StoryboardScene[];  // Each scene has own reference_image
}

// Missing:
// - Character lock (same character across scenes)
// - Style enforcement (same style across scenes)
// - Color palette consistency
// - Art direction guidelines
```

### 5.3 Gap Analysis
- **Missing**: Character Lock feature (proposed in `docs/storyboard-flow-plan.md`)
- **Missing**: Global style enforcement across scenes
- **Missing**: Color palette consistency
- **Missing**: Art direction guidelines per storyboard
- **Missing**: Visual consistency score/metric

### 5.4 Recommendation
```typescript
// Character Lock System
interface CharacterLock {
  id: string;
  name: string;                    // "Egg Character"
  reference_images: string[];      // Multiple angles/views
  style_notes: string;             // "Streetwear, urban, graffiti"
  locked_scenes: string[];         // Scene IDs using this character
}

// Style Enforcement
interface StyleEnforcement {
  global_style: string;            // "Watercolor painting"
  color_palette: string[];         // ["#FF5A1F", "#000000", "#FFFFFF"]
  art_direction: string;           // "Epic, cinematic, fantasy"
  consistency_score: number;       // 0-100 AI-calculated score
}
```

---

## 6. Mapping to Wavise Platform Features

### 6.1 Current Features vs Professional Standards

| Feature | Wavise Current | Professional Standard | Gap |
|---------|----------------|----------------------|-----|
| **Scene management** | React Flow canvas | Timeline-based | Medium |
| **Camera shots** | Free text field | Structured shot types | High |
| **Duration** | Per-scene seconds | Timeline with timestamps | High |
| **Character consistency** | Per-scene reference | Character lock system | High |
| **Style consistency** | Per-scene style | Global style enforcement | High |
| **Description format** | Free text prompt | Structured breakdown | Medium |
| **Visual preview** | Node thumbnails | Frame-by-frame preview | High |
| **Timeline view** | ❌ Not available | Standard in storyboards | Critical |
| **Opening/Closing frames** | ❌ Not available | Standard in storyboards | High |

### 6.2 Feature Priority Matrix

**Priority 1: Critical (Must Have)**
1. Timeline View — Visual timeline showing scenes in sequence
2. Camera Shot Types — Structured dropdown with categories
3. Character Lock — Same character across scenes
4. Opening/Closing Frames — Logo/intro/outro support

**Priority 2: High (Should Have)**
5. Structured Scene Description — Breakdown into camera, action, audio
6. Duration Timeline — Start/end timestamps per scene
7. Global Style Enforcement — Same style across all scenes
8. Transition Types — Cut, fade, dissolve between scenes

**Priority 3: Medium (Nice to Have)**
9. Visual Consistency Score — AI-calculated consistency metric
10. Bilingual Support — Vietnamese + English descriptions
11. Scene Templates — Pre-built scene structures
12. Storyboard Export — PDF/image export of storyboard

---

## 7. Gap Analysis: Current vs Professional

### 7.1 Critical Gaps

| Gap | Impact | Effort to Fix | Priority |
|-----|--------|---------------|----------|
| **No timeline view** | Users can't see scene sequence visually | High (new component) | 🔴 Critical |
| **No character lock** | Character inconsistency across scenes | Medium (backend + frontend) | 🔴 Critical |
| **No structured camera shots** | Users must type manually, inconsistent | Low (dropdown update) | 🔴 Critical |
| **No opening/closing frames** | Can't add logos/intros/outros | Medium (new feature) | 🔴 Critical |

### 7.2 High-Priority Gaps

| Gap | Impact | Effort to Fix | Priority |
|-----|--------|---------------|----------|
| **No duration timeline** | Can't see timestamps per scene | Medium (new component) | 🟡 High |
| **No global style enforcement** | Style inconsistency | Medium (backend logic) | 🟡 High |
| **No structured descriptions** | Free text only, no breakdown | Low (UI update) | 🟡 High |
| **No transition types** | Can't specify transitions | Low (new field) | 🟡 High |

### 7.3 Medium-Priority Gaps

| Gap | Impact | Effort to Fix | Priority |
|-----|--------|---------------|----------|
| **No visual consistency score** | Can't measure consistency | High (AI integration) | 🟢 Medium |
| **No bilingual support** | Vietnamese only | Low (i18n) | 🟢 Medium |
| **No scene templates** | Users start from scratch | Medium (template system) | 🟢 Medium |
| **No storyboard export** | Can't share/print storyboards | High (PDF generation) | 🟢 Medium |

---

## 8. Implementation Recommendations

### 8.1 Phase 1: Camera Shot Types (1-2 days)

**Backend Changes:**
```php
// Add to StoryboardScene migration
Schema::table('storyboard_scenes', function (Blueprint $table) {
    $table->string('camera_shot_type')->nullable()->after('camera_movement');
    $table->string('transition_type')->nullable()->after('camera_shot_type');
});
```

**Frontend Changes:**
```typescript
// Update property-panel-camera.tsx
const CAMERA_SHOT_TYPES = [
  { value: 'wide_shot', label: 'Wide Shot', category: 'basic' },
  { value: 'medium_shot', label: 'Medium Shot', category: 'basic' },
  { value: 'close_up', label: 'Close Up', category: 'basic' },
  { value: 'low_angle', label: 'Low Angle', category: 'basic' },
  { value: 'high_angle', label: 'High Angle', category: 'basic' },
  { value: 'drone_orbit', label: 'Drone Orbit', category: 'cinematic' },
  { value: 'over_shoulder', label: 'Over Shoulder', category: 'cinematic' },
  { value: 'tracking', label: 'Tracking Shot', category: 'movement' },
  // ... more types
];
```

### 8.2 Phase 2: Timeline View (3-5 days)

**New Component: TimelineBar**
```typescript
// apps/web/src/app/(builder)/studio/storyboard/flow/shared/timeline-bar.tsx
interface TimelineBarProps {
  scenes: TimelineScene[];
  totalDuration: number;
  onSceneSelect: (sceneId: string) => void;
  onDurationChange: (sceneId: string, duration: number) => void;
}
```

**Timeline Features:**
- Visual bar showing scenes in sequence
- Drag to reorder scenes
- Click to select scene
- Resize to adjust duration
- Timestamp labels (00:00, 00:01, 00:02...)
- Total duration display

### 8.3 Phase 3: Character Lock (5-7 days)

**Backend:**
```php
// New table: character_locks
Schema::create('character_locks', function (Blueprint $table) {
    $table->id();
    $table->foreignId('storyboard_id')->constrained()->onDelete('cascade');
    $table->string('name');
    $table->json('reference_images');  // Array of image paths
    $table->text('style_notes')->nullable();
    $table->timestamps();
});

// Update storyboard_scenes
Schema::table('storyboard_scenes', function (Blueprint $table) {
    $table->foreignId('character_lock_id')->nullable()->after('storyboard_id');
});
```

**Frontend:**
```typescript
// Character Lock Node on canvas
interface CharacterLockNode {
  id: string;
  type: 'characterLock';
  data: {
    name: string;
    referenceImages: string[];
    styleNotes: string;
  };
}
```

### 8.4 Phase 4: Opening/Closing Frames (2-3 days)

**Backend:**
```php
// Update storyboards table
Schema::table('storyboards', function (Blueprint $table) {
    $table->string('opening_frame_type')->nullable(); // 'logo', 'text', 'image'
    $table->string('opening_frame_content')->nullable();
    $table->string('closing_frame_type')->nullable();
    $table->string('closing_frame_content')->nullable();
});
```

**Frontend:**
```typescript
// Opening/Closing frame settings in toolbar
const OpeningClosingSettings = () => (
  <div className="space-y-4">
    <h3>Mở đầu</h3>
    <select>
      <option value="none">Không có</option>
      <option value="logo">Logo</option>
      <option value="text">Text</option>
      <option value="image">Hình ảnh</option>
    </select>
    
    <h3>Kết thúc</h3>
    <select>
      <option value="none">Không có</option>
      <option value="logo">Logo</option>
      <option value="fade_out">Fade Out</option>
      <option value="text">Text</option>
    </select>
  </div>
);
```

---

## 9. Effort Estimation

| Phase | Feature | Backend | Frontend | Total |
|-------|---------|---------|----------|-------|
| 1 | Camera Shot Types | 2h | 4h | 6h |
| 2 | Timeline View | 4h | 8h | 12h |
| 3 | Character Lock | 8h | 10h | 18h |
| 4 | Opening/Closing | 3h | 5h | 8h |
| 5 | Structured Descriptions | 2h | 6h | 8h |
| 6 | Global Style Enforcement | 6h | 4h | 10h |
| **Total** | | **25h** | **37h** | **62h** |

---

## 10. Next Steps

### Immediate (This Week)
1. ✅ Create feature plan for Camera Shot Types
2. ✅ Create feature plan for Timeline View
3. ✅ Update `storyboard-types.ts` with new types
4. ✅ Create database migration for camera_shot_type

### Short-term (Next 2 Weeks)
5. Implement Camera Shot Types dropdown
6. Implement Timeline View component
7. Implement Opening/Closing frames
8. Update UI for structured descriptions

### Medium-term (Next Month)
9. Implement Character Lock system
10. Implement Global Style Enforcement
11. Add Visual Consistency Score
12. Add Bilingual Support

---

## Appendix A: Camera Shot Types Reference

### Basic Shots
- **Wide Shot (WS)**: Shows entire subject and environment
- **Medium Shot (MS)**: Shows subject from waist up
- **Close Up (CU)**: Shows subject's face or detail
- **Extreme Close Up (ECU)**: Shows very specific detail
- **Low Angle Shot**: Camera below subject, looking up
- **High Angle Shot**: Camera above subject, looking down
- **Bird's Eye View**: Directly above subject

### Movement Shots
- **Dolly In/Out**: Camera moves toward/away from subject
- **Pan Left/Right**: Camera rotates horizontally
- **Tilt Up/Down**: Camera rotates vertically
- **Tracking Shot**: Camera follows subject
- **Crane Shot**: Camera moves vertically on crane

### Cinematic Shots
- **Drone Orbit**: Camera circles subject from above
- **Over The Shoulder (OTS)**: Shows subject over another's shoulder
- **Action Shot**: Dynamic shot capturing movement
- **Silhouette Shot**: Subject appears as dark shape against light
- **Epic Pull Back**: Camera pulls back to reveal scale
- **Wide Aerial Shot**: High altitude wide shot
- **Dynamic Follow Shot**: Camera follows subject dynamically
- **Wide Establishing Shot**: Wide shot establishing location

---

## Appendix B: Storyboard Comparison Matrix

| Aspect | Image 1 (Egg) | Image 2 (Sketch) | Image 3 (Photo) | Wavise Current |
|--------|---------------|------------------|-----------------|----------------|
| **Scenes** | 15 | 12 | 12 | Dynamic |
| **Duration** | 15s | 12s | 12s | Per-scene |
| **Camera Types** | 4 | 12 | 12 | Free text |
| **Description** | English | Vietnamese | Vietnamese | Free text |
| **Style** | Urban/Hip-hop | Watercolor | Photorealistic | Per-scene |
| **Character** | Egg figure | Man + bird | Man + bird | Per-scene ref |
| **Timeline** | Sequential | Sequential | Sequential | Canvas |
| **Opening** | Logo | None | None | None |
| **Closing** | FLOW logo | END - FADE OUT | END - FADE OUT | None |
