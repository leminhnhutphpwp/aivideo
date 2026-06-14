# Storyboard Dual Mode — Refactor + Single-Flow Design Plan

## Date
2026-05-30

## Overview
Refactor kiến trúc storyboard từ 1 file 1313 dòng (`flow/page.tsx`) thành kiến trúc modular dual-mode: **multi-scene** (Ghép cảnh) và **single-flow** (One-Shot). Tách code thành 3 lớp: **shared** (dùng chung), **multi-only** (riêng cho ghép cảnh), **single-only** (riêng cho One-Shot). Sau refactor, thêm tính năng single-flow narrative mode.

────────────────────────────────────────────────────────
## PHẦN 1: KIẾN TRÚC FILE MỚI
────────────────────────────────────────────────────────

```
apps/web/src/app/(builder)/studio/storyboards/
├── layout.tsx                          # Layout chung: Provider, theme, error boundary

├── flow/
│   ├── page.tsx                        # Entry point → đọc ?mode= → render đúng mode
│   ├── [uuid]/
│   │   └── page.tsx                    # Viewer (giữ nguyên, chỉ thêm render_mode badge)
│   │
│   ├── shared/                         # === CODE DÙNG CHUNG CHO CẢ 2 MODE ===
│   │   ├── index.ts                    # Re-export tất cả
│   │   ├── constants.ts                # COLORS, ACCENT
│   │   ├── style-constants.ts          # inputC, pillBase, pillActive, pillInactive
│   │   ├── scene-node.tsx              # SceneNode component (React Flow custom node)
│   │   ├── ctx-menu.tsx                # CtxMenu component (right-click menu)
│   │   ├── collapsible-section.tsx     # Section component (collapsible panel)
│   │   ├── toolbar.tsx                 # Top toolbar (title, undo/redo, zoom, AI, template, mode toggle slot)
│   │   ├── layers-panel.tsx            # Left panel (layers list, desktop + mobile overlay)
│   │   ├── canvas-wrapper.tsx          # ReactFlow wrapper (Background, Controls, MiniMap, grid)
│   │   ├── template-modal.tsx          # Template picker modal (shared UI)
│   │   ├── ai-draft-modal.tsx          # AI Phác thảo modal (shared UI)
│   │   ├── loading-screen.tsx          # Splash loading screen
│   │   ├── bottom-bar.tsx              # Bottom bar (grid, auto-layout, playback, scene count)
│   │   ├── reference-picker-wrapper.tsx# Picker wrapper (openRefPicker + handleRefSelect)
│   │   ├── edge-label-popup.tsx        # Edge click → edit label popup
│   │   └── confirm-merge-modal.tsx     # Confirm merge template overlay
│   │
│   ├── hooks/                          # === SHARED HOOKS ===
│   │   ├── index.ts                    # Re-export
│   │   ├── use-canvas-state.ts         # nodes, edges state (useNodesState, useEdgesState)
│   │   ├── use-undo-redo.ts            # Undo/redo history (historyRef, pushHistory, undo, redo)
│   │   ├── use-scene-form.ts           # sceneFormData state, initForm, updateField
│   │   ├── use-canvas-actions.ts       # addScene, deleteScene, duplicateScene, onConnect
│   │   ├── use-edge-manager.ts         # selectedEdge, editingEdgeLabel, deleteEdge, saveEdgeLabel
│   │   ├── use-credit-estimation.ts    # priceData, priceLoading, debounced pricing API
│   │   ├── use-auto-tags.ts            # Smart tags (intro/outro/transition) from edges
│   │   ├── use-playback.ts             # Cinematic playback
│   │   ├── use-ai-draft.ts             # AI draft state + handleAiDraft
│   │   ├── use-template-import.ts      # Template import logic + pendingTemplate
│   │   ├── use-reference-picker.ts     # pickerOpen, pickerTarget, handleRefSelect
│   │   ├── use-load-storyboard.ts      # Load skills + storyboard data on mount
│   │   ├── use-sync-refs.ts            # Sync actionsRef + sceneRefPreviews + callbacks
│   │   ├── use-keyboard-shortcuts.ts   # Ctrl+S, Delete key
│   │   ├── use-zoom-tracker.ts         # zoom polling interval
│   │   └── use-tier-config.ts          # plan tier config + tooltip
│   │
│   ├── lib/                            # === SHARED UTILITIES ===
│   │   ├── index.ts
│   │   ├── build-payload.ts            # buildPayload() → map nodes/edges/sceneFormData → API shape
│   │   ├── load-skills.ts             # Load skills from daemon
│   │   └── topological-sort.ts         # Topological sort for playback
│   │
│   ├── multi-scene/                    # === MODE: GHÉP CẢNH ===
│   │   ├── index.ts
│   │   ├── multi-scene-editor.tsx       # Component chính cho multi-scene — lắp ghép shared parts
│   │   ├── property-panel.tsx           # Right panel: Basic, Camera & Style, Audio, Reference, Edge Label
│   │   ├── property-panel-basic.tsx     # Section: prompt, duration, aspect ratio, resolution
│   │   ├── property-panel-camera.tsx    # Section: camera, style, mood, lighting, negative prompt
│   │   ├── property-panel-audio.tsx     # Section: voice selector, mood, narration
│   │   ├── property-panel-reference.tsx # Section: reference image + last frame
│   │   ├── property-panel-edge-label.tsx# Edge label input (only shown when hasIncomingEdge)
│   │   ├── handle-save.ts              # handleSaveMulti: validate → build → create/update
│   │   └── handle-render.ts            # handleRenderMulti: start analysis + render
│   │
│   └── single-flow/                    # === MODE: LIỀN MẠCH ===
│       ├── index.ts
│       ├── single-flow-editor.tsx      # Component chính cho single-flow
│       ├── compiled-prompt-panel.tsx   # Right panel: prompt narrative textarea + actions
│       ├── prompt-status-badge.tsx     # Badge: idle / compiling / compiled / stale / error
│       ├── use-compile-prompt.ts       # Hook: compilePrompt(), stale detection
│       ├── use-single-credit.ts        # Hook: credit estimate cho single-flow + so sánh
│       ├── handle-save.ts             # handleSaveSingle: include render_mode
│       └── handle-render.ts           # handleRenderSingle: gửi render_mode single_flow
│
├── components/                         # Shared UI components (cross-storyboard)
│   ├── render-mode-toggle.tsx          # Pill switch: [● Ghép cảnh  ○ One-Shot]
│   └── render-mode-provider.tsx        # Context: renderMode state + setter

└── (storyboard list page giữ nguyên)
    └── page.tsx                        # /studio/storyboard → list

apps/web/src/lib/api/
├── storyboard-types.ts                 # Thêm: render_mode type, CompiledPromptStatus enum
└── client.ts                           # Thêm: compilePrompt(), singleFlow render params

apps/web/src/components/studio/        # Không thay đổi (dùng chung)
├── options.ts, voice-selector.tsx, reference-picker.tsx,
├── rich-select.tsx, price-preview.tsx, pulsing-edge.tsx,
├── preview-box.tsx, video/*.tsx
```

