---
mode: image
surface: image
id: natural-photo
label: "Ảnh thật (không giống AI)"
label_en: "Natural Photo"
featured: true
description: "Ảnh trông như người thật chụp — đời thường, ánh sáng tự nhiên, hạt phim nhẹ, da có kết cấu thật, không bóng bẩy kiểu AI. Hợp chạy ads & social cần cảm giác đáng tin."
example_prompt: "candid photo of a young office worker glancing up from her laptop in a sunlit co-working space, soft window light from the side, natural skin texture with a few freckles and faint under-eye shadow, a stray strand of hair across her cheek, slightly off-center framing, shallow background blur of plants and a coffee cup, subtle 35mm film grain, true-to-life muted colors, looks like an unposed photograph taken by a colleague"
example_prompt_vi: "ảnh chụp tự nhiên một nữ nhân viên văn phòng trẻ ngước lên khỏi laptop trong không gian co-working ngập nắng, ánh sáng cửa sổ dịu chiếu xiên, da chân thực với vài tàn nhang và quầng mắt mờ, một lọn tóc vương qua má, khung hình hơi lệch tâm, hậu cảnh mờ nhẹ với cây xanh và ly cà phê, hạt phim 35mm nhẹ, màu trầm như thật, trông như ảnh chụp ngẫu hứng do đồng nghiệp chụp"
aspect_hints: ["4:3", "3:2", "1:1", "16:9"]
mood_tones: ["Natural", "Candid", "Warm", "Peaceful"]
style_keywords: ["candid", "natural light", "film grain", "natural skin texture", "unposed", "authentic", "35mm film", "available light", "photojournalistic", "slightly imperfect framing", "true colors", "everyday moment", "no retouching", "realistic imperfections", "shallow depth of field", "documentary snapshot", "shot on phone", "handheld"]
prompt_template: "candid photo of {subject}, {mood} mood, natural available light with soft uneven shadows, authentic skin texture with visible pores, subtle 35mm film grain, slightly imperfect off-center framing, true-to-life muted colors, unposed everyday moment, looks like a real photograph taken by a person, {negative}"
anti_patterns: ["AI-generated look", "CGI", "3D render", "plastic skin", "airbrushed", "oversaturated", "HDR", "studio-perfect", "overly sharp", "illustration"]
default_negative: "AI-generated, CGI, 3D render, plastic skin, waxy skin, airbrushed, over-retouched, oversaturated, HDR, overly sharp, glossy, perfect symmetry, studio-perfect lighting, beauty filter, illustration, cartoon, anime, painting, watermark, text, logo, deformed hands, extra fingers"
color_palette:
  - { name: "Natural Skin", hex: "#E0B098", role: "True-to-life skin" }
  - { name: "Warm Daylight", hex: "#F3E6D0", role: "Window / available light" }
  - { name: "Muted Shadow", hex: "#2B2622", role: "Soft natural shadow" }
  - { name: "Faded White", hex: "#ECECE6", role: "Real, slightly-off highlights" }
  - { name: "Desaturated Green", hex: "#7C8A6A", role: "Ambient indoor plants" }
  - { name: "Denim Blue", hex: "#5B6B82", role: "Everyday clothing tone" }
visual_elements:
  - "Subtle 35mm film grain and natural sensor noise"
  - "Real skin texture: pores, fine lines, slight redness, no airbrushing"
  - "Available light with natural, sometimes uneven shadows"
  - "Slightly off-center, candid, snapshot-like composition"
  - "Shallow but imperfect focus with natural background blur"
  - "True-to-life muted colors without heavy grading"
style_rules_do:
  - "Add subtle film grain for authentic texture"
  - "Keep skin natural with visible texture and zero retouching"
  - "Use available natural light even if slightly uneven"
  - "Frame candidly, a little off-center, like a real snapshot"
  - "Allow minor imperfections: soft focus, slight motion, natural blemishes"
style_rules_dont:
  - "Avoid CGI, 3D render, or AI-generated gloss"
  - "No plastic, waxy, or airbrushed skin"
  - "Don't use HDR, oversaturation, or heavy color grading"
  - "Avoid perfect symmetry and studio-perfect lighting"
  - "No exaggerated sharpness or 8K hyper-detail"
best_for:
  - "Quảng cáo / ads cần cảm giác thật và đáng tin"
  - "Social content, UGC, lifestyle, testimonial"
  - "Chân dung đời thường, behind-the-scenes"
  - "Sản phẩm đặt trong bối cảnh sử dụng thật"
  - "Nội dung cần tránh cảm giác 'ảnh AI'"
---

# Ảnh thật (Natural Photo)

Phong cách ảnh **đời thường, như người thật chụp** — đối lập với vẻ bóng bẩy "giả trân" của ảnh AI. Ưu tiên ánh sáng tự nhiên, hạt phim nhẹ, da có kết cấu thật và một chút khuyết điểm có chủ đích (khung hình hơi lệch, lấy nét mềm). Khác với **Chân thực** (editorial/tư liệu chuyên nghiệp) và **Siêu thực** (macro hyperreal): preset này nhắm tới cảm giác ảnh chụp ngẫu hứng đáng tin, lý tưởng cho quảng cáo và social.
