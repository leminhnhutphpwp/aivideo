---
mode: image
surface: image
id: nang-cap-thien-nhien
label: Nâng cấp cảnh thiên nhiên
label_en: Nature Scenery Enhancement
description: "Nâng cấp/phục hồi ảnh phong cảnh thiên nhiên — trời trong, cây xanh tươi, nước trong, ánh sáng đẹp — GIỮ NGUYÊN bố cục, địa hình và góc chụp gốc, chỉ cải thiện chất lượng, màu sắc và sức sống của cảnh."
example_prompt: "enhance this natural landscape photo into a vivid, beautiful scene, keep the exact same composition, terrain, horizon and camera angle, only improve quality and vibrancy: clear bright sky, lush healthy greenery, clean clear water, balanced natural colors and beautiful natural light, photorealistic, high dynamic range without oversaturation"
example_prompt_vi: "nâng cấp ảnh phong cảnh thiên nhiên này thành cảnh sống động, đẹp, giữ NGUYÊN bố cục, địa hình, đường chân trời và góc chụp, chỉ cải thiện chất lượng và sức sống: trời trong sáng, cây xanh tươi khoẻ, nước trong sạch, màu tự nhiên cân bằng và ánh sáng đẹp, chân thực, dải tương phản rộng nhưng không quá bão hoà"
aspect_hints: ["16:9", "4:3", "1:1"]
mood_tones: ["Peaceful", "Natural", "Happy"]
style_keywords: ["nature scenery enhancement", "preserve composition and terrain", "clear bright sky", "lush healthy greenery", "clean clear water", "balanced natural colors", "beautiful natural light", "photorealistic", "high dynamic range", "landscape photography", "true-to-scene fidelity", "before-after enhancement", "same camera angle"]
prompt_template: "photorealistic enhancement of {subject}, the natural scenery made vivid and beautiful while preserving the exact same composition, terrain, horizon and camera angle, only quality, color and vibrancy improved, beautiful natural light, {negative}"
anti_patterns: ["changing the terrain or landforms", "moving mountains or rivers", "different composition", "different camera angle", "oversaturated unnatural colors", "adding fake landmarks", "surreal fantasy elements", "people appearing"]
default_negative: "changed terrain, altered landforms, different composition, moved mountains or water, distorted perspective, oversaturated, unnatural colors, fantasy elements, fake landmarks, hallucinated objects, cartoon, illustration, blurry, low quality, watermark, text, extra people"
color_palette:
  - { name: "Clear Sky", hex: "#9EC9E6", role: "Bright sky" }
  - { name: "Lush Green", hex: "#3E7A3A", role: "Healthy foliage" }
  - { name: "Clear Water", hex: "#5FA3B0", role: "Clean water" }
  - { name: "Golden Light", hex: "#FBE2A6", role: "Natural sunlight" }
  - { name: "Earth Tone", hex: "#8A6B4A", role: "Soil and rock" }
  - { name: "Deep Shadow", hex: "#2A3428", role: "Depth and contrast" }
visual_elements:
  - "Exact same composition, terrain, horizon and camera angle as the input"
  - "Clear, bright sky with realistic clouds"
  - "Lush, healthy greenery and clean clear water"
  - "Balanced natural colors with realistic contrast"
  - "Beautiful natural light matching the scene's time of day"
  - "Photorealistic detail with high but natural dynamic range"
style_rules_do:
  - "Preserve the exact composition, terrain and camera angle"
  - "Improve only quality, clarity, color and vibrancy"
  - "Keep colors natural and believable for the location"
  - "Enhance light and atmosphere realistically"
  - "Maintain photorealistic landscape detail"
style_rules_dont:
  - "Do not change the terrain, landforms, or composition"
  - "Do not move mountains, rivers, or the horizon"
  - "Do not oversaturate or apply unnatural color grading"
  - "Avoid fantasy elements or fake landmarks"
  - "No hallucinated objects, people, or distorted geometry"
best_for:
  - "Phục hồi/nâng cấp ảnh phong cảnh, du lịch, thiên nhiên"
  - "Ảnh 'trước → sau' làm đẹp cảnh quan tự nhiên"
  - "Nội dung du lịch, homestay, khu nghỉ dưỡng"
  - "Nội dung viral cảnh đẹp thiên nhiên TikTok/Reels"
---

# Nâng cấp cảnh thiên nhiên (Nature Scenery Enhancement)

Preset i2i làm đẹp/phục hồi ảnh phong cảnh thiên nhiên (trời, cây, nước, ánh sáng) mà **giữ nguyên
bố cục, địa hình và góc chụp** — chỉ cải thiện chất lượng và sức sống. Tránh bão hoà và yếu tố giả
tưởng để cảnh vẫn tự nhiên, đáng tin.
