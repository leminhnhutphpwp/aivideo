# Storyboard One-Shot + Projects Redesign — Web + Daemon Worklog

## Date
2026-05-30

## Overview
Triển khai full-stack feature One-Shot (single-flow narrative) cho storyboard, tách voiceover post-generation, redesign projects page sang vertical cards, sửa ảnh gốc trong project detail, đồng bộ duration + skills labels.

## Files Changed

### Daemon
| File | Change |
|------|--------|
| `src/routes/media.ts` | Lưu `inputImage` + `lastFrameImage` vào task metadata cho image editing. Sửa TTS preview duyệt tất cả thư mục provider thay vì chỉ model provider. |

### Web — Storyboard
| File | Change |
|------|--------|
| `src/app/(builder)/studio/storyboard/components/render-mode-provider.tsx` | **New** — Context `RenderModeProvider` + hook `useRenderMode` |
| `src/app/(builder)/studio/storyboard/components/render-mode-toggle.tsx` | **New** — Pill toggle "Ghép cảnh / One-Shot" + confirm dialog |
| `src/app/(builder)/studio/storyboard/flow/shared/constants.ts` | **New** — `ACCENT`, `COLORS` |
| `src/app/(builder)/studio/storyboard/flow/shared/style-constants.ts` | **New** — `inputC`, `pillBase`, `pillActive`, `pillInactive` |
| `src/app/(builder)/studio/storyboard/flow/shared/scene-node.tsx` | **New** — `SceneNode` component |
| `src/app/(builder)/studio/storyboard/flow/shared/ctx-menu.tsx` | **New** — `CtxMenu` component |
| `src/app/(builder)/studio/storyboard/flow/shared/collapsible-section.tsx` | **New** — `Section` collapsible |
| `src/app/(builder)/studio/storyboard/flow/hooks/use-scene-form.ts` | **New** — `useSceneForm` hook |
| `src/app/(builder)/studio/storyboard/flow/hooks/use-canvas-state.ts` | **New** — `useCanvasState` hook |
| `src/app/(builder)/studio/storyboard/flow/hooks/use-undo-redo.ts` | **New** — `useUndoRedo` hook |
| `src/app/(builder)/studio/storyboard/flow/hooks/use-canvas-actions.ts` | **New** — `useCanvasActions` hook |
| `src/app/(builder)/studio/storyboard/flow/hooks/use-credit-estimation.ts` | **New** — (unused, deleted) |
| `src/app/(builder)/studio/storyboard/flow/hooks/use-auto-tags.ts` | **New** — `useAutoTags` hook |
| `src/app/(builder)/studio/storyboard/flow/hooks/use-edge-manager.ts` | **New** — `useEdgeManager` hook |
| `src/app/(builder)/studio/storyboard/flow/lib/build-payload.ts` | **New** — `buildBasePayload` shared |
| `src/app/(builder)/studio/storyboard/flow/single-flow/compiled-prompt-panel.tsx` | **New** — CompiledPromptPanel: 5 shared skills + compile + edit |
| `src/app/(builder)/studio/storyboard/flow/single-flow/use-compile-prompt.ts` | **New** — `useCompilePrompt` hook + stale detection |
| `src/app/(builder)/studio/storyboard/flow/single-flow/prompt-status-badge.tsx` | **New** — Status badge (idle/compiling/compiled/stale/error) |
| `src/app/(builder)/studio/storyboard/flow/single-flow/single-flow-editor.tsx` | **New** — placeholder skeleton (deleted) |
| `src/app/(builder)/studio/storyboard/layout.tsx` | **New** — Wraps children with `RenderModeProvider` |
| `src/app/(builder)/studio/storyboard/flow/page.tsx` | Major: One-Shot mode, property panel conditional, credit estimate, markStale, edge label sync, template smart labels, beforeunload, render guard, compiledPrompt load, cursor-pointer fixes, voice/audio section removed |
| `src/app/(builder)/studio/storyboard/flow/[uuid]/page.tsx` | Added "Thêm giọng đọc" button + VoiceoverModal |

### Web — Voiceover
| File | Change |
|------|--------|
| `src/components/studio/voiceover-modal.tsx` | **New** — VoiceSelector + textarea modal cho post-generation voiceover |

