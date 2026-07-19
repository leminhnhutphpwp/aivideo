---
mode: image
surface: image
id: thiet-ke-san-vuon
label: Thiết kế sân vườn
label_en: Garden & Landscape Design
description: "Thiết kế lại sân/vườn/cảnh quan quanh nhà thành không gian xanh gọn đẹp — cây cối, lối đi, tiểu cảnh — GIỮ NGUYÊN công trình, ranh giới đất và góc chụp gốc, chỉ thay đổi phần cảnh quan."
example_prompt: "redesign the yard and garden in this photo into a beautiful tidy green landscape, keep the exact same house, boundaries, paths layout and camera angle, only transform the greenery: healthy manicured lawn, well-placed trees and shrubs, clean walkway and small garden features, photorealistic, bright natural daylight"
example_prompt_vi: "thiết kế lại sân và vườn trong ảnh này thành cảnh quan xanh gọn đẹp, giữ NGUYÊN ngôi nhà, ranh giới, bố cục lối đi và góc chụp, chỉ biến đổi phần cây xanh: thảm cỏ được cắt tỉa khoẻ mạnh, cây và bụi bố trí hợp lý, lối đi sạch và tiểu cảnh nhỏ, chân thực, ánh sáng ban ngày sáng tự nhiên"
aspect_hints: ["16:9", "4:3", "1:1"]
mood_tones: ["Peaceful", "Happy", "Natural"]
style_keywords: ["garden landscape design", "preserve house and boundaries", "manicured lawn", "well-placed trees and shrubs", "clean walkway", "tidy garden features", "lush greenery", "photorealistic", "bright natural daylight", "curb appeal", "landscape fidelity", "before-after garden makeover", "same camera angle"]
prompt_template: "photorealistic landscape design of {subject}, the yard and garden transformed into a beautiful tidy green space while preserving the exact same house, boundaries and camera angle, only greenery and paths refreshed, bright natural daylight, {negative}"
anti_patterns: ["changing the house structure", "moving the building", "different property boundaries", "different camera angle", "unrealistic exotic plants out of climate", "flooding the scene with random objects", "people appearing", "distorted perspective"]
default_negative: "changed house, altered building, moved structure, different boundaries, distorted perspective, warped geometry, unrealistic plants, hallucinated objects, cartoon, illustration, 3D render cartoonish, blurry, low quality, watermark, text, extra people"
color_palette:
  - { name: "Fresh Lawn", hex: "#4F8A3D", role: "Manicured grass" }
  - { name: "Deep Foliage", hex: "#2F5A2A", role: "Trees and shrubs" }
  - { name: "Warm Stone", hex: "#C9BCA3", role: "Walkway and features" }
  - { name: "Bloom Accent", hex: "#D98BB0", role: "Flower highlights" }
  - { name: "Sky Blue", hex: "#AFD3E8", role: "Bright daylight sky" }
  - { name: "Earth Brown", hex: "#6B5238", role: "Soil and mulch beds" }
visual_elements:
  - "Exact same house, property boundaries and camera angle as the input"
  - "Healthy, manicured lawn and well-arranged trees and shrubs"
  - "Clean walkways and tasteful small garden features"
  - "Climate-appropriate, realistic plant choices"
  - "Bright natural daylight with realistic outdoor shadows"
  - "Consistent perspective and framing with the original"
style_rules_do:
  - "Preserve the exact house, boundaries and camera angle"
  - "Transform only the greenery, paths and garden features"
  - "Use realistic, climate-appropriate plants and materials"
  - "Keep the composition balanced and buildable"
  - "Maintain photorealistic natural daylight"
style_rules_dont:
  - "Do not change or move the house or the property boundaries"
  - "Do not alter the camera angle or perspective"
  - "Avoid unrealistic exotic or oversized plants"
  - "Do not clutter the scene with random objects"
  - "No hallucinated structures, people, or distorted geometry"
best_for:
  - "Thiết kế sân vườn, cảnh quan biệt thự, sân trước/sau"
  - "Ảnh 'trước → sau' cải tạo cảnh quan"
  - "Tư vấn landscape, nhà vườn, khu nghỉ dưỡng"
  - "Nội dung viral biến hoá sân vườn TikTok/Reels"
---

# Thiết kế sân vườn (Garden & Landscape Design)

Preset i2i biến sân/vườn/cảnh quan quanh nhà thành không gian xanh gọn đẹp mà **giữ nguyên ngôi nhà,
ranh giới đất và góc chụp** — chỉ thay đổi phần cảnh quan (cỏ, cây, lối đi, tiểu cảnh). Ưu tiên cây
hợp khí hậu và phối cảnh đúng để kết quả khả thi.
