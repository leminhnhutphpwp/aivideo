---
id: restoration
label: Khôi phục / Biến hình
label_en: Restoration Reveal
featured: true
capability: i2v
direction_hints: ["cinematic"]
mood_hints: ["Peaceful", "Happy"]
camera_hints: ["Fixed", "Zoom In"]
lighting_hints: ["Natural", "Golden Hour"]
aspect_hints: ["9:16", "16:9"]
duration_hint: "5–8s"
style_keywords: ["seamless before-after transformation", "restoration reveal", "old to new morph", "cracks healing", "fresh paint appearing", "debris clearing", "roof rebuilding", "overgrowth trimming", "satisfying reveal", "cinematic cross-dissolve", "time-lapse restoration", "smooth continuous morph", "fixed camera", "glow-up transition"]
prompt_template: "seamless before-after restoration of {video_type} in one continuous shot with no cuts, transforming gradually from old and ruined into fully restored and beautiful, the change unfolding in order over the clip, same fixed camera angle and identical framing throughout, smooth continuous cinematic morph, satisfying reveal, {negative}"
anti_patterns: ["hard cut between shots", "camera moving away from subject", "different framing at start and end", "flickering", "warping geometry", "new objects popping in", "people appearing", "panning or tracking camera"]
default_negative: "hard cut, camera movement, pan, tracking, different framing, flicker, warping, new objects, people, text overlay, watermark, low quality"
example_prompt: "seamless before-after restoration of a small countryside cottage in one continuous shot, opening on the ruined house with a broken roof and cracked walls, then gradually — first the cracks heal, next fresh white paint spreads, then the roof rebuilds, and finally the overgrown yard becomes a manicured garden — ending on the fully renovated home, same fixed camera angle, no camera movement, smooth continuous cinematic morph with no cuts, peaceful satisfying reveal, no people"
example_prompt_vi: "khôi phục liền mạch trước-sau một ngôi nhà nông thôn nhỏ trong một cú máy liên tục, mở ra ngôi nhà đổ nát mái vỡ tường nứt, rồi biến đổi dần theo thứ tự — đầu tiên vết nứt lành, kế đến sơn trắng mới lan ra, rồi mái lợp lại, cuối cùng sân hoang thành vườn gọn gàng — kết ở ngôi nhà mới tinh, giữ nguyên góc máy cố định, không di chuyển máy, morph điện ảnh liền mạch không cắt cảnh, cảm giác thỏa mãn nhẹ nhàng, không có người"
best_for:
  - "Video 'khôi phục nhà' before/after viral TikTok/Reels"
  - "Tân trang nội thất, cải tạo phòng, dọn sân vườn"
  - "Hồi sinh đồ vật cũ: bàn ghế, xe, đồ nội thất"
  - "Chuyển cảnh 'glow-up' trước → sau mượt mà"
when_to_use:
  - "Muốn hiệu ứng biến hình cũ → mới liền mạch, không cắt cảnh"
  - "Đã có (hoặc tạo được) ảnh trạng thái cũ và ảnh trạng thái mới"
  - "Chủ thể đứng yên, camera cố định để biến đổi rõ"