────────────────────────────────────────────────────────
## PHẦN 2: PHÂN LOẠI CODE — Shared vs Multi-only vs Single-only
────────────────────────────────────────────────────────

### 2.1 Components (Internal — từ flow/page.tsx hiện tại)

| Component hiện tại | Dòng | Loại | File mới |
|---|---|---|---|
| `SceneNode` | 39-141 | **Shared** | `flow/shared/scene-node.tsx` |
| `CtxMenu` | 146-164 | **Shared** | `flow/shared/ctx-menu.tsx` |
| `Section` | 167-194 | **Shared** | `flow/shared/collapsible-section.tsx` |

### 2.2 Constants

| Constant | Dòng | Loại | File mới |
|---|---|---|---|
| `COLORS` | 36 | **Shared** | `flow/shared/constants.ts` |
| `ACCENT` | 35 | **Shared** | `flow/shared/constants.ts` |
| `genId` | 34 | **Shared** | `flow/hooks/use-canvas-actions.ts` |
| `inputC` | 197 | **Shared** | `flow/shared/style-constants.ts` |
| `pillBase/Active/Inactive` | 198-200 | **Shared** | `flow/shared/style-constants.ts` |
| `nodeTypes` | 143 | **Shared** | `flow/shared/scene-node.tsx` |

### 2.3 State Variables (FlowEditorPage)

