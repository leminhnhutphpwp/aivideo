# Multi-Panel Image Storyboard Mode — Design Plan

## Date
2026-06-04

## Overview
Add a third storyboard render mode "Storyboard Ảnh" (Multi-Panel Image) to the AI Video Platform. This mode lets users either (A) upload a pre-made multi-panel comic-strip image to generate a video via Wan2.7 R2V with `shot_type: "multi"`, or (C) have AI generate the multi-panel image from scene nodes first, then pipe it into R2V. Both options produce a single continuous video that follows the panel-by-panel narrative structure.

## User Stories
- **As a user**, I want to upload a pre-made multi-panel storyboard image and get a video that follows the panel flow, so I can use professionally designed storyboards.
- **As a user**, I want AI to generate a multi-panel storyboard image from my scene descriptions and then create a video from it, saving me design effort.
- **As a user**, I want to switch between Ghép cảnh, One-Shot, and Storyboard Ảnh modes without losing my canvas data.

---

## Phase 1: Option A — User Uploads Pre-Made Multi-Panel Image

### Dependencies
- Existing One-Shot (single_flow) pipeline must be stable (Phase 0 refactor complete)
- Daemon must be running with QwenCloud API key

### Technical Design

#### Data Flow (Option A)

```
Frontend ──upload multi-panel image──► Laravel (storage) ──► DB (multi_panel_image path)
Frontend ──render request─────────────► Laravel
  └─ StoryboardRenderer::renderSingleFlow()
     └─ DaemonClient::generateMedia() with:
        - model: wan2.7-r2v
        - shotType: "multi"
        - reference_image: multi_panel_image path
        - prompt: compiled_prompt
        └─ Daemon ──► QwenCloud API (wan2.7-r2v)
           - shot_type: "multi"
           - input.media: [{ type: "reference_image", url: ... }]
           └─► Video output
```

#### API Contracts

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/storyboards` | Create — accept `shot_type`, `multi_panel_image` |
| `PUT` | `/api/storyboards/{uuid}` | Update — accept `shot_type`, `multi_panel_image` |
| `GET` | `/api/storyboards/{uuid}` | Show — return `shot_type`, `multi_panel_image` |
| `POST` | `/api/storyboards/{uuid}/compile-prompt` | Compile prompt — same as One-Shot |
| `POST` | `/api/storyboards/{uuid}/render` | Render — passes `shot_type: "multi"` to daemon |

#### Daemon MediaContext Changes

Add to `MediaContext` in `apps/daemon/src/media/types.ts`:
```typescript
export type MediaContext = {
  // ... existing fields
  shotType?: string;  // "multi" for multi-panel image
};
```

#### QwenCloud Provider Changes

In `renderQwenCloudVideo()`, the Wan2.7 R2V branch (lines 215-237) currently builds a media array from `ctx.imageRefs`/`ctx.imageRef`. For multi-panel:

```typescript
// New logic for R2V with shot_type="multi"
if (isWan27 && isR2v) {
  if (ctx.shotType === 'multi') {
    // Single multi-panel image as reference_image
    const refUrl = ctx.imageRef?.dataUrl || ctx.imageRef?.abs;
    if (refUrl) {
      input.media = [{ type: 'reference_image', url: refUrl }];
      params.shot_type = 'multi';
    }
  } else {
    // Existing multi-ref logic (default)
    // ... current code unchanged
  }
}
```

#### Database Changes

New migration: `add_shot_type_to_storyboards_table.php`

```php
Schema::table('storyboards', function (Blueprint $table) {
    $table->string('shot_type')->nullable()->after('render_mode');
    $table->string('multi_panel_image')->nullable()->after('last_frame_image');
});
```

---

## Phase 2: Option C — AI Generates Multi-Panel Image from Scene Nodes

### Dependencies
- Phase 1 must be complete (daemon + backend + frontend for Option A)
- Wan2.7-image model must support `image_set_mode` parameter (verify with DashScope docs)
- `wan2.7-image` model must be registered in daemon `models.ts`

### Data Flow (Option C)

```
Frontend ──"Generate Multi-Panel Image"──► Laravel
  └─ AiPromptCompiler (extended)
     ├─ Step 1: Compile text prompt (existing)
     └─ Step 2: Generate multi-panel image via daemon
        └─ Daemon generateMedia() with:
           - model: wan2.7-image
           - prompt: "Tạo ảnh storyboard nhiều khung hình: ..."
           - image_set_mode: true (or appropriate param)
           - aspect: multi-panel compatible ratio
           └─► Returns multi-panel image bytes
     └─ Step 3: Store generated image as multi_panel_image in DB