template_flows:
  - name: "Khôi phục nhà (ngoại thất)"
    description: "Nhà cũ đổ nát → nhà mới khang trang, morph liền mạch. CẦN: ảnh khung đầu = nhà cũ, ảnh khung cuối = nhà đã sửa (giữ nguyên góc máy)."
    direction: "cinematic"
    scenes:
      - prompt: "seamless before-after restoration of a house exterior in one continuous shot with no cuts. It opens on the old, weathered and ruined house — cracked walls, a broken sagging roof, peeling faded paint and an overgrown weedy yard. The transformation then unfolds gradually and in clear order: first the wall cracks heal and seal shut, next fresh clean paint spreads across the entire facade, then the broken roof tiles reassemble one by one into a solid new roof, and finally the overgrown yard clears out and greens into a neat manicured garden. It ends holding on the fully restored, beautiful home. The camera stays at one fixed angle with identical framing from the first frame to the last, no camera movement, smooth continuous cinematic morph, peaceful and satisfying reveal, warm natural daylight."
        duration_seconds: 6
        style: "Cinematic"
        mood: "Peaceful"
        camera: "Fixed"
        lighting: "Natural"
        aspect_ratio: "9:16"
        narration: ""
    edges: []

  - name: "Tân trang phòng (nội thất)"
    description: "Phòng cũ bừa bộn → phòng mới gọn đẹp. CẦN: ảnh khung đầu = phòng cũ, ảnh khung cuối = phòng đã tân trang (giữ nguyên góc máy)."
    direction: "cinematic"
    scenes:
      - prompt: "seamless before-after interior renovation of a room in one continuous shot with no cuts. It opens on the old, run-down room — stained cracked walls, a worn dirty floor, broken furniture and a dim cluttered space. The makeover then unfolds gradually and in order: first the clutter clears away and the room empties, next the walls repaint clean and bright, then the worn floor restores into polished flooring, and finally tidy modern furniture settles into place with warm cozy styling. It ends on the fully renovated, bright and inviting room. The camera holds one fixed angle with identical framing from the first frame to the last, no camera movement, smooth continuous cinematic morph, satisfying glow-up reveal, soft warm indoor lighting."
        duration_seconds: 6
        style: "Cinematic"
        mood: "Happy"
        camera: "Fixed"
        lighting: "Studio Soft"
        aspect_ratio: "9:16"
        narration: ""
    edges: []

  - name: "Hồi sinh sân vườn"
    description: "Sân hoang tàn → khu vườn xanh gọn. CẦN: ảnh khung đầu = sân cũ, ảnh khung cuối = vườn đã dọn (giữ nguyên góc máy)."
    direction: "cinematic"
    scenes:
      - prompt: "seamless before-after transformation of a neglected backyard in one continuous shot with no cuts. It opens on the overgrown, messy yard — tall weeds, dead patchy grass, scattered debris and a cracked broken path. The transformation then unfolds gradually and in order: first the debris clears and the tall weeds are pulled away, next the patchy ground fills in and greens into a trimmed healthy lawn, then flower beds bloom in along the edges, and finally the cracked path repairs into a clean stone walkway framed by neat hedges. It ends on the lush, tidy garden. The camera holds a single fixed angle with identical framing from the first frame to the last, no camera movement, smooth continuous cinematic morph, peaceful satisfying reveal, bright natural golden-hour daylight."
        duration_seconds: 6
        style: "Cinematic"
        mood: "Peaceful"
        camera: "Fixed"
        lighting: "Golden Hour"
        aspect_ratio: "9:16"
        narration: ""
    edges: []

  - name: "Phục chế ảnh cũ"
    description: "Ảnh cũ ố vàng, rách, phai màu → ảnh nét, đủ màu như mới. CẦN: ảnh khung đầu = ảnh cũ hư, ảnh khung cuối = ảnh đã phục chế (giữ nguyên bố cục)."
    direction: "cinematic"
    scenes:
      - prompt: "seamless before-after restoration of an old damaged photograph in one continuous shot with no cuts. It opens on the aged photo — faded yellowed tones, deep cracks and tears across the surface, scratches, dust spots and washed-out colors. The restoration then unfolds gradually and in order: first the tears and cracks mend and disappear, next the dust spots and scratches vanish, then the faded areas regain sharp clean detail, and finally natural lifelike color floods back into the image. It ends on the fully restored, crisp and vibrant photograph, keeping the exact same framing and composition as the original, no camera movement, smooth continuous cinematic morph, nostalgic satisfying reveal, even soft lighting."
        duration_seconds: 6
        style: "Realistic"
        mood: "Peaceful"
        camera: "Fixed"
        lighting: "Studio Soft"
        aspect_ratio: "9:16"
        narration: ""
    edges: []

  - name: "Khôi phục môi trường"
    description: "Sông/bãi biển ô nhiễm đầy rác → nước trong, thiên nhiên sạch. CẦN: ảnh khung đầu = cảnh ô nhiễm, ảnh khung cuối = cảnh đã sạch (giữ nguyên góc máy)."
    direction: "cinematic"
    scenes:
      - prompt: "seamless before-after environmental restoration of a polluted riverbank in one continuous shot with no cuts. It opens on the damaged scene — water clogged with floating trash and plastic, murky brown water, litter scattered along dead muddy banks and a hazy grey sky. The restoration then unfolds gradually and in order: first the floating trash and plastic clear away, next the murky water turns clean and clear blue, then green grass and healthy plants grow along the banks, and finally the sky brightens to clear blue as the scene fills with life. It ends on the pristine, thriving natural landscape, same fixed camera angle and identical framing, no camera movement, smooth continuous cinematic morph, hopeful satisfying reveal, bright natural daylight."
        duration_seconds: 6
        style: "Cinematic"
        mood: "Happy"
        camera: "Fixed"
        lighting: "Natural"
        aspect_ratio: "9:16"
        narration: ""
    edges: []

  - name: "Hồi sinh cảnh quan"
    description: "Vùng đất khô cằn, chết chóc → cảnh quan xanh tươi tràn sức sống. CẦN: ảnh khung đầu = cảnh khô cằn, ảnh khung cuối = cảnh xanh tươi (giữ nguyên góc máy)."
    direction: "cinematic"
    scenes:
      - prompt: "seamless before-after restoration of a barren landscape in one continuous shot with no cuts. It opens on the dry, lifeless scene — cracked parched earth, dead leafless trees, brown withered grass and a dusty haze. The revival then unfolds gradually and in order: first the cracked ground softens and darkens with moisture, next green grass sweeps across the field, then leaves and blossoms return to the bare trees, and finally wildflowers bloom and a clear stream appears winding through. It ends on the lush, vibrant green landscape full of life, same fixed camera angle and identical framing, no camera movement, smooth continuous cinematic morph, uplifting satisfying reveal, warm golden-hour daylight."
        duration_seconds: 6
        style: "Cinematic"
        mood: "Peaceful"
        camera: "Fixed"
        lighting: "Golden Hour"
        aspect_ratio: "16:9"
        narration: ""
    edges: []

  - name: "Phục chế đồ cũ"
    description: "Đồ vật cũ hỏng, gỉ sét (xe, ghế, đồng hồ…) → phục chế sáng bóng như mới. CẦN: ảnh khung đầu = đồ cũ, ảnh khung cuối = đồ đã phục chế (giữ nguyên góc máy)."
    direction: "cinematic"
    scenes:
      - prompt: "seamless before-after restoration of an old worn object in one continuous shot with no cuts. It opens on the damaged item — rusted metal, chipped and faded paint, cracked worn surfaces, dust and grime covering it. The restoration then unfolds gradually and in order: first the rust and grime lift away, next the cracks and chips fill and smooth over, then a fresh clean coat of paint spreads across the surface, and finally polished details and shine return, making it look brand new. It ends on the fully restored, gleaming object, same fixed camera angle and identical framing, no camera movement, smooth continuous cinematic morph, satisfying restoration reveal, soft studio lighting."
        duration_seconds: 6
        style: "Realistic"
        mood: "Happy"
        camera: "Fixed"
        lighting: "Studio Soft"
        aspect_ratio: "9:16"
        narration: ""
    edges: []
