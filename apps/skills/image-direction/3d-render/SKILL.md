---
mode: image
surface: image
id: 3d-render
label: "3D Render"
label_en: "3D Render"
description: "Render 3D chất lượng cao kiểu Unreal Engine và Blender."
example_prompt: "Unreal Engine 5 cinematic 3D render of a futuristic sport motorcycle in a neon-drenched cyberpunk garage, ray-traced global illumination bouncing cyan and magenta light off chrome exhaust pipes and carbon fiber body panels, volumetric fog swirling around the tires reflecting the underglow, physically based rendering on brushed aluminum fuel tank with realistic anisotropy, particle effects of floating dust motes caught in god rays from overhead industrial lights, cinematic depth of field at f/2.8, 8K render with subsurface scattering on custom leather seat, hyper-detailed mechanical components visible through transparent engine casing"
example_prompt_vi: "render 3D điện ảnh Unreal Engine 5 một chiếc mô tô thể thao tương lai trong garage cyberpunk ngập đèn neon, global illumination ray-traced phản chiếu ánh sáng cyan và magenta trên ống xả chrome và tấm thân sợi carbon, sương mù volumetric xoáy quanh lốp phản chiếu underglow, kết xuất vật lý trên bình xăng nhôm chải với anisotropy thực tế, hiệu ứng hạt bụi lơ lửng bắt trong tia sáng từ đèn công nghiệp trên cao, độ sâu trường ảnh điện ảnh ở f/2.8, render 8K với subsurface scattering trên ghế da tùy chỉnh, chi tiết cơ khí siêu nét nhìn thấy qua vỏ động cơ trong suốt"
aspect_hints: ["16:9", "1:1", "4:3"]
mood_tones: ["Dramatic", "Energetic", "Mysterious", "Futuristic"]
style_keywords: ["3D render", "CGI", "Unreal Engine 5", "Blender render", "ray tracing", "global illumination", "physically based rendering", "high poly", "detailed textures", "procedural materials", "volumetric lighting", "ambient occlusion", "depth of field", "motion blur", "particle effects", "subsurface scattering", "displacement mapping", "Cinema 4D quality"]
prompt_template: "high quality 3D render of {subject}, {style} aesthetic, {mood} atmosphere, Unreal Engine 5 quality, physically based rendering, ray traced global illumination, high poly with detailed textures, volumetric lighting, cinematic depth of field, 8K ultra-detailed, {negative}"
anti_patterns: ["2D", "flat", "cartoon", "sketch", "low poly", "pixel art"]
default_negative: "2D, flat, cartoon, sketch, low poly, pixel art, blurry, low quality, distorted, watermark, text, real photograph, grainy, noisy render"
color_palette:
  - { name: "Neon Cyan", hex: "#00F0FF", role: "Sci-fi accents" }
  - { name: "Warm Key", hex: "#FFD700", role: "Key light" }
  - { name: "Cool Fill", hex: "#4A90D9", role: "Fill light" }
  - { name: "Deep Shadow", hex: "#0D1117", role: "Ambient occlusion" }
  - { name: "Metallic Silver", hex: "#C0C0C0", role: "Metal surfaces" }
  - { name: "Emissive Orange", hex: "#FF6B35", role: "Light emission" }
visual_elements:
  - "High poly 3D geometry with smooth subdivision surfaces"
  - "Physically based materials: metal, glass, plastic, fabric"
  - "Volumetric lighting with god rays and atmospheric fog"
  - "Procedural textures with displacement and normal mapping"
  - "Particle effects: dust, sparks, smoke, magical particles"
  - "Cinematic depth of field with smooth bokeh circles"
style_rules_do:
  - "Use PBR materials with proper roughness and metallic maps"
  - "Apply multi-point lighting: key, fill, rim, ambient"
  - "Include subtle imperfections for realism"
  - "Use HDRI environment maps for accurate reflections"
  - "Add post-processing: bloom, chromatic aberration, vignette"
style_rules_dont:
  - "Avoid flat or untextured surfaces"
  - "No low poly or game asset quality unless specified"
  - "Do not forget ambient occlusion - it adds depth"
  - "Avoid harsh, single-source lighting"
  - "No jagged edges or aliasing artifacts"
best_for:
  - "Product visualization and industrial design"
  - "Game cinematic and cutscene key art"
  - "Architectural visualization and interior design"
  - "Motion graphics and title sequence frames"
  - "Concept art for film and game production"
  - "NFT and digital art collectibles"
---
# 3D Render
Render 3D chất lượng cao với vật liệu PBR, global illumination, và volumetric lighting. Phù hợp cho product visualization, game cinematic, và architectural rendering.
