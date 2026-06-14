# Phase 0 Refactor — Storyboard Dual Mode (Detailed Implementation Plan)

## Date
2026-06-01

## Status: IN PROGRESS

### Current Progress Matrix

| Step | Status | Files Done | Files Remaining | Wired to page.tsx? |
|------|--------|-----------|-----------------|-------------------|
| 0.1 Constants | 70% | `shared/constants.ts`, `shared/style-constants.ts` | 0 | ❌ Inline dupes at L34-40, L201-204 |
| 0.2 Components | 40% | `shared/scene-node.tsx`, `ctx-menu.tsx`, `collapsible-section.tsx` | 4 (LoadingScreen, AiDraftModal, TemplateModal, ConfirmMerge) | ❌ Inline dupes at L43-198 |
| 0.3 Hooks (16) | 35% | 6 exist (canvas-state, undo-redo, scene-form, canvas-actions, edge-manager, auto-tags) | 10 remaining | ❌ All logic still inline |
| 0.4 Lib utils | 50% | `lib/build-payload.ts` | 1 (topological-sort.ts) | ❌ Not imported |
| 0.5 UI Layout | 0% | 0 | 5 (Toolbar, LayersPanel, CanvasWrapper, BottomBar, EdgeLabelPopup) | N/A |
| 0.6 Multi-scene | 0% | 0 | 8 (PropertyPanel + 4 sections + handleSave + handleRender + MultiSceneEditor) | N/A |
| 0.7 Entry point | 25% | `layout.tsx`, `render-mode-provider.tsx`, `render-mode-toggle.tsx` | Thin router rewrite + regression check | ❌ page.tsx still 1456 lines |
| 0.8 Viewer | 0% | 0 | 1 (`flow/[uuid]/page.tsx` — add badge) | N/A |

**Key Insight**: The new shared/hooks/lib files were created but `page.tsx` was NEVER updated to import from them. It still has ALL inline code (1456 lines). Phase 0 = create remaining modules + REMOVE inline code from page.tsx.

## Pre-Refactor Checklist

- [ ] `cd apps/web && git checkout -b feat/storyboard-dual-mode-phase0`
- [ ] `cp apps/web/src/app/(builder)/studio/storyboard/flow/page.tsx apps/web/src/app/(builder)/studio/storyboard/flow/page.tsx.bak`
- [ ] `cd apps/web && npx tsc --noEmit` — ensure clean baseline
- [ ] Read existing plan: `docs/plans/storyboard/single-flow-narrative.md` (especially Part 2 classification tables)

## Dependency Graph

```
0.1 (constants)
 └─► 0.2 (components)
      └─► 0.3 (hooks)
           └─► 0.4 (lib)
                ├─► 0.5 (UI layout)
                │    └─► 0.6 (multi-scene specifics)
                │         └─► 0.7 (thin router)
                └─► (parallel: 0.5 + 0.6 create modules, 0.7 wires everything)
0.7 ──► 0.8 (viewer — independent, can run in parallel with 0.7)
```

**Steps 0.1-0.4 refine existing modules. Steps 0.5-0.6 create new ones. Step 0.7 is the final wiring where page.tsx gets rewritten.**
Each step is independently verifiable via `npx tsc --noEmit`.

---

## Step 0.1 — Remove Inline Constants & Wire Imports (10m)

**Goal**: page.tsx imports `ACCENT`, `COLORS`, `genId`, `inputC`, `pillBase`, `pillActive`, `pillInactive` instead of defining inline.

### Files

| File | Action |
|------|--------|
| `flow/shared/constants.ts` | ✅ EXISTS — verify exports `ACCENT`, `COLORS` |
| `flow/shared/style-constants.ts` | ✅ EXISTS — verify exports `inputC`, `pillBase`, `pillActive`, `pillInactive` |
| `flow/hooks/use-canvas-state.ts` | ✅ EXISTS — `genId` lives here (module-level `idCounter`) |
| `flow/page.tsx` | ✏️ EDIT — remove inline constant defs, add imports |

### Code Changes to page.tsx

**REMOVE lines 34-40**:
```
let idCounter = 0;
const genId = () => `n_${++idCounter}_${Date.now()}`;
const ACCENT = '#FF5A1F';
const COLORS = ['#FF5A1F', '#3B82F6', ...
```

**REMOVE lines 201-204**:
```
const inputC = "w-full bg-white/[0.04] ...";
const pillBase = "...";
const pillActive = "...";
const pillInactive = "...";
```

**ADD imports** (after existing imports):
```typescript
import { ACCENT, COLORS } from './shared/constants';
import { inputC, pillBase, pillActive, pillInactive } from './shared/style-constants';
import { genId } from './hooks/use-canvas-state';
```

### Verify
- [ ] `npx tsc --noEmit` → 0 errors
- [ ] `ACCENT`, `COLORS`, `genId`, `inputC`, `pillBase` resolve via imports
- [ ] No remaining inline definition at L34-40, L201-204 in page.tsx

---

## Step 0.2 — Complete Components Extraction (35m)

**Goal**: All 7 shared components exist as separate files AND page.tsx imports them (removing inline dupes).

### Files to Create