| State | Mục đích | Loại | File mới |
|---|---|---|---|
| `router`, `searchParams`, `editUuid` | URL routing | **Shared** | `flow/page.tsx` (entry point) |
| `showLoading`, `loadProgress` | Loading screen | **Shared** | `flow/shared/loading-screen.tsx` |
| `title` | Storyboard title | **Shared** | Toolbar / flow/page.tsx |
| `videoType` | Video type selector | **Shared** | Toolbar / flow/page.tsx |
| `planTier`, `tierConfig`, `tier`, `tierTooltip` | Plan tier badge | **Shared** | `hooks/use-tier-config.ts` |
| `templates`, `templateOpen`, `pendingTemplate` | Template import | **Shared** | `hooks/use-template-import.ts` |
| `priceData`, `priceLoading`, `priceTimerRef` | Credit estimate | **Shared** | `hooks/use-credit-estimation.ts` |
| `voiceMood`, `voiceId` | Voice settings | **Shared** | Toolbar state |
| `saving` | Save button loading | **Shared** | Toolbar state |
| `selectedNodeId` | Node selection | **Shared** | `hooks/use-canvas-state.ts` |
| `sceneFormData` | Scene form data | **Shared** | `hooks/use-scene-form.ts` |
| `sceneRefPreviews` | Reference image previews | **Shared** | `hooks/use-sync-refs.ts` |
| `editSb` | Editing storyboard object | **Shared** | `hooks/use-load-storyboard.ts` |
| `options`, `typeOptions` | Skills from daemon | **Shared** | `hooks/use-load-storyboard.ts` |
| `showGrid` | Grid toggle | **Shared** | `flow/shared/canvas-wrapper.tsx` |
| `zoom` | Zoom level | **Shared** | `hooks/use-zoom-tracker.ts` |
| `layersExpanded`, `mobileLayersOpen` | Layers panel UI | **Shared** | `flow/shared/layers-panel.tsx` |
| `openBasic`, `openCamera`, `openAudio`, `openRef` | Property panel sections | **Multi-only** | `flow/multi-scene/property-panel.tsx` |
| `ctxMenu` | Right-click context menu | **Shared** | `flow/shared/ctx-menu.tsx` |
| `pickerOpen`, `pickerTarget` | Reference picker | **Shared** | `hooks/use-reference-picker.ts` |
| `selectedEdge`, `editingEdgeLabel` | Edge edit popup | **Shared** | `hooks/use-edge-manager.ts` |
| `nodes`, `edges` (React Flow) | Canvas state | **Shared** | `hooks/use-canvas-state.ts` |
| `rfInstance` | React Flow instance ref | **Shared** | `flow/shared/canvas-wrapper.tsx` |
| `historyRef`, `historyIdxRef`, `skipHistoryRef` | Undo/redo | **Shared** | `hooks/use-undo-redo.ts` |
| `playbackActive` | Cinematic playback | **Shared** | `hooks/use-playback.ts` |
| `aiModalOpen`, `aiConcept`, `aiLoading` | AI draft modal | **Shared** | `hooks/use-ai-draft.ts` |
| `actionsRef` | Stable callback refs | **Shared** | `hooks/use-sync-refs.ts` |

### 2.4 Functions