### Web — Projects
| File | Change |
|------|--------|
| `src/app/(dashboard)/projects/page.tsx` | Redesign: vertical cards aspect-[3/4], grid 2-5 columns |
| `src/app/(dashboard)/projects/[id]/page.tsx` | Fetch project files cho ảnh gốc |
| `src/components/projects/task-card.tsx` | Hiển thị `inputImage` từ task metadata trước output |
| `src/components/projects/types.ts` | Thêm `metadata` field vào `TaskRecord` |

### Web — Video Studio
| File | Change |
|------|--------|
| `src/app/(dashboard)/studio/video/[feature]/page.tsx` | Voice removed from generate, durations from API |
| `src/components/studio/video/video-sidebar.tsx` | Voice section removed |

### Web — API Client
| File | Change |
|------|--------|
| `src/lib/api/client.ts` | `compilePrompt`: fix URL `/storyboards/` (plural) + `.then(r => r.data)`. `pricingDurations`: new. `addVoiceover`: new. |
| `src/lib/api/storyboard-types.ts` | Thêm `render_mode`, `compiled_prompt`, `total_duration`, `camera_movement`, `style`, `mood`, `lighting`, `narration` |

### Skills
| File | Change |
|------|--------|
| `apps/skills/image-direction/poster-campaigns/SKILL.md` | Sửa tiếng Việt có dấu |
| `apps/skills/image-direction/ui-mockups/SKILL.md` | Sửa tiếng Việt có dấu |
| `apps/skills/image-direction/typography-text/SKILL.md` | Sửa tiếng Việt có dấu |
| `apps/skills/image-direction/infographics/SKILL.md` | Sửa tiếng Việt có dấu |
| `apps/skills/image-direction/branding-packaging/SKILL.md` | Sửa tiếng Việt có dấu |
| `apps/skills/image-direction/scenes-illustrations/SKILL.md` | Sửa tiếng Việt có dấu |
| `apps/skills/image-direction/claymation/SKILL.md` | Sửa tiếng Việt có dấu |
| `apps/skills/image-direction/portraits-characters/SKILL.md` | Sửa tiếng Việt có dấu |

## Key Decisions
1. One-Shot: canvas dùng chung với multi-scene, chỉ khác panel phải (CompiledPromptPanel) + render logic
2. Shared skills cho One-Shot: camera/style/mood/lighting/narration dùng chung, hiển thị trong CompiledPromptPanel
3. Voice tách hoàn toàn khỏi generation — chỉ có post-generation VoiceoverModal
4. Edge labels tự động "Chuyển tiếp" / "Kết thúc" cho One-Shot, smart fill cho template import
5. Duration từ API `/api/v1/pricing/durations` thay vì hardcode nhiều nơi
6. Projects page: vertical cards kiểu short/Reels (aspect-[3/4])
7. AssetController filter thumbnail để tránh duplicate trong picker

## Verification
- [x] tsc --noEmit: 0 errors (web + daemon)
- [x] Backend tests: 18/18
- [x] Model sync: PASS
- [x] Daemon restarted

## Additional Fixes (same day)

### Daemon
| File | Change |
|------|--------|
| `src/routes/media.ts` | Lưu `inputImage` + `lastFrameImage` vào task metadata. Sửa TTS preview duyệt tất cả thư mục provider. **Task list API thêm `metadata` field vào response** (line 515). |

### Web — Projects
| File | Change |
|------|--------|
| `src/app/(dashboard)/projects/page.tsx` | Redesign: vertical cards aspect-[3/4], grid 2-5 columns |
| `src/components/projects/task-card.tsx` | `InputImagePreview` dùng `fetchRawFile()` blob. `OutputPreview` 50/50 layout. Ảnh gốc + Kết quả side-by-side. |

### Web — Image Studio
| File | Change |
|------|--------|
| `src/app/(dashboard)/studio/image/page.tsx` | Fix hardcode 2,000 credits → gọi `laravel.pricingCalculate()` với `video_type: 'image_generation'`. |

### Web — Docs
| File | Change |
|------|--------|
| `src/lib/api/client.ts` | Thêm `compilePrompt`, `pricingDurations`, `addVoiceover`. Fix URL `/storyboards/` (plural). |
| `src/lib/api/storyboard-types.ts` | Thêm `render_mode`, `compiled_prompt`, `total_duration`, shared skills fields, `metadata`. |

## Handoff Notes
- **@backend needs to know**: Daemon lưu `inputImage` vào task.metadata
- **@tester needs to know**: One-Shot flow: create → compile → edit → render → voiceover
