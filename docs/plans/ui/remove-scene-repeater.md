# Remove Scene Repeater — Design Plan

## Date
2026-05-31

## Overview
Bỏ tính năng "scene repeater" (tạo nhiều cảnh trong 1 lần generate) trên tất cả các trang Video (`text-to-video`, `image-to-video`, `reference-to-video`, `video-editing`, `character-animation`). Chuyển thành form đơn giản chỉ 1 cảnh duy nhất. Storyboard đã làm tốt hơn việc quản lý đa cảnh.

## Lý do
- Storyboard (`/studio/storyboard/flow`) đã hỗ trợ multi-scene đầy đủ: sortable, edge labels, FFmpeg concat, dual mode
- Giữ scene repeater trong các trang Video gây duplicate UX và maintain 2 luồng code
- Form 1 cảnh đơn giản hơn, giảm cognitive load cho user mới
- Giảm bugs: loop tạo project, upload ảnh per-scene, xử lý lỗi từng scene

## User Stories
- As a user, I want to quickly generate a single video from my prompt/image without managing multiple scenes
- As a user who needs multi-scene, I will use Storyboard instead

## Phân tích Hiện Trạng

### Frontend — File bị ảnh hưởng

| File | Liên quan đến scene/repeater | Hành động |
|------|-----------------------------|-----------|
| `apps/web/src/app/(dashboard)/studio/video/[feature]/page.tsx` | 🔴 Dùng `VideoScene[]`, `addScene()`, `removeScene()`, loop `filledScenes`, "Thêm cảnh" button | Sửa: chuyển sang single scene |
| `apps/web/src/components/studio/video/video-scene-editor.tsx` | 🟡 Show "Cảnh {index+1}" header, remove button, nhận `index`, `onRemove` | Sửa: bỏ index/onRemove, đổi header |
| `apps/web/src/components/studio/video/video-sidebar.tsx` | 🟡 Show `{filledCount}/{totalScenes}`, "Tạo X cảnh", "Mỗi cảnh tạo thành..." | Sửa: đơn giản hóa text |
| `apps/web/src/components/studio/video/video-presets.tsx` | 🟢 Nhận `targetSceneId` — vẫn hoạt động với 1 scene | Không cần sửa |
| `apps/web/src/components/studio/video/video-layout.tsx` | 🟢 Không có code scene | Không cần sửa |
| `apps/web/src/components/studio/video/types.ts` | 🟢 `VideoScene` interface vẫn cần cho single scene | Không cần sửa |
| `apps/web/src/lib/i18n/vi.ts` | 🟡 Key `studio.addScene`, `studio.scene`, `studio.scenes` | Sửa: cập nhật text |
| `apps/web/src/app/(dashboard)/studio/multi-scene/page.tsx` | 🔴 Trang multi-scene standalone cũ — không còn liên kết từ hub nhưng URL vẫn truy cập được | Xóa hoặc redirect về storyboard |

### Backend — Không cần thay đổi
- `DaemonProxyController::generateMedia()` xử lý 1 job/lần gọi — không có logic multi-scene
- Frontend loop tạo project riêng cho từng scene → backend không biết về multi-scene
- Không cần migration

## Technical Design

### Single Scene State Model
```
Trước:  scenes: VideoScene[]     → scenes.map(s => <VideoSceneEditor />) + add/remove
                                          ↓
Sau:    scene: VideoScene        → <VideoSceneEditor /> (single instance)
```

### Data Flow (sau khi sửa)
```
User fills form (1 scene)
  └── Click "Tạo video"
      └── 1 daemon.createProject() 
      ├── Optional: 1 daemon.uploadFile() (nếu có reference image)
      └── 1 daemon.generate() → redirect to project
```

### API Contracts (không đổi)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/daemon/projects` | Create single project |
| POST | `/api/daemon/projects/:id/upload` | Upload reference file |
| POST | `/api/daemon/media/projects/:id/media/generate` | Generate media |

## Edge Cases
- User đang ở page có nhiều scenes → sau deploy, state reset về 1 scene
- Reference image upload: trước upload cho từng scene trong loop, nay chỉ upload 1 lần
- Price calculation: `quantity` chuyển từ `filledScenes.length` → `1`
- Không có scene nào (prompt trống) → giữ nguyên validation

## Risks & Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| User quen dùng multi-scene trong video pages | Medium | Storyboard có sẵn, redirect user sang đó |
| Multi-scene page vẫn tồn tại ở `/studio/multi-scene` | Low | Redirect về storyboard hoặc xóa page |
| i18n keys bị thừa | Low | Giữ lại không xóa để tránh lỗi reference |

## Implementation Tasks

| # | Layer | Task | Agent | Est. |
|---|-------|------|-------|------|
| 1 | Web | Sửa `video/[feature]/page.tsx`: single scene state, bỏ loop, bỏ add/remove, đơn giản hóa generate | @web | 45m |
| 2 | Web | Sửa `video-scene-editor.tsx`: bỏ `index`, `onRemove` props, đổi header text | @web | 20m |
| 3 | Web | Sửa `video-sidebar.tsx`: bỏ scene count, đổi text button | @web | 15m |
| 4 | Web | Xóa/redirect `multi-scene/page.tsx` → redirect về `/studio/storyboard` | @web | 10m |
| 5 | Web | Cập nhật i18n keys nếu cần | @web | 10m |
| 6 | Web | tsc check + visual verify | @web | 10m |

**Tổng effort: ~1.5h**

## Thứ tự triển khai
1. Task 1 (page.tsx) — core change, quan trọng nhất
2. Task 2 + 3 (components) — song song được
3. Task 4 (multi-scene page) — độc lập
4. Task 5 (i18n) — sau khi components xong
5. Task 6 (verify) — cuối cùng