| Function | Dòng | Mục đích | Loại | File mới |
|---|---|---|---|---|
| `pushHistory()` | 255 | Push undo snapshot | **Shared** | `hooks/use-undo-redo.ts` |
| `undo()` | 262 | Undo | **Shared** | `hooks/use-undo-redo.ts` |
| `redo()` | 270 | Redo | **Shared** | `hooks/use-undo-redo.ts` |
| `addScene(parentKey?)` | 404 | Add scene to canvas | **Shared** | `hooks/use-canvas-actions.ts` |
| `deleteScene(nodeId)` | 415 | Delete scene (recursive) | **Shared** | `hooks/use-canvas-actions.ts` |
| `duplicateScene(nodeId)` | 422 | Duplicate scene | **Shared** | `hooks/use-canvas-actions.ts` |
| `onConnect(c)` | 428 | Handle edge connection | **Shared** | `hooks/use-canvas-actions.ts` |
| `onNodeClick(e, n)` | 435 | Select node | **Shared** | `hooks/use-canvas-actions.ts` |
| `onNodeContextMenu(ev, node)` | 436 | Show right-click menu | **Shared** | `hooks/use-canvas-actions.ts` |
| `onPaneClickWrapper(ev)` | 438 | Double-click → add scene | **Shared** | `hooks/use-canvas-actions.ts` |
| `onEdgeClick(ev, edge)` | 452 | Show edge label popup | **Shared** | `hooks/use-edge-manager.ts` |
| `deleteEdge(edgeId)` | 471 | Delete edge + update parent_key | **Shared** | `hooks/use-edge-manager.ts` |
| `saveEdgeLabel()` | 481 | Save edge label | **Shared** | `hooks/use-edge-manager.ts` |
| `updateField(key, field, value)` | 499 | Update form + node data | **Shared** | `hooks/use-scene-form.ts` |
| `openRefPicker(nodeId, field)` | 507 | Open reference picker | **Shared** | `hooks/use-reference-picker.ts` |
| `handleRefSelect(file/asset)` | 512 | Handle reference image select | **Shared** | `hooks/use-reference-picker.ts` |
| `handleAutoLayout()` | 580 | Auto-arrange nodes | **Shared** | `flow/shared/canvas-wrapper.tsx` |
| `handleFitView()` | 581 | Fit all nodes | **Shared** | `flow/shared/canvas-wrapper.tsx` |
| `handleZoomIn/Out()` | 582-583 | Zoom controls | **Shared** | `flow/shared/canvas-wrapper.tsx` |
| `handleAiDraft()` | 585 | AI draft storyboard | **Shared** | `hooks/use-ai-draft.ts` |
| `importTemplate(template)` | 627 | Import template | **Shared** | `hooks/use-template-import.ts` |
| `buildPayload()` | 688 | Build API payload | **Split** | `lib/build-payload.ts` (base) + mode-specific |
| `handleSave()` | 693 | Save storyboard | **Split** | `multi-scene/handle-save.ts` + `single-flow/handle-save.ts` |
| `initForm(key)` | 707 | Init scene form data | **Shared** | `hooks/use-scene-form.ts` |
| `handlePlayback()` | 375 | Cinematic playback | **Shared** | `hooks/use-playback.ts` |

### 2.5 Effects (useEffect)

| Effect | Dòng | Mục đích | Loại | File mới |
|---|---|---|---|---|
| Credit estimation (debounced) | 281-306 | Call pricing API | **Shared** | `hooks/use-credit-estimation.ts` |
| Load skills + storyboard | 307-347 | Init data on mount | **Shared** | `hooks/use-load-storyboard.ts` |
| Sync sceneRefPreviews → nodes | 352-355 | Update node previews | **Shared** | `hooks/use-sync-refs.ts` |
| Smart tags (intro/outro/transition) | 358-368 | Compute node tags | **Shared** | `hooks/use-auto-tags.ts` |
| Zoom tracker interval | 402 | Track zoom level | **Shared** | `hooks/use-zoom-tracker.ts` |
| Keyboard shortcuts | 489-497 | Ctrl+S, Delete | **Shared** | `hooks/use-keyboard-shortcuts.ts` |
| Sync actionsRef | 705 | Keep callbacks fresh | **Shared** | `hooks/use-sync-refs.ts` |
| Patch node callbacks on mount | 709-711 | Set onDelete etc. | **Shared** | `hooks/use-sync-refs.ts` |

### 2.6 JSX UI Sections

| UI Section | Dòng | Loại | File mới |
|---|---|---|---|
| Loading screen | 738-753 | **Shared** | `flow/shared/loading-screen.tsx` |
| Top toolbar | 758-857 | **Shared** | `flow/shared/toolbar.tsx` |
| Tier tooltip portal | 819-830 | **Shared** | `hooks/use-tier-config.ts` |
| Mobile layers overlay | 861-903 | **Shared** | `flow/shared/layers-panel.tsx` |
| Left panel (desktop layers) | 907-933 | **Shared** | `flow/shared/layers-panel.tsx` |
| Canvas + ReactFlow | 936-960 | **Shared** | `flow/shared/canvas-wrapper.tsx` |
| Floating add button | 963-964 | **Shared** | `flow/shared/canvas-wrapper.tsx` |
| Context menu portal | 967 | **Shared** | `flow/shared/ctx-menu.tsx` |
| Edge selection popup | 970-990 | **Shared** | `flow/shared/edge-label-popup.tsx` |
| Template picker modal | 993-1033 | **Shared** | `flow/shared/template-modal.tsx` |
| Right panel — header | 1051-1058 | **Multi-only** | `flow/multi-scene/property-panel.tsx` |
| Right panel — Cơ bản section | 1061-1081 | **Multi-only** | `flow/multi-scene/property-panel-basic.tsx` |
| Right panel — Camera & Style | 1084-1126 | **Multi-only** | `flow/multi-scene/property-panel-camera.tsx` |
| Right panel — Âm thanh | 1129-1143 | **Multi-only** | `flow/multi-scene/property-panel-audio.tsx` |
| Right panel — Tham chiếu | 1146-1172 | **Multi-only** | `flow/multi-scene/property-panel-reference.tsx` |
| Right panel — Edge Label | 1175-1181 | **Multi-only** | `flow/multi-scene/property-panel-edge-label.tsx` |
| Right panel — Empty state | 1185-1190 | **Multi-only** | `flow/multi-scene/property-panel.tsx` |
| Confirm merge template modal | 1194-1234 | **Shared** | `flow/shared/confirm-merge-modal.tsx` |
| Bottom bar | 1238-1253 | **Shared** | `flow/shared/bottom-bar.tsx` |
| Reference picker popup | 1256-1264 | **Shared** | `flow/shared/reference-picker-wrapper.tsx` |
| AI draft modal | 1267-1310 | **Shared** | `flow/shared/ai-draft-modal.tsx` |