| # | File | Source Lines in page.tsx | Props Interface |
|---|------|--------------------------|-----------------|
| C4 | `shared/loading-screen.tsx` | L860-876 | `{ isEditing: boolean; loadProgress: number }` |
| C5 | `shared/ai-draft-modal.tsx` | L1410-1453 | `{ open, concept, onConceptChange, onClose, onSubmit, submitting }` |
| C6 | `shared/template-modal.tsx` | L1133-1173 | `{ open, templates, hasExistingNodes, onSelect, onClose }` |
| C7 | `shared/confirm-merge-modal.tsx` | L1338-1377 | `{ open, templateName, templateSceneCount, existingNodeCount, onCancel, onAppend, onReplace }` |

### Already Exist — Just Need Wiring

| File | Action |
|------|--------|
| `shared/scene-node.tsx` | ✅ Exists — import in page.tsx, remove inline L43-147 |
| `shared/ctx-menu.tsx` | ✅ Exists — import in page.tsx, remove inline L150-168 |
| `shared/collapsible-section.tsx` | ✅ Exists — import in page.tsx, remove inline L171-198 |
| `shared/constants.ts` | ✅ Exists (wired in step 0.1) |

### Code Pattern for C4: `loading-screen.tsx`

```typescript
'use client';
import { motion } from 'motion/react';

interface LoadingScreenProps {
  isEditing: boolean;
  loadProgress: number;
}

export function LoadingScreen({ isEditing, loadProgress }: LoadingScreenProps) {
  return (
    <div className="h-full w-full flex items-center justify-center bg-black">
      <div className="text-center space-y-8">
        <motion.div className="mx-auto w-20 h-20 relative"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}>
          <div className="absolute inset-0 rounded-full bg-[#FF5A1F]/20 blur-xl" />
          <div className="absolute inset-3 rounded-full bg-gradient-to-br from-[#FF5A1F] to-[#FF8A5B]" />
          <motion.div className="absolute inset-0 rounded-full border-2 border-[#FF5A1F]/30"
            animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }} />
        </motion.div>
        <div>
          <p className="text-base font-semibold text-white">
            {isEditing ? 'Đang tải storyboard...' : 'Đang khởi tạo Builder'}
          </p>
          <p className="text-[11px] text-slate-600 mt-1">Chuẩn bị không gian làm việc</p>
        </div>
        <div className="w-56 h-1 bg-white/[0.04] rounded-full overflow-hidden mx-auto">
          <motion.div className="h-full bg-gradient-to-r from-[#FF5A1F]/60 to-[#FF5A1F] rounded-full"
            animate={{ width: `${loadProgress}%` }}
            transition={{ duration: 0.2 }} />
        </div>
      </div>
    </div>
  );
}
```

Usage in page.tsx (replaces L860): `<LoadingScreen isEditing={!!editSb} loadProgress={loadProgress} />`

### Code Pattern for C5: `ai-draft-modal.tsx`

Props: `open`, `concept`, `onConceptChange`, `onClose`, `onSubmit`, `submitting` (boolean). Extracts JSX from L1410-1453.

Usage: `<AiDraftModal open={aiModalOpen} concept={aiConcept} onConceptChange={setAiConcept} onClose={() => setAiModalOpen(false)} onSubmit={() => handleAiDraft(videoType, nodes)} submitting={aiLoading} />`

### Code Pattern for C6: `template-modal.tsx`

Props: `open`, `templates`, `hasExistingNodes`, `onSelect`, `onClose`. Extracts JSX from L1133-1173.

Usage: `<TemplateModal open={templateOpen} templates={templates} hasExistingNodes={nodes.length > 0} onSelect={(tpl) => { if (nodes.length > 0) { setPendingTemplate(tpl); return; } importTemplate(tpl); }} onClose={() => setTemplateOpen(false)} />`

### Code Pattern for C7: `confirm-merge-modal.tsx`

Props: `open`, `templateName`, `templateSceneCount`, `existingNodeCount`, `onCancel`, `onAppend`, `onReplace`. Extracts JSX from L1338-1377.

Usage: `<ConfirmMergeModal open={!!pendingTemplate} templateName={pendingTemplate?.name || ''} templateSceneCount={pendingTemplate?.scenes?.length || 0} existingNodeCount={nodes.length} onCancel={() => setPendingTemplate(null)} onAppend={() => { const t = pendingTemplate; setPendingTemplate(null); importTemplate(t, nodes.length); }} onReplace={() => { const t = pendingTemplate; setPendingTemplate(null); setNodes([]); setEdges([]); setSceneFormData({}); Id couter = 0; setTimeout(() => importTemplate(t, 0), 50); }} />`

### Wiring — Remove inline component code from page.tsx

```
REMOVE lines 43-198  (inlne SceneNode, nodeTypes, CtxMenu, Section)
ADD:    const nodeTypes: NodeTypes = { sceneNode: SceneNode };
REMOVE lines 860-876  (inline loading screen)
ADD:   if (showLoading) return <LoadingScreen isEditing={!!editSb} loadProgress={loadProgress} />;
REMOVE lines 1410-1453 (inline AI modal)
REMOVE lines 1133-1173 (inline template modal)
REMOVE lines 1338-1377 (inline confirm merge modal)
```

**ADD imports**:
```typescript
import { SceneNode } from './shared/scene-node';
import { CtxMenu } from './shared/ctx-menu';
import { Section } from './shared/collapsible-section';
import { LoadingScreen } from './shared/loading-screen';
import { AiDraftModal } from './shared/ai-draft-modal';
import { TemplateModal } from './shared/template-modal';
import { ConfirmMergeModal } from './shared/confirm-merge-modal';
```

