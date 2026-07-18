---
id: product_ads
label: Product Ads
label_en: Product Ads
featured: true
capability: t2v
direction_hints: ["product-reveal"]
mood_hints: ["Energetic", "Peaceful"]
camera_hints: ["Zoom In", "Dolly", "Fixed"]
lighting_hints: ["Studio Soft", "Natural"]
aspect_hints: ["1:1", "16:9"]
duration_hint: "5–15s per scene"
style_keywords: ["product advertising", "commercial", "hero shot", "feature demonstration", "benefit focused", "comparison", "unboxing", "macro detail", "floating product", "clean background", "e-commerce", "conversion", "purchase intent", "spec callout", "studio quality"]
prompt_template: "product advertisement for {video_type}, {direction} direction, {mood} mood, {camera} camera, {lighting} lighting, hero product showcase, key feature demonstration, clean commercial presentation, benefit-focused messaging, {negative}"
anti_patterns: ["cluttered background", "distracting elements", "unclear product", "competitor logos", "unflattering angles", "dark underexposed"]
default_negative: "cluttered, distracting, competitor, unflattering, dark, underexposed, text overlay, watermark, amateur, messy, busy background, hands blocking"
example_prompt: "hero product video of a minimalist smartwatch floating against a pure black background, camera slowly orbits 360 degrees revealing the curved sapphire glass and titanium casing, macro cut to the heart rate sensor flashing green, then a quick UI demonstration showing the watch face transitioning through workout modes, ending on the product name and price in clean typography, studio lighting with controlled reflections, 4K, 12 seconds"
example_prompt_vi: "video sản phẩm hero một chiếc đồng hồ thông minh tối giản lơ lửng trên nền đen tuyền, máy quay từ từ quay quanh 360 độ để lộ mặt kính sapphire cong và vỏ titan, cắt macro sang cảm biến nhịp tim nhấp nháy xanh, rồi demo UI nhanh cho thấy mặt đồng hồ chuyển qua các chế độ tập luyện, kết thúc với tên sản phẩm và giá bằng typography sạch, ánh sáng studio với phản chiếu kiểm soát, 4K, 12 giây"
best_for:
  - "E-commerce product listing videos"
  - "Social media product ads and carousels"
  - "Product feature and specification demonstrations"
  - "Comparison and versus videos"
when_to_use:
  - "Cần video tập trung vào sản phẩm, không cầu kỳ"
  - "Quảng cáo sản phẩm trên sàn thương mại điện tử"
  - "Demo tính năng, so sánh sản phẩm"
