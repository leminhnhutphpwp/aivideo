---
mode: image
surface: image
id: phuc-che-nha-co
label: Phục chế nhà cổ
label_en: Heritage House Restoration
description: "Phục chế ngôi nhà cũ/cổ về trạng thái khang trang nguyên bản — vá nứt, sơn lại, lợp mái, làm sạch — GIỮ NGUYÊN kiến trúc, hình khối và bố cục gốc, chỉ thay đổi tình trạng và vật liệu bề mặt."
example_prompt: "restore this old weathered house to its original beautiful condition, keep the exact same architecture, structure, roofline, window and door positions and camera angle, only repair the damage: heal wall cracks, apply fresh clean paint in period-appropriate colors, rebuild the broken roof tiles, clean the facade, tidy the surroundings, photorealistic, natural daylight, true-to-original restoration"
example_prompt_vi: "phục chế ngôi nhà cũ đã xuống cấp này về trạng thái đẹp nguyên bản, giữ NGUYÊN kiến trúc, kết cấu, dáng mái, vị trí cửa sổ và cửa ra vào cùng góc chụp, chỉ sửa hư hỏng: vá vết nứt tường, sơn mới sạch sẽ đúng tông thời kỳ, lợp lại ngói vỡ, làm sạch mặt tiền, dọn dẹp xung quanh, chân thực, ánh sáng ban ngày tự nhiên, phục chế trung thực với bản gốc"
aspect_hints: ["4:3", "16:9", "1:1"]
mood_tones: ["Peaceful", "Natural", "Happy"]
style_keywords: ["true-to-original restoration", "preserve original architecture", "same structure and layout", "repaired cracks", "fresh period paint", "rebuilt roof tiles", "clean facade", "photorealistic", "natural daylight", "high detail", "authentic materials", "before-after restoration", "structural fidelity", "heritage conservation"]
prompt_template: "photorealistic restoration of {subject}, restored to original beautiful condition while preserving the exact same architecture, structure, roofline and camera angle, only the damage repaired and surfaces refreshed, natural daylight, true-to-original detail, {negative}"
anti_patterns: ["changing the building structure", "different architecture", "moving windows or doors", "adding floors or rooms", "different camera angle", "modern redesign that ignores the original", "hallucinated new building", "distorted geometry", "people appearing"]
default_negative: "different building, changed structure, altered architecture, moved or added windows and doors, extra floors, distorted geometry, warped perspective, hallucinated details, cartoon, illustration, 3D render, blurry, low quality, watermark, text, extra people"
color_palette:
  - { name: "Warm Plaster", hex: "#E7D8C3", role: "Restored wall tones" }
  - { name: "Terracotta Roof", hex: "#9C4A2E", role: "Rebuilt roof tiles" }
  - { name: "Aged Wood", hex: "#6B4A2F", role: "Doors and timber" }
  - { name: "Natural Daylight", hex: "#FFF4E0", role: "Soft outdoor light" }
  - { name: "Fresh Green", hex: "#5C8A4A", role: "Tidied garden" }
  - { name: "Deep Shadow", hex: "#2A2320", role: "Depth and contrast" }
visual_elements:
  - "Exact same building geometry, roofline and opening positions as the input"
  - "Healed wall cracks and refreshed, clean plaster or paint"
  - "Rebuilt intact roof tiles matching the original roof shape"
  - "Cleaned facade with authentic period-appropriate materials"
  - "Tidy, natural surroundings without adding new structures"
  - "Photorealistic natural daylight consistent with the original photo"
style_rules_do:
  - "Preserve the exact original architecture, structure, layout and camera angle"
  - "Only repair damage and refresh surfaces — do not redesign the building"
  - "Keep window, door and roof positions identical to the input"
  - "Use authentic, period-appropriate materials and colors"
  - "Maintain photorealistic natural lighting matching the source"
style_rules_dont:
  - "Do not change the building's shape, size, or number of floors"
  - "Do not move, add, or remove windows, doors, or rooms"
  - "Do not alter the camera angle or framing"
  - "Avoid modern redesigns that ignore the original character"
  - "No hallucinated new structures, people, or distorted geometry"
best_for:
  - "Phục chế nhà cổ, nhà cấp 4, nhà thờ họ, di tích xuống cấp"
  - "Ảnh 'trước → sau' cải tạo nhà giữ nguyên nét gốc"
  - "Tư vấn phục dựng cho chủ nhà, kiến trúc sư bảo tồn"
  - "Nội dung viral phục chế nhà TikTok/Reels"
---

# Phục chế nhà cổ (Heritage House Restoration)

Preset i2i chuyên phục chế ngôi nhà cũ/cổ về trạng thái đẹp nguyên bản mà **giữ nguyên kiến trúc,
hình khối, bố cục và góc chụp gốc** — chỉ sửa hư hỏng (nứt, bong sơn, mái vỡ) và làm mới bề mặt.

Dùng với ảnh gốc (i2i): tải ảnh nhà cũ làm nguồn, preset này nạp từ khoá "giữ kết cấu" và negative
mạnh để model **không đổi công trình**. Khác với "Cải tạo ngoại thất" (redesign hiện đại): preset
này ưu tiên **trung thực với bản gốc**, hợp bảo tồn/di sản.
