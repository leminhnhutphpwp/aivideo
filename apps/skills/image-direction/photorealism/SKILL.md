---
mode: image
surface: image
id: photorealism
label: "Siêu thực"
label_en: "Photorealism"
description: "Ảnh siêu thực, không thể phân biệt với ảnh chụp thật."
example_prompt: "hyperrealistic macro photograph of a single morning dewdrop perched on a green Monstera leaf edge, sunlight creating rainbow-like chromatic aberration through the droplet's curved meniscus, surface tension detail resolving microscopic dust particles floating inside the water sphere, individual chloroplast structures visible through the translucent leaf tissue, natural bokeh circles from backlit dewdrops in the distant background, shot on full-frame sensor with 100mm f/2.8 macro lens at f/5.6 ISO 100, indistinguishable from a real photograph, true-to-life micro detail with subtle film grain"
example_prompt_vi: "ảnh macro siêu thực một giọt sương ban mai đọng trên mép lá Monstera xanh, ánh nắng tạo quang sai cầu vồng qua mặt cong của giọt nước, chi tiết sức căng bề mặt hiển thị các hạt bụi siêu nhỏ trôi trong quả cầu nước, cấu trúc lục lạp riêng lẻ nhìn thấy qua mô lá trong suốt, vòng tròn bokeh tự nhiên từ các giọt sương ngược sáng ở hậu cảnh xa, chụp bằng cảm biến full-frame với ống macro 100mm f/2.8 ở f/5.6 ISO 100, không thể phân biệt với ảnh chụp thật, chi tiết vi mô như thật với hạt phim nhẹ"
aspect_hints: ["16:9", "1:1", "4:3"]
mood_tones: ["Natural", "Dramatic", "Peaceful", "Mysterious"]
style_keywords: ["photorealistic", "hyperrealistic", "ultra detailed", "lifelike", "true to life", "indistinguishable from photo", "microscopic detail", "subtle film grain", "natural lighting", "real-camera optics", "subsurface scattering", "realistic materials", "physical camera", "shallow depth of field", "natural bokeh", "full frame sensor", "prime lens quality", "true-to-life detail"]
prompt_template: "photorealistic image of {subject}, {style} aesthetic, {mood} atmosphere, hyperrealistic detail, indistinguishable from a real photograph, natural light with realistic bounce, subsurface scattering on organic surfaces, realistic material properties, physical camera with prime lens, subtle film grain, true-to-life micro detail, {negative}"
anti_patterns: ["cartoon", "anime", "illustration", "painting", "3D render look", "stylized", "low poly"]
default_negative: "cartoon, anime, illustration, painting, 3D render look, stylized, low poly, blurry, low quality, distorted, watermark, text, logo, plastic, unnatural, CGI, game asset"
color_palette:
  - { name: "True White", hex: "#FFFFFF", role: "Pure highlights" }
  - { name: "Absolute Black", hex: "#000000", role: "Deep shadows" }
  - { name: "Neutral Gray", hex: "#808080", role: "Midtone reference" }
  - { name: "Skin Tone", hex: "#D4A574", role: "Natural skin" }
  - { name: "Sky Blue", hex: "#87CEEB", role: "Daylight sky" }
  - { name: "Foliage Green", hex: "#4A7C59", role: "Natural vegetation" }
visual_elements:
  - "Natural light with realistic bounce and soft falloff"
  - "Subsurface scattering on skin, leaves, and translucent materials"
  - "Microscopic surface detail: pores, dust, scratches, fabric weave"
  - "Physical camera effects: depth of field, lens distortion, chromatic aberration"
  - "Realistic material properties: metal, glass, fabric, wood, stone"
  - "Natural environmental lighting with accurate color temperature"
style_rules_do:
  - "Render with physics-based lighting and materials"
  - "Add subtle imperfections: dust, scratches, wear marks"
  - "Use realistic camera settings: f-stop, focal length, ISO"
  - "Include environmental context and ambient details"
  - "Apply subtle post-processing: micro contrast, vignette"
style_rules_dont:
  - "Avoid any stylized, cartoon, or illustrative rendering"
  - "No perfect, unblemished surfaces - everything has texture"
  - "Do not use artificial or studio lighting in outdoor scenes"
  - "Avoid CGI uncanny valley look"
  - "No unrealistic material properties or physics"
best_for:
  - "Architectural visualization and real estate rendering"
  - "Product visualization for e-commerce and catalogs"
  - "Automotive and industrial design presentation"
  - "Virtual photography and digital twin creation"
  - "Scientific and medical visualization"
  - "High-end advertising where realism is critical"
---
# Siêu thực (Photorealism)
Ảnh siêu thực với độ chi tiết cực cao, không thể phân biệt với ảnh chụp thật. Sử dụng kỹ thuật ray tracing, global illumination và vật liệu vật lý chính xác.