---

# Khôi phục / Biến hình (Restoration Reveal)

Hiệu ứng **"trước → sau" liền mạch**: một đối tượng (nhà, phòng, sân, đồ vật cũ) biến đổi mượt từ trạng thái cũ/đổ nát sang trạng thái đã khôi phục — nứt lành, sơn mới hiện, rác biến mất, mái lợp lại. Đây là kiểu video "khôi phục nhà" viral trên TikTok/Reels.

## ⚠️ Đây là 1 clip liền mạch (không chia cảnh)
Morph "trước→sau" là **một cú máy liên tục, không cắt**. Model FLF nội suy giữa 2 keyframe → không thể (và không nên) tách "cảnh 1s / cảnh 2s" vì mỗi cảnh riêng = một clip riêng = **có cắt**, làm hỏng morph. Vì vậy mẫu chỉ có **1 cảnh, 1 prompt** — và prompt được viết theo **tiến trình thời gian** ("đầu tiên… kế đến… rồi… cuối cùng") để model pacing biến đổi có thứ tự.

## ⚠️ Bắt buộc: HAI ảnh khung (FLF)
Đây **không phải** i2v-1-ảnh. Cần **hai keyframe** (first-frame → last-frame):
- **Ảnh khung đầu** = trạng thái **CŨ** (nhà đổ nát).
- **Ảnh khung cuối** = trạng thái **ĐÃ KHÔI PHỤC** (nhà mới).
- Kết quả nhà mới do **ảnh khung cuối** quyết định, không do prompt sáng tác ra.

Ở chế độ **One-Shot**, upload 2 ảnh này ở ô **"Ảnh khung đầu (First Frame)"** và **"Ảnh khung cuối (Last Frame)"** trong panel bên phải.

**Cách tạo ảnh khung cuối:** dùng sửa ảnh i2i (vd `qwen-image-2.0-pro`) từ chính ảnh nhà cũ, prompt "khôi phục ngôi nhà này — GIỮ NGUYÊN góc máy/bố cục". Giữ đúng khung hình là bắt buộc để morph mượt.

## Ràng buộc render
- Model i2v hỗ trợ first+last frame: **`wan2.7-i2v`** (đã kiểm chạy). `wan2.6-i2v` chỉ nhận first frame — không dùng cho FLF.
- Camera **cố định** hoặc **zoom-in chậm** — KHÔNG pan/tracking (đối tượng đứng yên để biến đổi rõ).
- Bố cục/góc máy ảnh đầu và ảnh cuối phải TRÙNG.
- 5–8s; dọc 9:16 cho social, hoặc 16:9.