### Verify
- [ ] `npx tsc --noEmit` → 0 errors
- [ ] Loading screen renders during mount
- [ ] AI Draft modal opens/closes/submits
- [ ] Template modal opens, clicking template triggers merge dialog
- [ ] Confirm Merge: Cancel / Nối tiếp / Thay thế all work
- [ ] `SceneNode` renders on canvas via `nodeTypes`
- [ ] Right-click shows `CtxMenu`
- [ ] Property panel `Section` collapses/expands

---

## Step 0.3 — Extract 10 Remaining Hooks (50m)

**Status**: 6/16 hooks already exist. 10 remaining.

### Remaining Hooks

| # | File | Source (page.tsx) | Description |
|---|------|-------------------|-------------|
| H7 | `hooks/use-credit-estimation.ts` | L295-331 | debounced pricing API call |
| H8 | `hooks/use-playback.ts` | L411-440 | cinematic playback with topological sort |
| H9 | `hooks/use-ai-draft.ts` | L586-709 | AI storyboard draft + canvas population |
| H10 | `hooks/use-template-import.ts` | L627-779 | template import with edge labels |
| H11 | `hooks/use-reference-picker.ts` | L507-654 | file upload + library asset handling |
| H12 | `hooks/use-load-storyboard.ts` | L332-387 | skills + storyboard data loading |
| H13 | `hooks/use-sync-refs.ts` | L389-394, L705, L827-834 | actionsRef + sceneRefPreviews sync |
| H14 | `hooks/use-keyboard-shortcuts.ts` | L536-545 | Ctrl+S, Delete key handler |
| H15 | `hooks/use-zoom-tracker.ts` | L402 (zoom state) | zoom polling interval |
| H16 | `hooks/use-tier-config.ts` | L216-226 + L819-830 | plan tier badge + tooltip |

### H7: `use-credit-estimation.ts`

```typescript
'use client';
import { useEffect, useRef, useState } from 'react';
import { laravel } from '@/lib/api/client';

interface Params {
  sceneCount: number;
  totalDuration: number;
  planTier: string;
  renderMode: 'multi_scene' | 'single_flow';
  durationTiers: number[];
}

export function useCreditEstimation({
  sceneCount, totalDuration, planTier, renderMode, durationTiers,
}: Params) {
  const [priceData, setPriceData] = useState<any>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (sceneCount === 0 || durationTiers.length === 0) { setPriceData(null); return; }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const clamp = (d: number) => {
        const capped = Math.min(d, durationTiers[durationTiers.length - 1]);
        return durationTiers.reduce((prev, curr) => Math.abs(curr - capped) < Math.abs(prev - capped) ? curr : prev);
      };
      const quality = planTier === 'ultra' ? 'ultra' : planTier === 'premium' ? 'premium' : 'standard';
      setPriceLoading(true);
      try {
        if (renderMode === 'single_flow') {
          const res: any = await laravel.pricingCalculate({
            video_type: 'storyboard_video', duration: `${clamp(totalDuration)}s`,
            resolution: '720p', quality, quantity: 1,
          });
          setPriceData(res);
        } else {
          const avg = sceneCount > 0 ? Math.round(totalDuration / sceneCount) : 5;
          const res: any = await laravel.pricingCalculate({
            video_type: 'storyboard_video', duration: `${clamp(avg)}s`,
            resolution: '720p', quality, quantity: sceneCount,
          });
          setPriceData(res);
        }
      } catch { setPriceData(null); }
      finally { setPriceLoading(false); }
    }, 400);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [sceneCount, totalDuration, planTier, renderMode, durationTiers]);

  return { priceData, priceLoading };
}
```

### H8: `use-playback.ts`

```typescript
'use client';
import { useState, useCallback } from 'react';
import type { Node, Edge, ReactFlowInstance } from '@xyflow/react';
import { topologicalSort } from '../lib/topological-sort';

export function usePlayback() {
  const [playbackActive, setPlaybackActive] = useState(false);

  const handlePlayback = useCallback(async (
    nodes: Node[], edges: Edge[],
    rfInstance: ReactFlowInstance | null,
    setSelectedNodeId: (id: string) => void,
  ) => {
    if (playbackActive || nodes.length === 0) return;
    setPlaybackActive(true);
    const ordered = topologicalSort(nodes, edges);
    for (const nodeId of ordered) {
      setSelectedNodeId(nodeId);
      rfInstance?.fitView({ nodes: [{ id: nodeId }], duration: 600, padding: 0.5 });
      await new Promise(r => setTimeout(r, 1200));
    }
    rfInstance?.fitView({ padding: 0.3, duration: 500 });
    setPlaybackActive(false);
  }, [playbackActive]);

  return { playbackActive, handlePlayback };
}
```

### H9: `use-ai-draft.ts`

Extracts `aiModalOpen`, `aiConcept`, `aiLoading` state + `handleAiDraft()` function. Signature:

```typescript
export function useAiDraft(params: {
  setNodes: any; setEdges: any; setSceneFormData: any;
  addToast: any; markStale?: () => void;
  renderMode?: 'multi_scene' | 'single_flow';
})
```

Returns: `{ aiModalOpen, setAiModalOpen, aiConcept, setAiConcept, aiLoading, handleAiDraft }`.

`handleAiDraft` takes `(videoType: string, currentNodes: Node[])`. Auto-connects scenes with edge labels ("Mở đầu"/"Kết thúc"/"Chuyển tiếp" for single-flow).

