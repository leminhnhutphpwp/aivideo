---
mode: image
surface: image
id: cai-tao-ngoai-that
label: Cải tạo ngoại thất
label_en: Exterior Renovation
description: "Cải tạo mặt tiền/ngoại thất ngôi nhà theo hướng hiện đại, khang trang — sơn mới, ốp vật liệu, cảnh quan gọn — nhưng GIỮ NGUYÊN khối nhà, số tầng, vị trí cửa và góc chụp gốc."
example_prompt: "renovate the exterior of this house into a clean modern look, keep the exact same building structure, number of floors, window and door positions, roofline and camera angle, only upgrade the surfaces: fresh modern paint, updated facade materials, neat landscaping and clean driveway, photorealistic, bright natural daylight"
example_prompt_vi: "cải tạo ngoại thất ngôi nhà này thành phong cách hiện đại sạch đẹp, giữ NGUYÊN khối nhà, số tầng, vị trí cửa sổ và cửa, dáng mái và góc chụp, chỉ nâng cấp bề mặt: sơn hiện đại mới, ốp vật liệu mặt tiền, cảnh quan gọn gàng và lối vào sạch, chân thực, ánh sáng ban ngày sáng tự nhiên"
aspect_hints: ["4:3", "16:9", "1:1"]
mood_tones: ["Happy", "Natural", "Peaceful"]
style_keywords: ["modern exterior renovation", "preserve building structure", "same floors and openings", "fresh modern paint", "updated facade materials", "neat landscaping", "clean driveway", "photorealistic", "bright natural daylight", "curb appeal", "architectural fidelity", "before-after renovation", "same camera angle"]
prompt_template: "photorealistic exterior renovation of {subject}, upgraded to a clean modern look while preserving the exact same building structure, floors, openings, roofline and camera angle, only surfaces and landscaping refreshed, bright natural daylight, {negative}"
anti_patterns: ["changing the building structure", "adding or removing floors", "moving windows or doors", "different roofline", "different camera angle", "a completely different house", "distorted geometry", "people appearing"]
default_negative: "different building, changed structure, added or removed floors, moved windows and doors, altered roofline, distorted geometry, warped perspective, hallucinated house, cartoon, illustration, 3D render, blurry, low quality, watermark, text, extra people"
color_palette:
  - { name: "Modern White", hex: "#F2F2EF", role: "Clean facade" }
  - { name: "Charcoal Accent", hex: "#3A3A3A", role: "Trim and frames" }
  - { name: "Warm Wood", hex: "#8A5A34", role: "Facade cladding" }
  - { name: "Bright Daylight", hex: "#FFFBEF", role: "Natural light" }
  - { name: "Fresh Lawn", hex: "#4F8A3D", role: "Landscaping" }
  - { name: "Stone Grey", hex: "#9A968E", role: "Driveway and paths" }
visual_elements:
  - "Exact same building volume, floors and opening positions as the input"
  - "Fresh modern paint and updated facade cladding materials"
  - "Neat, contemporary landscaping and a clean driveway"
  - "Consistent roofline and camera framing with the original"
  - "Bright, even natural daylight and clean shadows"
  - "Photorealistic materials with realistic texture"
style_rules_do:
  - "Preserve the exact building structure, floors, openings and camera angle"
  - "Modernize only the surfaces, materials and landscaping"
  - "Keep the roofline and proportions consistent with the input"
  - "Use realistic, buildable modern materials and colors"
  - "Maintain bright photorealistic natural lighting"
style_rules_dont:
  - "Do not change the number of floors or the building footprint"
  - "Do not move, add, or remove windows and doors"
  - "Do not alter the camera angle or replace the house"
  - "Avoid unrealistic or unbuildable facade elements"
  - "No hallucinated structures, people, or distorted geometry"
best_for:
  - "Tư vấn cải tạo mặt tiền nhà phố, biệt thự, nhà cấp 4"
  - "Ảnh 'trước → sau' nâng cấp ngoại thất hiện đại"
  - "Môi giới bất động sản, nhà thầu xây dựng, KTS"
  - "Nội dung viral cải tạo nhà TikTok/Reels"
---

# Cải tạo ngoại thất (Exterior Renovation)

Preset i2i nâng cấp mặt tiền/ngoại thất theo hướng **hiện đại, khang trang** nhưng **giữ nguyên khối
nhà, số tầng, vị trí cửa, dáng mái và góc chụp**. Khác "Phục chế nhà cổ" (trung thực bản gốc): preset
này cho phép **đổi phong cách bề mặt** hiện đại, hợp tư vấn cải tạo bất động sản.