### 2.7 Code MỚI cho Single-Flow

| Thành phần | Loại | File mới |
|---|---|---|
| `CompiledPromptPanel` | **Single-only** | `flow/single-flow/compiled-prompt-panel.tsx` |
| `PromptStatusBadge` | **Single-only** | `flow/single-flow/prompt-status-badge.tsx` |
| `useCompilePrompt` hook | **Single-only** | `flow/single-flow/use-compile-prompt.ts` |
| `useSingleCredit` hook | **Single-only** | `flow/single-flow/use-single-credit.ts` |
| `handleSaveSingle` | **Single-only** | `flow/single-flow/handle-save.ts` |
| `handleRenderSingle` | **Single-only** | `flow/single-flow/handle-render.ts` |
| `buildPayloadSingle` | **Single-only** | `flow/single-flow/` (inline, khác 2 field) |
| `RenderModeToggle` | **Shared UI** | `components/render-mode-toggle.tsx` |
| `RenderModeProvider` | **Shared UI** | `components/render-mode-provider.tsx` |
| `compilePrompt()` API method | **Single-only** | `lib/api/client.ts` |

────────────────────────────────────────────────────────
## PHẦN 3: URL ROUTING
────────────────────────────────────────────────────────

| URL | Mô tả | Mode |
|---|---|---|
| `/studio/storyboard` | Danh sách storyboard (list page) | — |
| `/studio/storyboards/flow` | Editor — mặc định multi-scene khi không có `?mode=` | Multi-scene |
| `/studio/storyboards/flow?mode=multi` | Editor — chế độ Ghép cảnh | Multi-scene |
| `/studio/storyboards/flow?mode=single` | Editor — chế độ One-Shot | Single-flow |
| `/studio/storyboards/flow?mode=multi&id=<uuid>` | Sửa storyboard multi-scene | Multi-scene |
| `/studio/storyboards/flow?mode=single&id=<uuid>` | Sửa storyboard single-flow | Single-flow |
| `/studio/storyboards/flow/<uuid>` | Viewer (xem kết quả + polling) | Auto-detect từ `render_mode` |

### Thiết kế routing

```typescript
// flow/page.tsx — Entry point
export default function FlowEditorPage() {
  const searchParams = useSearchParams();
  const mode = (searchParams.get('mode') as 'multi' | 'single') || 'multi';
  const editUuid = searchParams.get('id');

  return (
    <RenderModeProvider defaultMode={mode}>
      {mode === 'single' ? <SingleFlowEditor editUuid={editUuid} /> : <MultiSceneEditor editUuid={editUuid} />}
    </RenderModeProvider>
  );
}
```

- Không cần redirect phức tạp — `flow/page.tsx` chỉ là thin router
- Viewer page (`flow/[uuid]/page.tsx`) giữ nguyên, thêm `render_mode` badge
- List page (`/studio/storyboards/page.tsx`) giữ nguyên

────────────────────────────────────────────────────────
## PHẦN 4: NAMING CONVENTION
────────────────────────────────────────────────────────