### H10: `use-template-import.ts`

```typescript
export function useTemplateImport(params: {
  setNodes: any; setEdges: any; setSceneFormData: any;
  addToast: any; rfInstance: React.MutableRefObject<any>;
  markStale?: () => void;
  renderMode?: 'multi_scene' | 'single_flow';
})
```

Returns: `{ templateOpen, setTemplateOpen, pendingTemplate, setPendingTemplate, importTemplate }`.

`importTemplate(template, startIndex)` — creates nodes + edges from template, auto-labels edges. Calls `markStale()` in single-flow mode. Triggers `fitView` after import.

### H11: `use-reference-picker.ts`

```typescript
export function useReferencePicker(params: {
  setNodes: any;
  setSceneRefPreviews: any;
  setSceneFormData: any;
})
```

Returns: `{ pickerOpen, setPickerOpen, pickerTarget, setPickerTarget, openRefPicker, handleRefSelect }`.

Handles 2 cases: File upload (creates preview URL → uploads to daemon → stores filename) and Library asset (downloads → uploads → stores filename).

### H12: `use-load-storyboard.ts`

One large `useEffect`. Signature:

```typescript
export function useLoadStoryboard(params: {
  editUuid: string | null;
  setNodes: any; setEdges: any; setSceneFormData: any;
  setTitle: Function; setVideoType: Function;
  setVoiceMood: Function; setVoiceId: Function;
  setEditSb: Function; setTemplates: Function;
  setTypeOptions: Function; setOptions: Function;
  setDurationTiers: Function;
  setShowLoading: Function; setLoadProgress: Function;
  setTotalDuration: Function;
  setSharedCamera: Function; setSharedStyle: Function;
  setSharedMood: Function; setSharedLighting: Function;
  setSharedNarration: Function;
  setCompiledPrompt?: Function; setCompileStatus?: Function;
})
```

Loads skills → pricing durations → templates, then if `editUuid` → loads storyboard scenes/nodes/edges.

### H13: `use-sync-refs.ts`

```typescript
export function useSyncRefs(params: {
  nodes: Node[]; edges: Edge[]; setNodes: any;
  sceneRefPreviews: Record<string, string>;
  deleteScene: Function; duplicateScene: Function; addScene: Function;
})
```

Returns `{ actionsRef }`. Contains 3 effects: sync callbacks to ref, sync previews to node data, patch onDelete/onDuplicate/onAddChild on mount.

### H14: `use-keyboard-shortcuts.ts`

```typescript
export function useKeyboardShortcuts(params: {
  selectedNodeId: string | null;
  selectedEdge: { id: string } | null;
  ctxMenu: any; saving: boolean;
  deleteScene: Function; deleteEdge: Function;
  handleSave: Function;
})
```

No return value. useEffect that listens for Delete (delete node/edge) and Ctrl+S (save).

### H15: `use-zoom-tracker.ts`

```typescript
export function useZoomTracker(rfInstance: React.MutableRefObject<ReactFlowInstance | null>) {
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const interval = setInterval(() => {
      if (rfInstance.current) setZoom(rfInstance.current.getZoom());
    }, 300);
    return () => clearInterval(interval);
  }, [rfInstance]);
  return { zoom, setZoom };
}
```

### H16: `use-tier-config.ts`

```typescript
export function useTierConfig() {
  const planTier = ((useAuthStore(s => s.user) as any)?.plan?.quality_tier_code || 'standard');
  const tierConfig = { ... }; // 4 tiers: standard, standard_hd, premium, ultra
  const tier = tierConfig[planTier] || tierConfig.standard;
  const tierRef = useRef<HTMLDivElement>(null);
  const [tierTooltip, setTierTooltip] = useState(false);
  const [tierTooltipStyle, setTierTooltipStyle] = useState<CSSProperties>({});
  return { planTier, tier, tierRef, tierTooltip, setTierTooltip, tierTooltipStyle, setTierTooltipStyle };
}
```

### After Extraction — page.tsx State

page.tsx's `FlowEditorPage` becomes a function that:
1. Calls all 16 hooks
2. Computes a few derived values (`sceneCount`, `effectiveTotalDuration`, `selectedScene`, `hasIncomingEdge`, `styledEdges`)
3. Renders the JSX layout (to be extracted in steps 0.5-0.6)

### Verify
- [ ] `npx tsc --noEmit` → 0 errors
- [ ] Credit estimation shows correct credits in toolbar
- [ ] Playback pans through scenes sequentially
- [ ] AI draft creates scenes on canvas
- [ ] Template import adds nodes + edges with labels
- [ ] Reference picker uploads + previews work
- [ ] Loading screen → skills → storyboard data loads
- [ ] Undo/redo works with keyboard shortcuts
- [ ] Zoom percentage updates in toolbar
- [ ] Tier badge shows correct plan + tooltip on hover

---

## Step 0.4 — Complete Lib Utilities (10m)

| # | File | Action |
|---|------|--------|
| L1 | `lib/build-payload.ts` | ✅ EXISTS — verify handles both modes |
| L2 | `lib/topological-sort.ts` | CREATE |

### L2: `lib/topological-sort.ts`

