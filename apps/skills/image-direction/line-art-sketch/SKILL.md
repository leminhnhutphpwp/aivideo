---
mode: image
surface: image
id: line-art-sketch
label: "Line Art & Ký họa"
label_en: "Line Art & Sketch"
description: "Vẽ nét tay bằng mực và bút chì — đường viền dứt khoát, cross-hatching và stippling tạo sắc độ, chủ yếu đơn sắc trên nền giấy trắng."
example_prompt: "detailed pen-and-ink line drawing of a blooming magnolia branch, confident varied-weight contour lines describing each petal and leaf, delicate cross-hatching in the shadowed undersides, fine stippling on the central stamen for tonal depth, crisp black ink on warm off-white paper with subtle grain, generous white space around the composition, botanical illustration precision, hand-drawn sketchbook aesthetic, monochrome, no color"
example_prompt_vi: "tranh ký họa mực nét chi tiết một nhành mộc lan đang nở, đường viền nét đậm nhạt biến đổi mô tả từng cánh hoa và chiếc lá, cross-hatching tinh tế ở mặt dưới bóng, chấm stippling mảnh trên nhị hoa để tạo chiều sâu sắc độ, mực đen sắc nét trên giấy trắng ngà ấm có vân nhẹ, khoảng trắng rộng quanh bố cục, độ chính xác của minh họa thực vật học, thẩm mỹ sổ tay ký họa vẽ tay, đơn sắc, không màu"
aspect_hints: ["1:1", "4:3", "3:4", "16:9"]
mood_tones: ["Artistic", "Calm", "Elegant", "Expressive"]
style_keywords: ["line art", "pen and ink", "ink drawing", "graphite pencil sketch", "clean linework", "varied line weight", "cross-hatching", "hatching", "stippling", "contour line drawing", "continuous line", "monoline", "gesture drawing", "hand-drawn", "black and white", "monochrome illustration", "sketchbook", "technical pen", "engraving-like linework", "minimal line illustration"]
prompt_template: "detailed line art sketch of {subject}, {style} aesthetic, {mood} mood, confident hand-drawn linework with varied line weight, ink and graphite on paper, cross-hatching and stippling for shading, monochrome black on off-white paper, clean negative space, {negative}"
anti_patterns: ["photorealistic", "full color", "painterly", "3D render", "gradient shading", "airbrush", "photograph"]
default_negative: "photorealistic, photograph, full color, painterly, oil paint, watercolor wash, 3D render, CGI, smooth gradient shading, airbrush, soft blur, low contrast, muddy overworked lines, blurry, low quality, distorted, watermark, text"
color_palette:
  - { name: "Ink Black", hex: "#1A1A1A", role: "Lines and dark shading" }
  - { name: "Paper Off-White", hex: "#F7F3EA", role: "Paper base and highlights" }
  - { name: "Graphite Gray", hex: "#6B6B6B", role: "Pencil mid-tones" }
  - { name: "Soft Hatch Gray", hex: "#C9C4B8", role: "Light hatching" }
  - { name: "Sepia Ink", hex: "#5B4636", role: "Vintage ink variant" }
  - { name: "Sanguine", hex: "#A0522D", role: "Optional red-chalk accent" }
visual_elements:
  - "Confident contour lines with varied weight to convey depth and form"
  - "Cross-hatching and parallel hatching to build shadow and volume"
  - "Stippling (dot shading) for soft gradient-free tonal transitions"
  - "White paper preserved for highlights and breathing space"
  - "Subtle paper grain and sketchbook texture beneath the strokes"
  - "Loose construction or gesture lines for spontaneity (optional)"
style_rules_do:
  - "Vary line weight — heavier for contours and shadows, lighter for detail"
  - "Build tone with hatching, cross-hatching, or stippling, never smooth gradients"
  - "Reserve the white of the paper for highlights"
  - "Keep strokes confident and economical — suggest form, do not over-render"
  - "Emphasize a clear silhouette and readable contours"
style_rules_dont:
  - "Avoid full-color or painterly rendering"
  - "No smooth digital gradient or airbrush shading"
  - "Do not overwork the drawing into muddy, tangled lines"
  - "Avoid photographic realism and 3D render depth"
  - "No cluttered, busy backgrounds competing with the linework"
best_for:
  - "Coloring book pages and clean line illustration"
  - "Tattoo flash and line-based logo concepts"
  - "Storyboard, concept, and character construction sketches"
  - "Editorial spot illustration and book decorations"
  - "Botanical, architectural, and technical line drawings"
  - "Fashion croquis and figure studies"
---
# Line Art & Ký họa (Line Art & Sketch)
Phong cách vẽ nét tay bằng mực và bút chì với đường viền dứt khoát, độ đậm nhạt của nét thay đổi để tả khối, và sắc độ được xây bằng cross-hatching hoặc stippling thay vì gradient. Chủ yếu đơn sắc (đen trên giấy trắng ngà), giữ khoảng trắng làm điểm sáng. Khác với **Màu nước** và **Tranh sơn dầu** (thiên về mảng màu, painterly) — preset này tập trung vào NÉT. Phù hợp cho line illustration, tattoo, storyboard, minh họa thực vật/kiến trúc và ký họa nhân vật.