| Phạm vi | Quy ước | Ví dụ |
|---|---|---|
| **Mode name (code)** | `multi-scene`, `single-flow` | Thư mục, file, enum value |
| **Mode label (UI)** | "Ghép cảnh", "One-Shot" | Tooltip, label, toast |
| **Enum value** | `render_mode: 'multi_scene' \| 'single_flow'` | DB, API, types |
| **URL param** | `?mode=multi`, `?mode=single` | Query string |
| **Component prefix** | `MultiScene*`, `SingleFlow*` | `MultiSceneEditor`, `SingleFlowEditor` |
| **Hook prefix** | `useMulti*`, `useSingle*` | `useSingleCredit`, `useCompilePrompt` |
| **Shared — no prefix** | Tên mô tả chức năng | `useCanvasActions`, `useCreditEstimation` |
| **File name** | kebab-case | `compiled-prompt-panel.tsx` |
| **CSS class** | kebab-case, prefix `storyboard-` | `storyboard-scene-node` |

### Tên file cụ thể cho single-flow
- `flow/single-flow/single-flow-editor.tsx` — Component chính
- `flow/single-flow/compiled-prompt-panel.tsx` — Panel prompt narrative
- `flow/single-flow/prompt-status-badge.tsx` — Badge trạng thái
- `flow/single-flow/use-compile-prompt.ts` — Hook compile prompt
- `flow/single-flow/use-single-credit.ts` — Hook tính credit single-flow
- `flow/single-flow/handle-save.ts` — Hàm lưu
- `flow/single-flow/handle-render.ts` — Hàm render

### Tên file cho multi-scene
- `flow/multi-scene/multi-scene-editor.tsx` — Component chính
- `flow/multi-scene/property-panel.tsx` — Panel thuộc tính
- `flow/multi-scene/property-panel-basic.tsx` — Section cơ bản
- `flow/multi-scene/property-panel-camera.tsx` — Section camera
- `flow/multi-scene/property-panel-audio.tsx` — Section âm thanh
- `flow/multi-scene/property-panel-reference.tsx` — Section tham chiếu
- `flow/multi-scene/property-panel-edge-label.tsx` — Edge label
- `flow/multi-scene/handle-save.ts` — Hàm lưu
- `flow/multi-scene/handle-render.ts` — Hàm render

────────────────────────────────────────────────────────
## PHẦN 5: KẾ HOẠCH TRIỂN KHAI
────────────────────────────────────────────────────────

### Phase 0: REFACTOR KIẾN TRÚC (bắt buộc trước khi thêm single-flow)

> **Lý do**: File 1313 dòng hiện tại không thể extend thêm single-flow mà không gây hỗn loạn if/else.
> Phải refactor trước rồi mới thêm tính năng.

#### Step 0.1 — Tách types & constants (15 phút)
| # | Task | Est. |
|---|---|---|
| R1 | Thêm `render_mode` type vào `storyboard-types.ts` | 5m |
| R2 | Tạo `flow/shared/constants.ts`: COLORS, ACCENT | 5m |
| R3 | Tạo `flow/shared/style-constants.ts`: inputC, pillBase, pillActive, pillInactive | 5m |

#### Step 0.2 — Tách components (45 phút)
| # | Task | Est. |
|---|---|---|
| R4 | Tách `SceneNode` → `flow/shared/scene-node.tsx` | 10m |
| R5 | Tách `CtxMenu` → `flow/shared/ctx-menu.tsx` | 5m |
| R6 | Tách `Section` → `flow/shared/collapsible-section.tsx` | 5m |
| R7 | Tách `LoadingScreen` → `flow/shared/loading-screen.tsx` | 5m |
| R8 | Tách `AiDraftModal` → `flow/shared/ai-draft-modal.tsx` | 10m |
| R9 | Tách `TemplateModal` → `flow/shared/template-modal.tsx` | 5m |
| R10 | Tách `ConfirmMergeModal` → `flow/shared/confirm-merge-modal.tsx` | 5m |