```typescript
import type { Node, Edge } from '@xyflow/react';

/**
 * Kahn's algorithm BFS topological sort for scene nodes.
 * Root nodes (no incoming edges) are first.
 */
export function topologicalSort(nodes: Node[], edges: Edge[]): string[] {
  const visited = new Set<string>();
  const ordered: string[] = [];
  const queue = nodes
    .filter(n => !edges.some(e => e.target === n.id))
    .map(n => n.id);

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    ordered.push(id);
    edges.filter(e => e.source === id)
      .map(e => e.target)
      .forEach(c => { if (!visited.has(c)) queue.push(c); });
  }
  nodes.forEach(n => { if (!visited.has(n.id)) ordered.push(n.id); });
  return ordered;
}
```

Then update `use-playback.ts` to import `topologicalSort` instead of inline BFS.

### Verify
- [ ] `npx tsc --noEmit` → 0 errors
- [ ] `topologicalSort` produces correct order (root → children → orphans)
- [ ] `build-payload.ts` covers both `multi_scene` and `single_flow` modes

---

## Step 0.5 — Extract UI Layout Components (40m)

**Goal**: Toolbar, LayersPanel, CanvasWrapper, BottomBar, EdgeLabelPopup become standalone components. page.tsx JSX becomes clean composition.

### Files to Create

| # | File | Source Lines | Internal Components |
|---|------|-------------|---------------------|
| U1 | `shared/toolbar.tsx` | L881-997 | Complex toolbar with ~20 props |
| U2 | `shared/layers-panel.tsx` | L1000-1073 | Desktop sidebar + mobile overlay |
| U3 | `shared/canvas-wrapper.tsx` | L1076-1105 | ReactFlow + Backgrounds + Controls + MiniMap |
| U4 | `shared/bottom-bar.tsx` | L1381-1396 | Grid toggle, auto-layout, playback, count |
| U5 | `shared/edge-label-popup.tsx` | L1111-1130 | Edge label edit + save + delete |

### U1: `toolbar.tsx` — Props Interface

```typescript
interface ToolbarProps {
  // Title & navigation
  title: string; onTitleChange: (v: string) => void;
  onBack: () => void; isEditing: boolean;

  // Canvas controls (undo, redo, zoom, fit)
  onUndo: () => void; onRedo: () => void;
  onZoomIn: () => void; onZoomOut: () => void;
  zoom: number; onFitView: () => void;

  // AI & Templates
  onAiDraftClick: () => void; aiLoading: boolean;
  templates: any[]; onTemplateClick: () => void;

  // Render mode toggle (slot)
  renderModeToggle: React.ReactNode;

  // Video type
  videoType: string; onVideoTypeChange: (v: string) => void;
  typeOptions: { value: string; label: string }[];

  // Duration (single-flow only)
  isSingleFlow: boolean; totalDuration: number;
  onTotalDurationChange: (v: number) => void;
  durationTiers: number[];

  // Tier badge
  tier: TierInfo; tierRef: React.RefObject<HTMLDivElement | null>;
  tierTooltip: boolean; onTierMouseEnter: () => void; onTierMouseLeave: () => void;
  tierTooltipStyle: React.CSSProperties;

  // Storyboard actions
  editSb: any; onAnalyze: () => void;
  onRender: () => void; canRender: boolean;

  // Credit display
  priceLoading: boolean; priceData: any; sceneCount: number;

  // Save
  saving: boolean; onSave: () => void;

  // Mobile
  onMobileLayersToggle: () => void;
}
```

The tier tooltip portal uses `createPortal` (already imported in page.tsx).

### U2: `layers-panel.tsx` — Props Interface

```typescript
interface LayersPanelProps {
  nodes: Node[];
  selectedNodeId: string | null;
  onSelectNode: (id: string) => void;
  onDeleteNode: (id: string) => void;
  onAddScene: () => void;
  layersExpanded: boolean;
  onToggleExpand: () => void;
  // Mobile overlay
  mobileOpen: boolean; onMobileClose: () => void;
  videoType: string; onVideoTypeChange: (v: string) => void;
  typeOptions: { value: string; label: string }[];
  tier: TierInfo;
}
```

Contains both: desktop `<div>` (hidden on mobile, `hidden md:flex`) and mobile overlay (`<AnimatePresence>` wrapper, `md:hidden`).

### U3: `canvas-wrapper.tsx` — Props Interface

```typescript
interface CanvasWrapperProps {
  nodes: Node[]; edges: Edge[];
  onNodesChange: any; onEdgesChange: any;
  onConnect: any; onNodeClick: any;
  onPaneClick: any; onNodeContextMenu: any;
  onEdgeClick: any;
  nodeTypes: NodeTypes;
  showGrid: boolean;
  onInit: (inst: ReactFlowInstance) => void;
  // Slots for overlays
  children?: React.ReactNode;
  // Floating add button
  onAddScene: () => void;
}
```

The `<ReactFlowProvider>` wrapper stays inside this component. The `children` slot renders the CtxMenu and EdgeLabelPopup portals.

### U4: `bottom-bar.tsx` — Props Interface

```typescript
interface BottomBarProps {
  showGrid: boolean; onToggleGrid: () => void;
  onAutoLayout: () => void;
  playbackActive: boolean; onPlayback: () => void;
  nodeCount: number;
}
```

### U5: `edge-label-popup.tsx` — Props Interface

```typescript
interface EdgeLabelPopupProps {
  edge: { id: string; label?: string; x: number; y: number } | null;
  label: string; onLabelChange: (v: string) => void;
  onSave: () => void; onDelete: (id: string) => void;
  onClose: () => void;
}
```

Uses `motion.div` with fixed positioning at edge click coordinates.

