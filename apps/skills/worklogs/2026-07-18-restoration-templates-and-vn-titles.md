# Restoration trend templates + Việt hóa title mẫu + fix vocab "Clean" — Worklog

## Date
2026-07-18

## Overview
Mở rộng & dọn "Mẫu có sẵn" (storyboard template flows): thêm type mới **Khôi phục / Biến hình** với 7 mẫu FLF (before→after morph), Việt hóa toàn bộ 30 title mẫu tiếng Anh còn lại, và fix lỗi vocab `mood: "Clean"` (ngoài danh sách hợp lệ → dropdown builder không chọn được). Cũng gồm: publish skill video-direction `restoration-reveal`, và fix z-index popup ⋯ storyboard bị panel đè.

## Files Changed
| File | Change |
|------|--------|
| `apps/skills/video-storyboard/types/restoration/SKILL.md` | **MỚI** — type "Khôi phục / Biến hình", 7 template_flows (nhà ngoại thất, tân trang phòng, sân vườn, phục chế ảnh, khôi phục môi trường, hồi sinh cảnh quan, phục chế đồ cũ). Mỗi mẫu 1 cảnh FLF, prompt có tiến trình thời gian (first→next→then→finally), camera Fixed, mô tả ghi rõ "CẦN: ảnh khung đầu + cuối" |
| `apps/skills/video-direction/restoration-reveal/SKILL.md` | Bỏ `status: draft` → published (skill hướng quay ở Video Studio) |
| `apps/skills/video-storyboard/types/brand-tvc/SKILL.md` | mood "Clean"→"Peaceful" (cockpit) & "Energetic" (lab); 4 title → tiếng Việt |
| `apps/skills/video-storyboard/types/product-ads/SKILL.md` | mood "Clean"→"Peaceful" (×2) + frontmatter mood_hints; 4 title → VN |
| `apps/skills/video-storyboard/types/short-form-ads/SKILL.md` | mood "Clean"→"Peaceful"; 4 title → VN |
| `apps/skills/video-storyboard/types/ugc-review/SKILL.md` | mood "Clean"→"Peaceful"; 4 title → VN |
| `apps/skills/video-storyboard/types/{campaign,shoppable-video,storyboard-video,virtual-koc}/SKILL.md` | Việt hóa title (3+3+5+3) |
| `apps/web/src/app/(builder)/studio/storyboard/flow/{single-flow/compiled-prompt-panel,storyboard-image/storyboard-image-panel,multi-scene/property-panel}.tsx` | z-index right-panel `z-40`→`z-10` (`property-panel` `z-40 md:z-10`) — fix popup ⋯ bị đè |

## Key Decisions
1. **Restoration = 1 cảnh / 1 prompt (không chia cảnh)** — FLF morph là 1 clip liền mạch; tách cảnh sẽ tạo cắt, phá hiệu ứng. Prompt viết theo tiến trình thời gian để model pacing đúng thứ tự.
2. **"Clean" → "Peaceful"/"Energetic"** theo ngữ cảnh prompt — "Clean" không có trong studio-vocab mood (8 giá trị hợp lệ), là token cũ trước khi khóa vocab.
3. **Title Việt hóa nhưng prompt giữ tiếng Anh** — prompt gửi model là tiếng Anh (chất lượng gen), chỉ title UI Việt cho locale chính.

## Verification
- [x] Vocab: 0 giá trị mood/camera/lighting/style ngoài danh sách trên TẤT CẢ 9 type (script cross-check qua `/api/media/skills`).
- [x] Count: 37 mẫu tổng (30 cũ + 7 restoration), không mất mẫu sau Việt hóa.
- [x] Restoration FLF integrity: cả 7 mẫu đủ seamless/no-cut/first…finally/camera cố định/desc "CẦN 2 ảnh".
- [x] Title: 0 title tiếng Anh còn sót.
- [x] UI thật (Playwright, đăng nhập): modal "37 mẫu", nhóm khôi phục đủ 7, title Việt, bấm nạp mẫu mới "Phục chế ảnh cũ" → 1 scene + prompt + toast OK. Screenshots /tmp/GALLERY-37, RESTORATION-7, RESTORATION-LOADED-2.
- [x] Popup ⋯: before/after screenshot, dropdown không còn bị đè. tsc 0 lỗi, web test 56/56.
- [~] Render thật video từ template mới: CHƯA chạy lần này; cơ chế FLF (wan2.7-i2v first+last frame) đã xác nhận bằng 1 clip morph thật earlier this session; mẫu mới tái dùng đúng cơ chế + prompt-shape đã kiểm.

## Handoff Notes
- **@web**: "Phong cách hình ảnh" ở One-Shot vẫn dùng `STYLE_OPTIONS` tĩnh (không list video_directions) — restoration-reveal (video-direction) chỉ hiện ở Video Studio; luồng khôi phục dùng qua "Mẫu có sẵn" + ô First/Last Frame.
- **Gap chưa làm** (đề xuất tương lai): nút "Tạo ảnh sau (khôi phục)" i2i ngay tại ô Last Frame để user chỉ cần 1 ảnh cũ là đủ (hiện phải tự có/tự tạo ảnh sau).

## Status
✅ Completed (chưa commit — chờ user duyệt "commit")