#### Step 0.3 — Tách hooks (1 giờ)
| # | Task | Est. |
|---|---|---|
| R11 | Tách `useCanvasState`: nodes, edges, selectedNodeId | 10m |
| R12 | Tách `useUndoRedo`: historyRef, pushHistory, undo, redo | 10m |
| R13 | Tách `useSceneForm`: sceneFormData, initForm, updateField | 10m |
| R14 | Tách `useCanvasActions`: addScene, deleteScene, duplicateScene, onConnect, onNodeClick, onNodeContextMenu, onPaneClickWrapper | 15m |
| R15 | Tách `useEdgeManager`: selectedEdge, editingEdgeLabel, onEdgeClick, deleteEdge, saveEdgeLabel | 10m |
| R16 | Tách `useCreditEstimation`: priceData, priceLoading, debounced pricing | 10m |
| R17 | Tách `useAutoTags`: smart tags effect | 5m |
| R18 | Tách `usePlayback`: cinematic playback | 5m |
| R19 | Tách `useAiDraft`: aiModalOpen, aiConcept, aiLoading, handleAiDraft | 10m |
| R20 | Tách `useTemplateImport`: importTemplate, templateOpen, pendingTemplate | 10m |
| R21 | Tách `useReferencePicker`: pickerOpen, pickerTarget, handleRefSelect, openRefPicker | 10m |
| R22 | Tách `useLoadStoryboard`: load skills + storyboard data | 10m |
| R23 | Tách `useSyncRefs`: actionsRef, sceneRefPreviews, callbacks | 10m |
| R24 | Tách `useKeyboardShortcuts`: keyboard handler | 5m |
| R25 | Tách `useZoomTracker`: zoom polling | 5m |
| R26 | Tách `useTierConfig`: plan tier + tooltip | 5m |

#### Step 0.4 — Tách lib utilities (15 phút)
| # | Task | Est. |
|---|---|---|
| R27 | Tách `buildPayload()` → `flow/lib/build-payload.ts` | 10m |
| R28 | Tách `topologicalSort()` → `flow/lib/topological-sort.ts` | 5m |

#### Step 0.5 — Tách UI layout từ JSX (45 phút)
| # | Task | Est. |
|---|---|---|
| R29 | Tách `Toolbar` → `flow/shared/toolbar.tsx` (nhận slot children cho mode-specific buttons) | 15m |
| R30 | Tách `LayersPanel` → `flow/shared/layers-panel.tsx` (desktop + mobile) | 10m |
| R31 | Tách `CanvasWrapper` → `flow/shared/canvas-wrapper.tsx` (ReactFlow provider + controls) | 10m |
| R32 | Tách `BottomBar` → `flow/shared/bottom-bar.tsx` | 5m |
| R33 | Tách `EdgeLabelPopup` → `flow/shared/edge-label-popup.tsx` | 5m |

#### Step 0.6 — Tách multi-scene specifics (45 phút)
| # | Task | Est. |
|---|---|---|
| R34 | Tách `PropertyPanel` → `flow/multi-scene/property-panel.tsx` | 10m |
| R35 | Tách 4 sections (basic, camera, audio, reference) → các file con | 15m |
| R36 | Tách `handleSave` cho multi-scene | 10m |
| R37 | Tạo `MultiSceneEditor` component — lắp ghép tất cả shared parts + property panel | 10m |

#### Step 0.7 — Tạo entry point & verify (30 phút)
| # | Task | Est. |
|---|---|---|
| R38 | Viết lại `flow/page.tsx` → thin router (đọc mode, render editor) | 10m |
| R39 | Tạo `RenderModeProvider` + `RenderModeToggle` | 10m |
| R40 | Verify: multi-scene hoạt động y hệt như cũ, không regression | 10m |

#### Step 0.8 — Cập nhật viewer page (15 phút)
| # | Task | Est. |
|---|---|---|
| R41 | Thêm `render_mode` badge vào `flow/[uuid]/page.tsx` | 10m |
| R42 | Cập nhật `storyboard-types.ts` cho viewer | 5m |

**Tổng Phase 0: ~4.5 giờ**

---

### Phase 1: Backend Foundation (giữ nguyên từ plan cũ)

| # | Task | Est. |
|---|---|---|
| B1 | Migration: `render_mode` + `compiled_prompt` vào `storyboards` | 15m |
| B2 | Cập nhật Storyboard model fillable/casts | 10m |
| B3 | StoryboardController store/update thêm validation `render_mode` | 15m |

### Phase 2: AI Compile Pipeline (giữ nguyên)

| # | Task | Est. |
|---|---|---|
| B4 | `POST /api/storyboards/{uuid}/compile-prompt` | 45m |
| B5 | Service `AiPromptCompiler` | 45m |
| B6 | Daemon: endpoint LLM rewrite | 30m |

### Phase 3: Render Single-Flow (giữ nguyên)

| # | Task | Est. |
|---|---|---|
| B7 | `renderSingleFlow()` trong StoryboardRenderer | 45m |
| B8 | Cập nhật `render()` branch theo `render_mode` | 15m |
| B9 | `checkStoryboardCompletion()` skip FFmpeg cho single-flow | 15m |
| B10 | Cập nhật credit calculation cho single-flow | 15m |