### page.tsx After Step 0.5

```tsx
return (
  <div className="h-full w-full flex flex-col bg-black">
    <Toolbar
      title={title} onTitleChange={setTitle}
      onBack={() => router.push('/studio/storyboard')}
      isEditing={!!editSb}
      onUndo={undo} onRedo={redo}
      onZoomIn={handleZoomIn} onZoomOut={handleZoomOut}
      zoom={zoom} onFitView={handleFitView}
      onAiDraftClick={() => setAiModalOpen(true)} aiLoading={aiLoading}
      templates={templates} onTemplateClick={() => setTemplateOpen(true)}
      renderModeToggle={<RenderModeToggle />}
      videoType={videoType} onVideoTypeChange={setVideoType}
      typeOptions={typeOptions}
      isSingleFlow={renderMode === 'single_flow'}
      totalDuration={totalDuration} onTotalDurationChange={setTotalDuration}
      durationTiers={durationTiers}
      tier={tier} tierRef={tierRef}
      tierTooltip={tierTooltip} onTierMouseEnter={...} onTierMouseLeave={...}
      tierTooltipStyle={tierTooltipStyle}
      editSb={editSb} onAnalyze={...} onRender={...} canRender={...}
      priceLoading={priceLoading} priceData={priceData}
      sceneCount={sceneCount}
      saving={saving} onSave={handleSave}
      onMobileLayersToggle={() => setMobileLayersOpen(true)}
    />

    <div className="flex flex-1 overflow-hidden">
      <LayersPanel {...layersProps} />
      <CanvasWrapper {...canvasProps}>
        <AnimatePresence>{ctxMenu && <CtxMenu ... />}</AnimatePresence>
        <AnimatePresence>{selectedEdge && <EdgeLabelPopup ... />}</AnimatePresence>
      </CanvasWrapper>
      {/* Right panel — kept inline until step 0.6 */}
      {/* ... property panel JSX (multi-scene) or compiled prompt (single-flow) ... */}
    </div>

    <BottomBar showGrid={showGrid} onToggleGrid={() => setShowGrid(!showGrid)}
      onAutoLayout={handleAutoLayout}
      playbackActive={playbackActive} onPlayback={() => handlePlayback(...)}
      nodeCount={nodes.length} />

    <ReferencePicker ... />
    <AiDraftModal ... /> {/* rendered inline for now */}
  </div>
);
```

### Verify
- [ ] `npx tsc --noEmit` → 0 errors
- [ ] Toolbar fully functional (all buttons + inputs + tier tooltip)
- [ ] LayersPanel: desktop sidebar + mobile overlay
- [ ] Canvas: Background dots, Controls, MiniMap render
- [ ] BottomBar: grid toggle, layout, playback button work
- [ ] EdgeLabelPopup: edit label, save, delete all work
- [ ] Responsive: toolbar scrolls horizontally on mobile

---

## Step 0.6 — Extract Multi-Scene Specifics (40m)

**Goal**: Property panel + save/render → `multi-scene/` directory. Create `MultiSceneEditor` component.

### Files to Create

| # | File | Description |
|---|------|-------------|
| M1 | `multi-scene/property-panel.tsx` | Right panel container (header + sections + mobile overlay) |
| M2 | `multi-scene/property-panel-basic.tsx` | Prompt, duration, aspect ratio, resolution (multi-scene only) |
| M3 | `multi-scene/property-panel-camera.tsx` | Camera movement, style, mood, lighting, negative prompt (multi-scene only) |
| M4 | `multi-scene/property-panel-reference.tsx` | Reference image + last frame image (shared between modes) |
| M5 | `multi-scene/property-panel-edge-label.tsx` | Edge label input (shown when hasIncomingEdge) |
| M6 | `multi-scene/handle-save.ts` | Save storyboard (create/update) |
| M7 | `multi-scene/handle-render.ts` | Trigger render |
| M8 | `multi-scene/multi-scene-editor.tsx` | Orchestrator: all shared parts + property panel |

### M1: `property-panel.tsx`

Container component. Props:

```typescript
interface MultiScenePropertyPanelProps {
  selectedScene: SceneFormData | null;
  selectedNode: Node | null;
  hasIncomingEdge: boolean;
  selectedNodeId: string | null;
  sceneRefPreviews: Record<string, string>;
  onClose: () => void;
  // Section toggles
  openBasic: boolean; onToggleBasic: () => void;
  openCamera: boolean; onToggleCamera: () => void;
  openAudio: boolean; onToggleAudio: () => void;
  openRef: boolean; onToggleRef: () => void;
  // Callbacks
  updateField: (key: string, field: string, value: any) => void;
  openRefPicker: (nodeId: string, field: 'reference_image' | 'last_frame_image') => void;
  options: { durations: number[] };
  renderMode: 'multi_scene' | 'single_flow';
}
```

### M2-M5: Section Components

Each section renders its specific form fields. Multi-scene sections use "rich" selects for camera/style/mood/lighting (imported from `@/components/studio/options`).

**M2 (`property-panel-basic.tsx`)** — Only visible when `renderMode === 'multi_scene'`:
- textarea for prompt
- duration pills row
- aspect ratio pills
- resolution select

**M3 (`property-panel-camera.tsx`)** — Only visible when `renderMode === 'multi_scene'`:
- `RichSelect` for camera_movement, style, mood, lighting
- negative prompt input

