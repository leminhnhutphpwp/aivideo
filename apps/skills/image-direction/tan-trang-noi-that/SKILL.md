---
mode: image
surface: image
id: tan-trang-noi-that
label: Tân trang nội thất
label_en: Interior Makeover
description: "Tân trang phòng/nội thất cũ thành không gian sạch đẹp, hiện đại — sơn lại, sàn mới, nội thất gọn — GIỮ NGUYÊN kích thước phòng, vị trí cửa/cửa sổ, bố cục tường và góc chụp gốc."
example_prompt: "make over this old room into a clean modern interior, keep the exact same room dimensions, wall layout, window and door positions and camera angle, only refresh the surfaces and furnishing: repaint walls bright and clean, restore the flooring, add tidy modern furniture and warm cozy styling, photorealistic, soft warm indoor lighting"
example_prompt_vi: "tân trang căn phòng cũ này thành nội thất hiện đại sạch đẹp, giữ NGUYÊN kích thước phòng, bố cục tường, vị trí cửa sổ và cửa cùng góc chụp, chỉ làm mới bề mặt và nội thất: sơn tường sáng sạch, phục hồi sàn, thêm nội thất hiện đại gọn gàng và bài trí ấm cúng, chân thực, ánh sáng trong nhà ấm dịu"
aspect_hints: ["4:3", "16:9", "1:1"]
mood_tones: ["Happy", "Peaceful", "Natural"]
style_keywords: ["modern interior makeover", "preserve room layout", "same walls and openings", "repainted bright walls", "restored flooring", "tidy modern furniture", "cozy warm styling", "photorealistic", "soft indoor lighting", "clean minimal", "spatial fidelity", "before-after makeover", "same camera angle"]
prompt_template: "photorealistic interior makeover of {subject}, refreshed into a clean modern space while preserving the exact same room dimensions, wall layout, openings and camera angle, only surfaces and furnishing updated, soft warm indoor lighting, {negative}"
anti_patterns: ["changing the room dimensions", "moving walls", "moving windows or doors", "different room shape", "different camera angle", "a completely different room", "distorted perspective", "people appearing"]
default_negative: "different room, changed layout, moved walls, moved windows and doors, altered dimensions, distorted perspective, warped geometry, hallucinated space, cartoon, illustration, 3D render cartoonish, blurry, low quality, watermark, text, extra people"
color_palette:
  - { name: "Soft White", hex: "#F5F3EE", role: "Repainted walls" }
  - { name: "Warm Oak", hex: "#B8895A", role: "Restored flooring" }
  - { name: "Cozy Beige", hex: "#D9C7A8", role: "Textiles and sofa" }
  - { name: "Warm Lamp", hex: "#FFE3B0", role: "Indoor lighting" }
  - { name: "Sage Accent", hex: "#8AA07A", role: "Plants and accents" }
  - { name: "Soft Shadow", hex: "#4A443C", role: "Depth" }
visual_elements:
  - "Exact same room dimensions, wall layout and opening positions as the input"
  - "Bright, cleanly repainted walls and restored flooring"
  - "Tidy, contemporary furniture arranged naturally in the space"
  - "Warm cozy styling with realistic textiles and accents"
  - "Consistent camera framing and perspective with the original"
  - "Soft warm photorealistic indoor lighting"
style_rules_do:
  - "Preserve the exact room dimensions, wall layout, openings and camera angle"
  - "Refresh only surfaces, flooring, furniture and styling"
  - "Keep window and door positions identical to the input"
  - "Use realistic, purchasable modern furnishings"
  - "Maintain soft photorealistic indoor lighting and correct perspective"
style_rules_dont:
  - "Do not resize the room or move the walls"
  - "Do not move, add, or remove windows and doors"
  - "Do not alter the camera angle or replace the room"
  - "Avoid distorted perspective or unrealistic furniture"
  - "No hallucinated spaces, people, or warped geometry"
best_for:
  - "Tân trang phòng khách, phòng ngủ, bếp, văn phòng"
  - "Ảnh 'trước → sau' cải tạo nội thất"
  - "Tư vấn thiết kế nội thất, cho thuê, staging bất động sản"
  - "Nội dung viral makeover phòng TikTok/Reels"
---

# Tân trang nội thất (Interior Makeover)

Preset i2i biến phòng cũ thành không gian **sạch đẹp, hiện đại** nhưng **giữ nguyên kích thước phòng,
bố cục tường, vị trí cửa và góc chụp**. Nhấn mạnh đúng phối cảnh và tỉ lệ không gian để kết quả tin
cậy, hợp tư vấn nội thất và virtual staging.