### Phase 4: Frontend Single-Flow (sau refactor)

| # | Task | Est. |
|---|---|---|
| F1 | `SingleFlowEditor` component chính — lắp ghép shared parts | 20m |
| F2 | `CompiledPromptPanel` component | 45m |
| F3 | `PromptStatusBadge` component | 15m |
| F4 | `useCompilePrompt` hook + stale detection | 30m |
| F5 | `useSingleCredit` hook | 15m |
| F6 | `handleSave` + `handleRender` cho single-flow | 20m |
| F7 | Cập nhật `buildPayload` cho single-flow | 10m |
| F8 | Template import hỗ trợ single-flow | 15m |
| F9 | `compilePrompt()` API method trong client.ts | 10m |

### Phase 5: Testing

| # | Task | Est. |
|---|---|---|
| T1 | Regression test: multi-scene hoạt động y hệt | 15m |
| T2 | E2E: create single-flow → compile prompt → edit → render → callback → download | 30m |
| T3 | Verify stale detection: sửa scene → badge "Cần viết lại" | 10m |
| T4 | Verify backward compat: storyboard cũ load đúng | 10m |

---

### Tổng effort

| Phase | Nội dung | Effort |
|---|---|---|
| **Phase 0** | Refactor kiến trúc (tách file) | **4.5 giờ** |
| Phase 1 | Backend foundation | 40 phút |
| Phase 2 | AI compile pipeline | 2 giờ |
| Phase 3 | Render single-flow | 1.5 giờ |
| Phase 4 | Frontend single-flow | 3 giờ |
| Phase 5 | Testing | 1 giờ |
| **Tổng** | | **~12.5 giờ** |

⚠️ **Phase 0 là bắt buộc** — không thể thêm single-flow nếu không refactor trước.

────────────────────────────────────────────────────────
## PHẦN 6: EDGE CASES & RỦI RO
────────────────────────────────────────────────────────

### 6.1 Regression risk (refactor)
- **Risk**: Refactor làm gãy multi-scene hiện tại
- **Mitigation**: Refactor từng bước nhỏ, mỗi bước verify tsc + test UI. Giữ file cũ cho đến khi component mới thay thế hoàn toàn.

### 6.2 Shared state boundary
- **Risk**: Hook nào nên ở shared, hook nào nên ở mode-specific?
- **Mitigation**: Shared là những gì dùng chung canvas + scene data. Mode-specific là UI panel + build/save/render logic.

### 6.3 Mode switch giữa chừng
- **Risk**: User đang multi-scene → switch sang single → mất compiled_prompt? Giữ scene data?
- **Mitigation**: 
  - Canvas data (nodes, edges, sceneFormData) luôn giữ khi switch mode
  - compiled_prompt chỉ tồn tại trong single-flow mode
  - Switch multi → single: giữ canvas, clear compiled_prompt (vì flow data có thể đã đổi)
  - Switch single → multi: giữ canvas, ẩn prompt panel

### 6.4 Import từ template
- **Risk**: Template có scenes mà không có edge — single-flow cần flow nối tiếp
- **Mitigation**: Template import luôn auto-connect scenes theo sequence (đã có sẵn)

### 6.5 Chỉ 1 scene
- **Risk**: Single-flow với 1 scene thì compile prompt không cần AI?
- **Mitigation**: Vẫn gọi AI để viết lại prompt gốc thành narrative mượt hơn. Nếu < 2 scenes, fallback sang template-based compile.

────────────────────────────────────────────────────────
## PHẦN 7: VERIFICATION CHECKLIST
────────────────────────────────────────────────────────

- [ ] `tsc --noEmit` trong apps/web — 0 lỗi mới
- [ ] Multi-scene editor: thêm/xóa/nối scene, edit property, undo/redo, save, render — hoạt động như cũ
- [ ] Single-flow editor: chọn mode → canvas hoạt động → compile prompt → hiển thị → edit → render
- [ ] Mode toggle: switch không mất canvas data
- [ ] Stale detection: sửa scene → badge "Cần viết lại"
- [ ] Credit estimation: đúng cho cả 2 mode
- [ ] Template import: hoạt động cả 2 mode
- [ ] AI draft: hoạt động cả 2 mode
- [ ] Viewer page: hiển thị render_mode badge
- [ ] Backward compat: storyboard cũ (multi-scene) render bình thường
- [ ] Mobile responsive: layers overlay, panel responsive
