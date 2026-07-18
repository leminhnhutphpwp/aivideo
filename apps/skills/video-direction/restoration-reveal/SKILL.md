---
mode: video
surface: video
id: restoration-reveal
label: Khôi phục / Biến hình
label_en: Restoration Reveal
featured: false
aspect_hints: ["9:16", "16:9"]
camera_presets: ["Fixed", "Zoom In"]
lighting_presets: ["Natural", "Golden Hour"]
mood_tones: ["Peaceful", "Happy", "Dramatic"]
style_keywords: ["seamless before-after transformation", "restoration reveal", "old to new morph", "cracks healing", "fresh paint appearing", "debris clearing", "roof rebuilding", "overgrowth trimming", "satisfying reveal", "cinematic cross-dissolve", "time-lapse restoration", "smooth continuous morph"]
prompt_template: "seamless before-after restoration of {subject}, transforming from old and ruined into fully restored and beautiful, same camera angle {camera}, materials rebuilding, cracks healing, fresh paint appearing, roof repairing, debris and overgrowth clearing, {mood} satisfying reveal, smooth continuous cinematic morph with no cuts, {negative}"
anti_patterns: ["hard cut between shots", "camera moving away from subject", "different framing at start and end", "flickering", "warping geometry", "new objects popping in", "people appearing"]
references: ["TikTok/Reels 'before & after' restoration edits", "house/room glow-up transitions", "time-lapse renovation reels"]
example_prompt: "seamless before-after restoration of a small countryside cottage, transforming from ruined with a broken roof and cracked walls into a freshly renovated home, same fixed camera angle, roof rebuilding, fresh white paint appearing, overgrown yard becoming a manicured garden, peaceful satisfying reveal, smooth continuous cinematic morph with no cuts, no camera movement, no people, no hard cuts"
example_prompt_vi: "khôi phục liền mạch trước-sau một ngôi nhà nông thôn nhỏ, biến từ đổ nát mái vỡ tường nứt thành nhà mới tinh, giữ nguyên góc máy cố định, mái lợp lại, sơn trắng mới hiện ra, sân hoang thành vườn gọn gàng, cảm giác thỏa mãn nhẹ nhàng, morph điện ảnh liền mạch không cắt cảnh, không di chuyển máy, không có người, không cắt cứng"
---

# Khôi phục / Biến hình (Restoration Reveal)

Hiệu ứng "trước → sau" liền mạch: một đối tượng (nhà, phòng, sân, đồ vật cũ) **biến đổi mượt** từ trạng thái cũ/đổ nát sang trạng thái đã khôi phục — nứt lành, sơn mới hiện, rác biến mất, mái lợp lại. Kiểu video "khôi phục nhà" viral trên TikTok/Reels.

## Yêu cầu kỹ thuật (BẮT BUỘC để ra hiệu ứng đúng)
Đây **không phải** i2v-1-ảnh — cần **hai keyframe** (FLF, first-frame → last-frame):
- **Ảnh đầu (`first_frame`)** = trạng thái CŨ (nhà đổ nát).
- **Ảnh cuối (`last_frame`)** = trạng thái ĐÃ KHÔI PHỤC.
- Model nội suy giữa 2 khung → morph liền mạch. Kết quả nhà mới do **ảnh cuối** quyết định, không do prompt sáng tác.

**Cách tạo ảnh cuối:** dùng sửa ảnh i2i (vd `qwen-image-2.0-pro`) từ chính ảnh nhà cũ, prompt "khôi phục ngôi nhà này — GIỮ NGUYÊN góc máy/bố cục". Giữ đúng khung hình là bắt buộc để morph mượt.

## Ràng buộc render
- Model i2v hỗ trợ first+last frame: **`wan2.7-i2v`** (đã kiểm chạy). (`wan2.6-i2v` hiện chỉ nhận first frame — không dùng cho FLF.)
- Camera **cố định** hoặc **zoom-in chậm** (đối tượng đứng yên để biến đổi rõ). KHÔNG pan/tracking.
- Bố cục/góc máy ảnh đầu và cuối phải TRÙNG.
- 5–8s; dọc 9:16 cho social, hoặc 16:9.

## When to use
Kể chuyện "hô biến" đồ cũ thành mới: khôi phục nhà/phòng, dọn sân, tân trang nội thất, before/after cải tạo.