**M4 (`property-panel-reference.tsx`)** — Shared between both modes:
- Reference image upload/display
- Last frame image upload/display

**M5 (`property-panel-edge-label.tsx`)** — Edge label input, shown when `hasIncomingEdge`

### M6: `handle-save.ts`

```typescript
'use client';
import { laravel } from '@/lib/api/client';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

interface SaveParams {
  editSb: any;
  title: string;
  nodes: any[];
  buildPayload: () => any;
  addToast: (msg: string, type?: string) => void;
  router: AppRouterInstance;
}

export async function handleSaveMulti({ editSb, title, nodes, buildPayload, addToast, router }: SaveParams) {
  if (!title.trim()) { addToast('Vui lòng nhập tiêu đề', 'error'); return; }
  if (nodes.length < 2) { addToast('Cần ít nhất 2 cảnh', 'error'); return; }
  const p = buildPayload();
  if (editSb) {
    await laravel.updateStoryboard(editSb.uuid, p);
    addToast('Đã cập nhật', 'success');
    router.push('/studio/storyboard');
  } else {
    const r = await laravel.createStoryboard(p);
    addToast('Đã tạo storyboard', 'success');
    router.push(`/studio/storyboard/flow/${r.uuid}`);
  }
}
```

### M7: `handle-render.ts`

```typescript
'use client';
import { laravel } from '@/lib/api/client';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

interface RenderParams {
  editSb: any;
  addToast: (msg: string, type?: string) => void;
  router: AppRouterInstance;
}

export async function handleRenderMulti({ editSb, addToast, router }: RenderParams) {
  try {
    await laravel.renderStoryboard(editSb.uuid);
    addToast('Đã bắt đầu render', 'success');
    router.push(`/studio/storyboard/flow/${editSb.uuid}`);
  } catch (e: any) {
    addToast(e?.message || 'Lỗi', 'error');
  }
}
```

### M8: `multi-scene-editor.tsx`

This is where page.tsx's remaining logic moves. After all extractions, `MultiSceneEditor` contains:

```typescript
'use client';
export function MultiSceneEditor({ editUuid }: { editUuid: string | null }) {
  // 1. All 16 hooks
  // 2. Derived state (sceneCount, effectiveTotalDuration, selectedScene, etc.)
  // 3. View cleanup effect (beforeunload warn)
  // 4. Return JSX: Toolbar + LayersPanel + CanvasWrapper + PropertyPanel + Modals + BottomBar
}
```

### Verify
- [ ] `npx tsc --noEmit` → 0 errors
- [ ] Property panel: header shows scene number, close button works
- [ ] Basic section: prompt textarea, duration pills, aspect ratio, resolution
- [ ] Camera section: 4 RichSelects + negative prompt (multi-scene mode)
- [ ] Reference section: upload + preview for both reference_image and last_frame_image
- [ ] Edge label section: shown when scene has incoming edge
- [ ] Mobile: full overlay property panel, backdrop closes it
- [ ] handleSave creates/updates storyboard
- [ ] handleRender triggers render and redirects
- [ ] Empty state: "THUỘC TÍNH" vertical text when no scene selected

---

## Step 0.7 — Thin Router Entry Point + Verify Regression (25m)

**Goal**: `flow/page.tsx` becomes a thin router (~20 lines). `MultiSceneEditor` is the full-featured editor.

### R1: Rewrite `flow/page.tsx`

```typescript
'use client';

import { useSearchParams } from 'next/navigation';
import { MultiSceneEditor } from './multi-scene/multi-scene-editor';

export default function FlowEditorPage() {
  const searchParams = useSearchParams();
  const editUuid = searchParams.get('id');

  return <MultiSceneEditor editUuid={editUuid} />;
}
```

> **Note**: The `RenderModeProvider` is already in `layout.tsx` (wraps all storyboard pages). The `RenderModeToggle` reads from context. Later in Phase 4, `SingleFlowEditor` will be added with a mode check.

### R2: Verify Regression

Manual test — open `/studio/storyboard/flow` and verify everything works EXACTLY as before:

| Test Case | Expected |
|-----------|----------|
| Blank editor loads (no `?mode=`) | Loading screen → empty canvas with "THUỘC TÍNH" text |
| Double-click canvas | New scene appears as SceneNode |
| Right-click scene | CtxMenu shows Thêm/Nhân bản/Xóa |
| Select scene | Property panel shows on right |
| Edit prompt | Node updates with prompt text |
| Connect 2 scenes (drag handle) | Edge appears with arrow |
| Click edge | EdgeLabelPopup shows for label editing |
| Undo/Redo (Ctrl+Z) | Undoes last action |
| Save (Ctrl+S) | Prompts for title, creates storyboard |
| AI Phác thảo | Modal opens, submits concept, creates scenes |
| Template import | Modal opens, selects template, nodes appear |
| Mobile (small screen) | Layers overlay, property panel full screen |
| Edit existing (add `?id=<uuid>`) | Loads storyboard with scenes |
| Render | Triggers render for analyzed storyboard |
| Credit display | Shows estimated credits in toolbar |
| Tier badge | Shows plan tier with tooltip on hover |
| Grid toggle | Toggle grid visibility in bottom bar |
| Playback | Sequential pan through scenes |
| Zoom in/out/fit | Zoom controls work |

### R3: Create index.ts barrel exports

```
flow/shared/index.ts       → re-exports all shared components
flow/hooks/index.ts        → re-exports all hooks
flow/lib/index.ts          → re-exports all utilities
flow/multi-scene/index.ts  → re-exports MultiSceneEditor
```