template_flows:
  - name: "Sản phẩm TMĐT nổi bật"
    description: "4 cảnh hero sản phẩm thương mại điện tử: xoay 360 độ, cận cảnh chất liệu, demo tính năng, hero kết thúc với giá"
    direction: "product-reveal"
    scenes:
      - prompt: "the product floats perfectly centered against a pure white infinity background with zero shadows on the floor, the camera performs a slow 360-degree orbital rotation at eye level revealing the product from every angle, premium studio lighting with a large softbox from above creating a subtle gradient on the curved surfaces, a gentle rim light separates the product edges from the background with a hairline white glow, the rotation is silky smooth at one revolution per six seconds allowing viewers to inspect every detail, the product appears to defy gravity in a pristine commercial presentation, high-end e-commerce photography aesthetic applied to motion"
        duration_seconds: 8
        style: "Realistic"
        mood: "Peaceful"
        camera: "Dolly"
        lighting: "Studio Soft"
        aspect_ratio: "1:1"
        narration: ""
      - prompt: "extreme macro close-up shot traveling slowly across the product surface revealing premium materials and manufacturing quality, the camera moves like a microscope across brushed metal textures with each fine line catching individual specular highlights, transitions to a cross-section of layered materials with a subtle X-ray-style reveal animation, a single water droplet beads and rolls across the surface demonstrating hydrophobic coating properties, the depth of field is razor-thin creating dramatic focus pulls between the foreground texture and the defocused product silhouette behind, scientific precision lighting with no reflections or hot spots"
        duration_seconds: 7
        style: "Realistic"
        mood: "Peaceful"
        camera: "Zoom In"
        lighting: "Studio Soft"
        aspect_ratio: "1:1"
        narration: ""
      - prompt: "lifestyle demonstration scene of a person's hands interacting with the product in a modern bright kitchen with marble countertops and fresh herbs in the background, the hands perform the key product action — pressing a button and watching the LED indicator glow blue, then pouring liquid from the product into a glass with perfect controlled flow, morning sunlight streams through a nearby window creating natural lens flares, the person's minimalist gold jewelry adds aspirational lifestyle context, a quick cut to an over-the-shoulder shot showing the product integrated naturally into the daily routine, warm inviting atmosphere that makes the viewer imagine owning it"
        duration_seconds: 10
        style: "Realistic"
        mood: "Peaceful"
        camera: "Fixed"
        lighting: "Natural"
        aspect_ratio: "1:1"
        narration: ""
      - prompt: "final hero composition — the product settles into its hero position centered on a subtle reflective surface, animated spec callout lines extend from key features with clean minimalist text labels appearing in sequence, the product name slides in from below with elegant typography and the price displays prominently with a subtle pulsing glow, the background transforms from white to a premium gradient matching the brand's color palette, particles of light orbit the product slowly like a gentle constellation, the camera holds perfectly still for the final three seconds allowing the viewer to absorb all product information, premium unboxing-meets-commercial quality"
        duration_seconds: 9
        style: "Realistic"
        mood: "Energetic"
        camera: "Fixed"
        lighting: "Studio Soft"
        aspect_ratio: "1:1"
        narration: ""
    edges:
      - { from: 1, to: 2, label: "" }
      - { from: 2, to: 3, label: "" }
      - { from: 3, to: 4, label: "" }

  - name: "Demo tính năng"
    description: "3 cảnh demo tính năng sản phẩm: giới thiệu vấn đề, giải pháp với tính năng chính, kết quả so sánh"
    direction: "product-reveal"
    scenes:
      - prompt: "dramatic opening shot showing a common frustration scenario — a person at a desk with multiple tangled charging cables, messy workspace with papers scattered, their expression conveying mild stress and exhaustion, the lighting is slightly dim and the color grade has a cool blue tint emphasizing the problem state, the camera slowly pushes in on their tired face as they look at their dead phone battery with 1 percent remaining, a red warning icon flashes on the phone screen, the framing is tight and claustrophobic to make the viewer feel the tension, the scene communicates a pain point everyone recognizes immediately"
        duration_seconds: 7
        style: "Realistic"
        mood: "Melancholic"
        camera: "Zoom In"
        lighting: "Natural"
        aspect_ratio: "16:9"
        narration: ""
      - prompt: "the scene transforms as the hero product enters frame — a sleek wireless charging station placed on the desk — the lighting instantly brightens and warms, the person's expression shifts to relief and delight, they simply place their phone on the charger and it magnetically snaps into perfect alignment with a satisfying click, an animated overlay demonstrates the electromagnetic field pulsing outward in clean concentric rings, the phone screen illuminates showing the charging animation with the battery percentage ticking upward rapidly, the camera dollies around the product capturing the elegant simplicity of the solution, the messy desk background blurs into soft bokeh"
        duration_seconds: 9
        style: "Realistic"
        mood: "Happy"
        camera: "Dolly"
        lighting: "Studio Soft"
        aspect_ratio: "16:9"
        narration: ""
      - prompt: "split-screen comparison finale — the left side shows the old chaotic charging situation in muted cool tones with the person frustrated and the messy desk, the right side shows the new organized setup with the product in warm vibrant tones and the person relaxed and smiling, multiple devices — phone watch earbuds — all charging simultaneously on the single dock, animated text callouts highlight key specs appearing beside each device, a speed comparison meter animates from slow to fast showing the charging speed advantage, the split dissolves into a single frame of the product with the tagline and a bold call to action button, clean and confident resolution"
        duration_seconds: 9
        style: "Realistic"
        mood: "Energetic"
        camera: "Fixed"
        lighting: "Studio Soft"
        aspect_ratio: "16:9"
        narration: ""
    edges:
      - { from: 1, to: 2, label: "" }
      - { from: 2, to: 3, label: "" }

  - name: "Quảng cáo sản phẩm mạng xã hội"
    description: "4 cảnh quảng cáo sản phẩm cho mạng xã hội: hook gây tò mò, sản phẩm hero, lifestyle sử dụng, CTA mua hàng"
    direction: "product-reveal"
    scenes:
      - prompt: "vertical format opening with a hand holding the product partially off-screen creating mystery and curiosity, the product slowly slides into frame from the bottom edge against a vibrant gradient background in brand colors, a bold text overlay pops onto screen reading 'THIS CHANGES EVERYTHING' with each word appearing in rapid succession synced to a bass beat, the product catches flash reflections that sweep across its surface like a premium car commercial, energetic pacing with fast cuts between three slightly different angles of the product reveal, the background pulses subtly with the music, mobile-optimized composition with all key elements in the center of the 9:16 frame"
        duration_seconds: 5
        style: "Minimalist"
        mood: "Energetic"
        camera: "Fixed"
        lighting: "Neon"
        aspect_ratio: "9:16"
        narration: ""
      - prompt: "transition to a clean studio product sequence, the product sits on a minimalist white pedestal rotating slowly on a turntable, the camera circles in the opposite direction creating a dynamic parallax effect, macro cuts intersperse showing key features — a close-up of the precision-machined edge catching glints of light, the LED display lighting up with vivid colors, the textured grip surface magnified to show intricate detail, each macro cut lasts exactly one second synced to the beat, floating particles of light drift around the product adding a premium tech feel, the lighting shifts from cool white to warm gold halfway through the rotation"
        duration_seconds: 7
        style: "Realistic"
        mood: "Energetic"
        camera: "Dolly"
        lighting: "Studio Soft"
        aspect_ratio: "9:16"
        narration: ""
      - prompt: "lifestyle montage showing three different diverse users enjoying the product in their authentic environments, a young woman uses it at a trendy co-working café with exposed brick walls and hanging plants, a fitness enthusiast checks it during an outdoor workout at sunrise with the city skyline behind him, a busy mom uses it in her kitchen while preparing breakfast with a toddler in the background, each vignette lasts approximately three seconds with smooth whip-pan transitions between scenes, all three users have genuine joyful expressions and are wearing stylish aspirational outfits, the product is prominently visible in every shot naturally integrated into their hands"
        duration_seconds: 10
        style: "Realistic"
        mood: "Happy"
        camera: "Handheld"
        lighting: "Natural"
        aspect_ratio: "9:16"
        narration: ""
      - prompt: "final conversion frame with the product centered against the same vibrant gradient background, the price appears large and bold with a strikethrough on the old price and the new discounted price flashing, an animated arrow points downward to a shop now button that pulses with a gentle glow effect, limited stock text appears with a countdown-style urgency, the product name and key benefit appear as bullet points swiping in from the left, the frame is optimized for the last second before someone swipes up or clicks, social proof badges appear briefly showing the number of five-star reviews and units sold, high contrast and legible mobile typography throughout"
        duration_seconds: 6
        style: "Minimalist"
        mood: "Energetic"
        camera: "Fixed"
        lighting: "Neon"
        aspect_ratio: "9:16"
        narration: ""
    edges:
      - { from: 1, to: 2, label: "" }
      - { from: 2, to: 3, label: "" }
      - { from: 3, to: 4, label: "" }

  - name: "So sánh trước và sau"
    description: "3 cảnh so sánh trước sau: tình trạng cũ, khoảnh khắc chuyển đổi, kết quả mới — trực quan thuyết phục"
    direction: "product-reveal"
    scenes:
      - prompt: "the before state presented in a documentary side-by-side format, on the left an outdated bulky product version sits on a desk — its design looks dated with dull colors visible scratches and a thick bezel around the display, the lighting is flat and unflattering with a slight blue cast making everything look washed out and tired, a person's hand interacts with it showing slow unresponsive touchscreen input and a laggy animation, text overlay appears labeling it 'BEFORE' in small gray font, the overall mood is frustrated and disappointing, the camera is locked off on a tripod emphasizing the static stagnant nature of the old product experience"
        duration_seconds: 7
        style: "Realistic"
        mood: "Melancholic"
        camera: "Fixed"
        lighting: "Natural"
        aspect_ratio: "16:9"
        narration: ""
      - prompt: "dramatic transition sequence beginning with a hand sweeping across the frame from left to right like a magician revealing a transformation, the lighting shifts dramatically from flat blue to warm golden studio quality, the old product dissolves away as the new sleek version appears in its place with a subtle particle effect transition, the camera performs a slow dolly push-in on the new product emphasizing the dramatic difference in design — thinner bezels, richer colors, premium materials, the touchscreen now responds instantly with smooth animations and vibrant interface, the hand gesture and camera movement create a satisfying before-and-after reveal moment that feels almost physical"
        duration_seconds: 6
        style: "Realistic"
        mood: "Energetic"
        camera: "Dolly"
        lighting: "Studio Soft"
        aspect_ratio: "16:9"
        narration: ""
      - prompt: "final split-screen comparison holding both products in frame equally — left side shows the old product dim and frozen, right side shows the new product vibrant and active — key specification callouts appear on each side with improvement percentages highlighted in green, the new product's side slowly expands taking over more of the frame while the old product shrinks and fades, ending with the new product filling the screen completely in a hero composition, a final text overlay summarizes the three biggest improvements in clean bold typography, the product name and price anchor the bottom, the frame communicates absolute victory with confident premium energy"
        duration_seconds: 8
        style: "Realistic"
        mood: "Energetic"
        camera: "Fixed"
        lighting: "Studio Soft"
        aspect_ratio: "16:9"
        narration: ""
    edges:
      - { from: 1, to: 2, label: "" }
      - { from: 2, to: 3, label: "" }
---

# Product Ads

Quảng cáo sản phẩm tập trung vào hero shot và tính năng, trình bày sạch sẽ chuyên nghiệp. Phù hợp cho e-commerce, social ads, và product demo.

## Hướng dẫn prompt
- Sử dụng direction product-reveal để có phong cách reveal sản phẩm
- Mỗi cảnh tập trung vào một tính năng hoặc góc nhìn sản phẩm
- Nền sạch, ánh sáng studio, không distracting