Frontend ──render request──► Laravel (same as Option A)
  └─ Uses stored multi_panel_image + shot_type:"multi"
```

### Key: Two-Stage Render Pipeline

For Option C, the render flow changes from single-step to two-step:

1. **Image Generation Step**: Before calling R2V, generate the multi-panel image
2. **Video Generation Step**: Pipe that image as reference_image into R2V with shot_type:"multi"

The backend `renderSingleFlow()` method needs a new code path:
```php
if ($storyboard->shot_type === 'multi' && $storyboard->multi_panel_image) {
    // Option A: already has image, go straight to R2V
    $this->renderMultiPanelR2V($storyboard);
} elseif ($storyboard->shot_type === 'multi' && !$storyboard->multi_panel_image) {
    // Option C: generate image first, then R2V
    $this->generateMultiPanelImage($storyboard);
    $this->renderMultiPanelR2V($storyboard);
}
```

---

## Implementation Tasks

### Phase 1: Option A — Upload Multi-Panel Image (Core)

#### Task 1.1: Daemon — Add `shotType` to MediaContext + Route
**Files**: `apps/daemon/src/media/types.ts`, `apps/daemon/src/media/index.ts`, `apps/daemon/src/routes/media.ts`
**Changes**:
- `types.ts`: Add `shotType?: string` to `MediaContext`
- `index.ts` (`generateMedia` function): Accept `shotType` from args, pass into ctx
- `routes/media.ts`: Parse `shotType` from request body, pass to `generateMedia()`
**Effort**: 30m
**Agent**: @daemon

#### Task 1.2: Daemon — Update QwenCloud R2V for `shot_type: "multi"`
**File**: `apps/daemon/src/media/providers/qwencloud.ts`
**Changes**:
- In the Wan2.7 R2V branch (around line 215-237):
  - If `ctx.shotType === 'multi'`, use single `reference_image` type media entry (instead of multi-ref loop)
  - Add `params.shot_type = 'multi'` to the parameters object
  - Ensure `prompt_extend` remains `false` for R2V
  - Keep `prompt_extend: false` already set for R2V (line 193)
- Keep existing multi-ref logic as default (when `shotType` is not `'multi'`)
**Effort**: 45m
**Agent**: @daemon

#### Task 1.3: Backend — Migration + Model Update
**Files**:
- `backend/database/migrations/2026_06_04_000001_add_shot_type_to_storyboards_table.php` (new)
- `backend/app/Models/Storyboard.php` (edit)
**Changes**:
- Migration: add `shot_type` (nullable string) after `render_mode`, add `multi_panel_image` (nullable string) after `last_frame_image`
- Storyboard model: Add to `$fillable` array
**Effort**: 20m
**Agent**: @backend

#### Task 1.4: Backend — StoryboardController Accept New Fields
**File**: `backend/app/Http/Controllers/API/StoryboardController.php`
**Changes**:
- `store()`: Add `shot_type` to validation (`nullable|string|in:multi`), add `multi_panel_image` to validation (`nullable|string`)
- `store()`: Save `shot_type` and `multi_panel_image` to DB
- `update()`: Add same fields to validation and update logic
- `show()`: Ensure both fields are returned in response (cast/append if needed)
**Effort**: 30m
**Agent**: @backend

#### Task 1.5: Backend — StoryboardRenderer Pass `shotType` to Daemon
**File**: `backend/app/Services/StoryboardRenderer.php`
**Changes**:
- In `renderSingleFlow()`:
  - If `$storyboard->shot_type === 'multi'`, set model to `wan2.7-r2v` explicitly
  - Pass `'shotType' => 'multi'` and `'reference_image' => $storyboard->multi_panel_image` in generateMedia params
  - Use `multi_panel_image` as the sole reference image (not first_frame)
- Add `shotType` to `DaemonClient::generateMedia()` body
**Effort**: 45m
**Agent**: @backend

#### Task 1.6: Backend — DaemonClient Accept `shotType`
**File**: `backend/app/Services/DaemonClient.php`
**Changes**:
- In `generateMedia()`: pass `shotType` from params to daemon body as `shotType`
**Effort**: 10m
**Agent**: @backend

#### Task 1.7: Web — Update RenderMode Types to 3-Way
**Files**:
- `apps/web/src/app/(builder)/studio/storyboard/components/render-mode-provider.tsx`
- `apps/web/src/app/(builder)/studio/storyboard/components/render-mode-toggle.tsx`
**Changes**:
- `render-mode-provider.tsx`: Change `RenderMode` type to `'multi_scene' | 'single_flow' | 'storyboard_image'`
- `render-mode-toggle.tsx`:
  - Add third button with `ImageIcon` (or `LayoutPanelTop` lucide icon)
  - Label: "Storyboard Ảnh"
  - Update confirm dialog to handle 3 modes
  - Update styles for 3-way layout (use equal-width thirds)
**Effort**: 1h
**Agent**: @web

#### Task 1.8: Web — Create MultiPanelImagePanel Component
**File**: `apps/web/src/app/(builder)/studio/storyboard/flow/single-flow/multi-panel-image-panel.tsx` (new)
**Changes**:
- Similar structure to `CompiledPromptPanel` but with:
  - Multi-panel image upload area (drag & drop + file picker)
  - Image preview showing the uploaded multi-panel image
  - Compile prompt button + badge (same reuse of `useCompilePrompt`)
  - Shared skills section (camera/style/mood/lighting/narration) — reused from One-Shot
  - Audio/Frame reference section (same as One-Shot)
  - Credit estimation display
- **Must use** `fetchRawFile()` for image display — never raw daemon paths
**Effort**: 2h
**Agent**: @web

#### Task 1.9: Web — Integrate MultiPanelImagePanel into MultiSceneEditor
**File**: `apps/web/src/app/(builder)/studio/storyboard/flow/multi-scene/multi-scene-editor.tsx`
**Changes**:
- Import `MultiPanelImagePanel`
- In the right sidebar area, conditionally render:
  - `renderMode === 'multi_scene'` → `MultiScenePropertyPanel`
  - `renderMode === 'single_flow'` → `CompiledPromptPanel`
  - `renderMode === 'storyboard_image'` → `MultiPanelImagePanel`
- Wire up `useCompilePrompt` for storyboard_image mode (same hook)
- Wire up shared skills state for storyboard_image mode
- Wire up multi_panel_image state (upload handler)
**Effort**: 1h
**Agent**: @web

#### Task 1.10: Web — Update buildPayload for Multi-Panel Mode
**File**: `apps/web/src/app/(builder)/studio/storyboard/flow/lib/build-payload.ts`
**Changes**:
- Update `RenderMode` type import to accept `'storyboard_image'`
- No structural change needed — multi-panel image & shot_type are storyboard-level fields, not per-scene
- The base payload builder already passes render_mode; frontend save handler should include `shot_type` and `multi_panel_image`
**Effort**: 15m
**Agent**: @web

#### Task 1.11: Web — Update Save/Render Handlers
**Files**:
- `apps/web/src/app/(builder)/studio/storyboard/flow/multi-scene/handle-save.ts`
- `apps/web/src/app/(builder)/studio/storyboard/flow/multi-scene/handle-render.ts`
**Changes**:
- Save handler: When `renderMode === 'storyboard_image'`, include `shot_type: 'multi'` and `multi_panel_image` in the storyboard data payload
- Render handler: Call `laravel.renderStoryboard(uuid)` — same endpoint, backend routes to `renderSingleFlow`
**Effort**: 30m
**Agent**: @web

#### Task 1.12: Web — Update useLoadStoryboard
**File**: `apps/web/src/app/(builder)/studio/storyboard/flow/hooks/use-load-storyboard.ts`
**Changes**:
- Add `setMultiPanelImage?: (v: string) => void` to params
- In load logic: load `sb.multi_panel_image` and `sb.shot_type` from API response
- If `shot_type === 'multi'`, set render mode to `'storyboard_image'`
**Effort**: 20m
**Agent**: @web

#### Task 1.13: Web — Update Credit Estimation for 3 Modes
**File**: `apps/web/src/app/(builder)/studio/storyboard/flow/hooks/use-credit-estimation.ts`
**Changes**:
- Update `RenderMode` type to include `'storyboard_image'`
- Multi-panel image mode pricing: same as `single_flow` (single video generation, quantity=1)
- Add `case 'storyboard_image':` beside `case 'single_flow':` to reuse same pricing logic
**Effort**: 15m
**Agent**: @web

#### Task 1.14: Web — Update API Client
**File**: `apps/web/src/lib/api/client.ts`
**Changes**:
- `createStoryboard()`: Add `shot_type?: string` and `multi_panel_image?: string` to types
- `updateStoryboard()`: Same
**Effort**: 15m
**Agent**: @web

### Phase 2: Option C — AI-Generated Multi-Panel Image

#### Task 2.1: Verify Wan2.7-image Supports `image_set_mode`
**Action**: Search DashScope API docs for `wan2.7-image` model parameters
- Check if it supports `image_set_mode` or an equivalent parameter for generating multi-panel layouts
- If not available, propose alternative (e.g., use CKey GPT-4o to generate a multi-panel image via DALL-E/Flux)
**Effort**: 1h
**Agent**: @explorer + @coordinator

#### Task 2.2: Backend — Extend AiPromptCompiler for Multi-Panel Image Generation
**File**: `backend/app/Services/AiPromptCompiler.php`
**Changes**:
- After compiling text prompt (existing logic), add method `generateMultiPanelImage(Storyboard $storyboard): string`
- This method:
  - Calls daemon `generateMedia()` with model `wan2.7-image`
  - Prompt includes scene descriptions in a layout format (e.g., "Create a 4-panel comic strip...")
  - Downloads the resulting image bytes
  - Saves to storage, returns the path
  - Updates `$storyboard->multi_panel_image` with the path
**Effort**: 1.5h
**Agent**: @backend

#### Task 2.3: Backend — Add Image Generate Endpoint or Extend Compile Prompt
**File**: `backend/app/Http/Controllers/API/StoryboardController.php`
**Changes**:
- Option A: Add new endpoint `POST /api/storyboards/{uuid}/generate-multi-panel-image`
  - Calls `AiPromptCompiler::generateMultiPanelImage()`
  - Returns `{ multi_panel_image: "path/to/image" }`
- Option B: Extend existing `compilePrompt` to accept a `generate_image` flag
  - If `generate_image: true`, also generate the multi-panel image after compiling prompt
**Effort**: 1h
**Agent**: @backend

#### Task 2.4: Backend — Update RenderSingleFlow for Two-Stage Pipeline
**File**: `backend/app/Services/StoryboardRenderer.php`
**Changes**:
- In `renderSingleFlow()`:
  - If `shot_type === 'multi'`:
    - Check if `multi_panel_image` exists
    - If not → throw error with message "Generate multi-panel image first"
    - Pass `shotType: 'multi'` and `reference_image: multi_panel_image` to daemon
- Ensure the model used is `wan2.7-r2v` (not standard I2V)
**Effort**: 30m
**Agent**: @backend

#### Task 2.5: Web — Add "Generate Multi-Panel Image" Button
**File**: `apps/web/src/app/(builder)/studio/storyboard/flow/single-flow/multi-panel-image-panel.tsx`
**Changes**:
- Add a "Tạo ảnh phân cảnh" button next to upload
- On click: call new API endpoint to generate multi-panel image
- Show loading state with progress
- On success: display the generated image preview
- Must use `fetchRawFile()` for preview
**Effort**: 1h
**Agent**: @web

#### Task 2.6: Web — Add API Method for Multi-Panel Image Generation
**File**: `apps/web/src/lib/api/client.ts`
**Changes**:
- Add `generateMultiPanelImage: (uuid: string) => Promise<{ multi_panel_image: string }>`
- Maps to `POST /api/storyboards/{uuid}/generate-multi-panel-image`
**Effort**: 10m
**Agent**: @web

#### Task 2.7: Daemon — Register `wan2.7-image` Model in models.ts (if missing)
**File**: `apps/daemon/src/media/models.ts`
**Changes**:
- Check if `wan2.7-image` exists in `IMAGE_MODELS`
- If not, add it with:
  ```typescript
  { id: 'wan2.7-image', label: 'Wan 2.7 Image', provider: 'qwencloud', caps: ['t2i','i2i'], default: false }
  ```
- Run `verify-media-models.mjs` to sync
**Effort**: 15m
**Agent**: @daemon

#### Task 2.8: Backend — Sync Model to Laravel Pricing
**Files**:
- `backend/app/Services/ModelSelector.php`
- `backend/database/seeders/PricingSystemSeeder.php`
**Changes**:
- Add `wan2.7-image` to `ModelSelector::getAvailableModels()` if not present
- Add to `PricingSystemSeeder` model_mapping if needed
- Run seeder: `docker exec backend-app-1 php artisan db:seed --class=PricingSystemSeeder`
**Effort**: 20m
**Agent**: @backend

---

## Edge Cases

| Case | Handling |
|------|----------|
| No multi-panel image uploaded in Option A | Render should fail with clear error: "Hãy tải lên ảnh storyboard trước" |
| Uploaded image is not a multi-panel layout | Cannot detect server-side — user responsibility; model will auto-detect panel layout |
| Image exceeds size limit (20MB) | Client-side validation before upload; reject with message |
| Compile prompt called but no scenes | Reuse existing guard from One-Shot (needs ≥2 scenes) |
| Switching from storyboard_image to other modes | Preserve canvas data; hide multi-panel image (same pattern as One-Shot↔Multi-scene) |
| Option C: AI image generation fails | Return error with retry option; fall back to user upload |
| R2V model not available | Daemon should return StubProviderDisabledError; frontend shows "Cấu hình API key" |
| Multi-panel image + first_frame both provided | R2V with shot_type="multi" takes only the multi-panel image; ignore first_frame |
| Backend migration fails | `shot_type` and `multi_panel_image` are nullable — no constraints to break |

## Risks & Trade-offs

| Risk | Mitigation |
|------|------------|
| QwenCloud `shot_type: "multi"` may not work as documented | Add integration test: generate a known multi-panel image → verify output. Fallback: if R2V without shot_type still panel-handles correctly, skip the param |
| `wan2.7-image` with `image_set_mode` may not exist in API | If not supported, use CKey LLM to generate a panel layout description, then use standard image gen. Or skip Option C entirely. |
| Option C doubles generation cost (image + video) | User must explicitly request image generation; show credit cost estimate before proceeding |
| 3-way toggle may clutter UI | Use segmented control (pill style) with equal widths; hover tooltip explains each mode |
| Phase 0 refactor not complete (page.tsx still 1456 lines) | **BLOCKER**: Phase 0 must be done first — `page.tsx` cannot be extended with another editor mode in its current state |

## Effort Summary

| Phase | Tasks | Total Effort |
|-------|-------|-------------|
| Phase 1 (Daemon) | 1.1, 1.2 | 1h 15m |
| Phase 1 (Backend) | 1.3, 1.4, 1.5, 1.6 | 1h 45m |
| Phase 1 (Frontend) | 1.7, 1.8, 1.9, 1.10, 1.11, 1.12, 1.13, 1.14 | 5h 35m |
| **Phase 1 Total** | **14** | **~8.5h** |
| Phase 2 (Research) | 2.1 | 1h |
| Phase 2 (Daemon) | 2.7 | 15m |
| Phase 2 (Backend) | 2.2, 2.3, 2.4, 2.8 | 3h 20m |
| Phase 2 (Frontend) | 2.5, 2.6 | 1h 10m |
| **Phase 2 Total** | **8** | **~5.5h** |
| **Grand Total** | **22** | **~14h** |

## Verification

### Phase 1 Verification
1. **Daemon**: `npx tsc --noEmit` passes
2. **Backend**: Tests pass (`docker exec backend-app-1 php artisan test`)
3. **Frontend**: `npx tsc --noEmit` passes (pre-existing errors only)
4. **E2E**: User can upload multi-panel image → compile prompt → render → get video
5. **Toggle**: All 3 modes render correctly in the toggle pill
6. **Save/Load**: Storyboard with `shot_type: "multi"` loads correctly with image preserved
7. **Credit**: Pricing shows same as One-Shot for storyboard_image mode

### Phase 2 Verification
1. **API docs**: `wan2.7-image` `image_set_mode` confirmed working (or alternative found)
2. **Image gen**: "Tạo ảnh phân cảnh" generates a valid multi-panel image
3. **Pipeline**: Generate image → render → video follows panel structure
4. **Error handling**: Failed image gen shows proper error with retry option

## Dependencies
- **Phase 0 Storyboard Refactor** must be complete before Phase 1 (page.tsx can't be extended at 1456 lines)
- Phase 2 depends on Phase 1 completion (same daemon/backend pipeline)
- Phase 2.1 (API research) can run in parallel with Phase 1