### Verify
- [ ] `npx tsc --noEmit` → 0 errors
- [ ] ALL 20 regression test cases pass
- [ ] page.tsx < 30 lines
- [ ] No inline component/hook definitions in page.tsx
- [ ] Git diff shows net removal from page.tsx (was 1456, now <30 lines)

---

## Step 0.8 — Update Viewer Page (10m)

**Goal**: Add `render_mode` badge to `flow/[uuid]/page.tsx`.

### Files

| # | File | Action |
|---|------|--------|
| V1 | `flow/[uuid]/page.tsx` | EDIT — add render_mode badge |
| V2 | `lib/api/storyboard-types.ts` | EDIT — verify render_mode type exists |

### V1: Add render_mode badge

In the viewer page (which shows storyboard status + animated scene nodes), add a small badge near the status badge:

```typescript
// Import
import { Film, Sparkles } from 'lucide-react';

// In the header section, add near status badge:
{storyboard.render_mode === 'single_flow' ? (
  <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#FF5A1F]/10 border border-[#FF5A1F]/20 text-[10px] text-[#FF5A1F] font-medium">
    <Sparkles className="h-3 w-3" />
    One-Shot
  </span>
) : (
  <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-500/10 border border-slate-500/20 text-[10px] text-slate-400 font-medium">
    <Film className="h-3 w-3" />
    Ghép cảnh
  </span>
)}
```

### V2: Verify types

Check `storyboard-types.ts` has `render_mode: 'multi_scene' | 'single_flow'` in the `Storyboard` interface.

### Verify
- [ ] `npx tsc --noEmit` → 0 errors
- [ ] Viewer page shows "Ghép cảnh" badge for multi-scene storyboards
- [ ] Viewer page shows "One-Shot" badge for single-flow storyboards (after Phase 4)
- [ ] Badge is visually consistent with the existing status badge

---

## File Creation Summary

| Step | Files to Create | Files to Edit |
|------|----------------|---------------|
| 0.1 | 0 | `flow/page.tsx` (remove inline, add imports) |
| 0.2 | 4 (`loading-screen`, `ai-draft-modal`, `template-modal`, `confirm-merge-modal`) | `flow/page.tsx` (remove inline, add imports) |
| 0.3 | 10 hook files | `flow/page.tsx` (replace inline logic with hook calls) |
| 0.4 | 1 (`topological-sort.ts`) | `hooks/use-playback.ts` (import topologicalSort) |
| 0.5 | 5 (`toolbar`, `layers-panel`, `canvas-wrapper`, `bottom-bar`, `edge-label-popup`) | `flow/page.tsx` (replace JSX with component calls) |
| 0.6 | 8 (`property-panel` + 4 sections + `handle-save` + `handle-render` + `multi-scene-editor`) | `flow/page.tsx` (move all logic to multi-scene-editor) |
| 0.7 | 4 (barrel `index.ts` files) | `flow/page.tsx` (rewrite as thin router ~20 lines) |
| 0.8 | 0 | `flow/[uuid]/page.tsx` (add badge), `storyboard-types.ts` (verify type) |

**Total: 32 new files, ~6 edits to existing files.**

---

## Final page.tsx Size Progression

| Step | page.tsx Lines | What's Left |
|------|---------------|-------------|
| Start | **1456** | Everything inline |
| 0.1 | ~1420 | Constants removed |
| 0.2 | ~1280 | Component defs removed |
| 0.3 | ~800 | Hook logic moved out |
| 0.4 | ~790 | Topological sort extracted |
| 0.5 | ~500 | UI layout components extracted |
| 0.6 | ~40 | All logic moved to MultiSceneEditor |
| 0.7 | **~15** | Thin router only |

## Risks & Mitigations

| Risk | Probability | Mitigation |
|------|-------------|------------|
| Regression in multi-scene functionality | Medium | Backup page.tsx, verify ALL 20 test cases in Step 0.7 |
| Hook dependency mismatch (stale closures) | Low | Each hook wraps callbacks in useCallback with correct deps |
| `genId` counter resets on re-render | Low | Module-level `idCounter` in `use-canvas-state.ts` (same as original) |
| `ConfirmMergeModal` hardcoded `idCounter = 0` | Medium | Pass `idCounter` reset via `onReplace` callback from MultiSceneEditor |
| TypeScript errors from wrong imports | Low | `npx tsc --noEmit` after EVERY step |
| Single-flow imports breaking when mode not active | Low | `useCompilePrompt` already imported in page.tsx, works fine |
| Mobile layout breaking after extraction | Medium | LayersPanel + PropertyPanel keep same AnimatePresence + responsive classes |
| Large component tree after extraction | Low | React reconciliation handles this; performance stays same |

---

## Agent Assignment

| Step | Primary Agent | Notes |
|------|--------------|-------|
| 0.1 | @web | Simple edit, no dependencies |
| 0.2 | @web | Create 4 components + wire existing 3 |
| 0.3 | @web | 10 hook files, heavy extraction from page.tsx |
| 0.4 | @web | 1 lib file + verify existing |
| 0.5 | @web | 5 complex UI components |
| 0.6 | @web | 8 multi-scene files |
| 0.7 | @web + @tester | Thin router + regression matrix |
| 0.8 | @web | Simple viewer badge |

No backend or daemon changes needed for Phase 0. Purely web-side refactor.
