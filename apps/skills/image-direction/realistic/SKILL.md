---
mode: image
surface: image
id: realistic
label: Chân thực
label_en: Realistic
description: "Nhiếp ảnh chân thực kiểu tư liệu/biên tập — ánh sáng tự nhiên, chi tiết cao, màu trung thực như ảnh chụp thật."
example_prompt: "environmental portrait of a Vietnamese coffee farmer at dawn, weathered hands cradling ripe red coffee cherries against the golden morning light, authentic skin texture with visible pores and fine lines, natural window light from the east illuminating his weathered face, shallow depth of field blurring the terraced plantation behind him, shot on 85mm f/1.4 prime lens, documentary style authenticity, National Geographic editorial quality, true-to-life detail with subtle film grain"
example_prompt_vi: "chân dung môi trường của một nông dân cà phê Việt Nam lúc bình minh, đôi tay chai sạn nâng niu những trái cà phê chín đỏ trong ánh sáng vàng ban mai, kết cấu da chân thực với lỗ chân lông và nếp nhăn nhìn thấy được, ánh sáng cửa sổ tự nhiên từ hướng đông chiếu sáng khuôn mặt dạn dày, độ sâu trường ảnh nông làm mờ đồn điền bậc thang phía sau, chụp bằng ống kính 85mm f/1.4, phong cách tư liệu chân thực, chất lượng biên tập National Geographic, chi tiết như thật với hạt phim nhẹ"
aspect_hints: ["1:1", "16:9", "4:3"]
mood_tones: ["Natural", "Peaceful", "Dramatic", "Happy"]
style_keywords: ["photorealistic", "hyper-detailed", "sharp focus", "natural lighting", "lifelike textures", "candid photography", "35mm full frame", "ultra realistic skin", "environmental portrait", "authentic colors", "subtle grain", "golden ratio composition", "macro detail", "true-to-life", "ambient occlusion", "realistic shadows", "unposed natural", "documentary style"]
prompt_template: "photorealistic image of {subject}, {style} aesthetic, {mood} atmosphere, hyper-detailed textures, natural lighting with soft shadows, sharp focus on the subject, 35mm full frame camera, lifelike colors, documentary style authenticity, true-to-life detail with subtle film grain, {negative}"
anti_patterns: ["cartoon", "anime", "illustration", "painting", "3D render", "stylized"]
default_negative: "cartoon, anime, illustration, painting, 3D render, stylized, blurry, low quality, distorted, watermark, text, logo, unrealistic, oversaturated, plastic skin"
color_palette:
  - { name: "Natural Skin", hex: "#E8B4A2", role: "Realistic skin tones" }
  - { name: "True White", hex: "#F5F5F5", role: "Natural highlights" }
  - { name: "Deep Shadow", hex: "#1A1A1A", role: "Rich blacks" }
  - { name: "Mid Gray", hex: "#808080", role: "Neutral midtones" }
  - { name: "Warm Sunlight", hex: "#FFF4E0", role: "Golden hour natural" }
  - { name: "Cool Ambient", hex: "#D4E4F0", role: "Shade and window light" }
visual_elements:
  - "Photorealistic skin texture with visible pores and micro details"
  - "Natural environmental lighting with realistic shadow falloff"
  - "Shallow depth of field with smooth bokeh on background"
  - "True-to-life fabric textures, hair strands, and material surfaces"
  - "Subtle lens characteristics: micro contrast, edge sharpness"
  - "Authentic color reproduction without artistic grading"
style_rules_do:
  - "Prioritize realistic lighting over dramatic effects"
  - "Keep skin tones natural without excessive retouching"
  - "Use subtle grain at low ISO for film-like authenticity"
  - "Maintain sharp focus on subject eyes and key details"
  - "Employ natural posing and candid expressions"
style_rules_dont:
  - "Avoid any cartoon, anime, or illustrative rendering"
  - "No plastic or wax-like skin textures"
  - "Don't use HDR or over-processed tonemapping"
  - "Avoid CGI or 3D render aesthetic"
  - "No exaggerated color saturation or contrast"
best_for:
  - "Product photography for e-commerce and catalogs"
  - "Professional headshots and corporate portraits"
  - "Real estate and architectural photography"
  - "Food photography for menus and advertising"
  - "Documentary and journalistic images"
  - "Lifestyle and candid street photography"
---

# Chân thực (Realistic)

Phong cách nhiếp ảnh chân thực với độ chi tiết cao, ánh sáng tự nhiên và màu sắc trung thực, thiên hướng tư liệu/biên tập (documentary, editorial). Phù hợp cho ảnh sản phẩm, chân dung, và nội dung cần tính xác thực cao.

Phân biệt với hai preset gần: **Siêu thực (Photorealism)** nhắm tới độ chi tiết macro/hyperreal cấp render (ray tracing, subsurface scattering) — chọn khi cần "không thể phân biệt với ảnh chụp"; **Ảnh thật (Natural Photo)** nhắm tới cảm giác ảnh đời thường, ngẫu hứng như người thật chụp — chọn cho ads/social cần tránh vẻ "ảnh AI". Preset **Chân thực** này là lựa chọn giữa: nhiếp ảnh chuyên nghiệp, tự nhiên, đáng tin kiểu phóng sự/biên tập.
