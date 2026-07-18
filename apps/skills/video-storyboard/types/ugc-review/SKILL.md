---
id: ugc_review
label: UGC Review
label_en: UGC Review
featured: true
capability: t2v
direction_hints: ["review", "product-reveal"]
mood_hints: ["Happy", "Energetic"]
camera_hints: ["Handheld", "Fixed", "Zoom In"]
lighting_hints: ["Natural", "Studio Soft"]
aspect_hints: ["16:9", "9:16"]
duration_hint: "3–8s per scene"
style_keywords: ["user generated content", "authentic", "raw footage", "handheld camera", "natural lighting", "real person", "unscripted", "genuine reaction", "social media native", "TikTok style", "Instagram Reel", "vlog aesthetic", "casual tone", "direct address", "product demonstration"]
prompt_template: "authentic UGC-style {video_type} video, {direction} direction, {mood} mood, {camera} camera movement, {lighting} lighting, natural unscripted delivery, handheld feel, genuine reaction, social media native format, {negative}"
anti_patterns: ["polished commercial", "studio produced", "scripted", "corporate tone", "perfect lighting", "tripod static"]
default_negative: "polished, studio, scripted, corporate, overly produced, perfect lighting, tripod, teleprompter, professional voiceover, staged, fake"
example_prompt: "a young woman sitting in her bedroom with natural window light, holding a skincare serum bottle up to the camera, speaking directly to her phone as if on Facetime, casually explaining why she loves the texture after 2 weeks of use, B-roll of her applying one drop to her cheek with genuine surprise at how quickly it absorbs, handheld selfie camera angle throughout"
example_prompt_vi: "một cô gái trẻ ngồi trong phòng ngủ với ánh sáng cửa sổ tự nhiên, cầm chai serum dưỡng da lên trước camera, nói chuyện trực tiếp vào điện thoại như đang Facetime, thản nhiên giải thích tại sao cô thích kết cấu sau 2 tuần sử dụng, chen cảnh B-roll cô thoa một giọt lên má với vẻ ngạc nhiên chân thật khi thấy serum thấm nhanh, góc máy selfie handheld xuyên suốt"
best_for:
  - "Product review and unboxing videos"
  - "Customer testimonial and social proof content"
  - "TikTok and Instagram Reel reviews"
  - "Authentic brand ambassador content"
  - "Before/after product demonstration"
  - "Day-in-the-life vlog with product placement"
when_to_use:
  - "Người xem cần cảm giác chân thực, không quảng cáo"
  - "Sản phẩm cần demo thực tế bởi người dùng thật"
  - "Nội dung mạng xã hội cần tính gần gũi, tin cậy"
template_flows:
  - name: "Đánh giá cơ bản"
    description: "4 cảnh review sản phẩm đơn giản, chân thực: mở đầu gây tò mò, unbox sản phẩm, demo tính năng chính, kết luận chân thành với rating"
    direction: "review"
    scenes:
      - prompt: "handheld selfie shot of a young Vietnamese woman in her cozy sunlit bedroom, morning light streaming through sheer curtains, she looks directly into her phone camera with a curious smile and says into the mic, natural makeup and messy bun hairstyle, she holds up a sealed product box partially off-screen to build suspense, genuine excitement in her eyes, warm natural lighting casting soft shadows on her face, shallow depth of field keeping focus on her expression, vertical phone format"
        duration_seconds: 6
        style: "Realistic"
        mood: "Happy"
        camera: "Handheld"
        lighting: "Natural"
        aspect_ratio: "9:16"
        narration: ""
      - prompt: "overhead POV shot looking down at a minimalist wooden desk, her hands enter frame and carefully peel off the product packaging seal, the box slowly opens to reveal a sleek glass bottle inside, natural daylight from a nearby window creates subtle reflections on the packaging, her fingers gently lift the product out, camera slightly wobbles to reinforce the unscripted feel, authentic ASMR-like sound of paper tearing and glass clicking against the table, warm neutral color palette"
        duration_seconds: 8
        style: "Realistic"
        mood: "Happy"
        camera: "Fixed"
        lighting: "Natural"
        aspect_ratio: "9:16"
        narration: ""
      - prompt: "medium close-up selfie shot of the woman now demonstrating the product, she applies a small amount onto her hand with deliberate slow motion to show texture, her facial expression shifts from curiosity to genuine surprise and delight, she points to the area where the product absorbed quickly leaving a dewy finish, gentle afternoon sunlight creating a soft rim light on her hair, B-roll cutaway of the product texture macro shot with shallow depth of field, her voice continues narrating over the B-roll"
        duration_seconds: 10
        style: "Realistic"
        mood: "Happy"
        camera: "Zoom In"
        lighting: "Studio Soft"
        aspect_ratio: "9:16"
        narration: ""
      - prompt: "tight selfie portrait of the woman holding the product next to her cheek with both hands, she gives an enthusiastic thumbs up and a warm genuine smile directly into the lens, text overlay appears at the bottom reading 'verified purchase' with a five star rating animation, the background softly blurred with warm bokeh circles from string lights in her room, golden hour light catches her eyes making them sparkle, she mouths the words to the camera, final product shot fades in beside her face with a subtle glow effect"
        duration_seconds: 7
        style: "Realistic"
        mood: "Energetic"
        camera: "Handheld"
        lighting: "Natural"
        aspect_ratio: "9:16"
        narration: ""
    edges:
      - { from: 1, to: 2, label: "" }
      - { from: 2, to: 3, label: "" }
      - { from: 3, to: 4, label: "" }

  - name: "Mở hộp mỹ phẩm & cảm nhận đầu tiên"
    description: "3 cảnh: mở hộp, test thử, kết luận — phong cách chân thực, gần gũi như bạn bè giới thiệu"
    direction: "review"
    scenes:
      - prompt: "handheld selfie shot of a young woman in her cozy bathroom, natural morning light through frosted glass window creating soft diffused illumination, she holds up a sealed skincare box with visible luxury brand logo near her face, genuine excited grin as she speaks directly to camera about her expectations, the pristine white bathroom tiles and green plants in the background add freshness, she uses her free hand to gesture dramatically at the box, slight camera shake emphasizing the vlog authenticity, warm inviting atmosphere"
        duration_seconds: 7
        style: "Realistic"
        mood: "Happy"
        camera: "Handheld"
        lighting: "Natural"
        aspect_ratio: "9:16"
        narration: ""
      - prompt: "extreme close-up macro shot of her fingertips gently pressing the glass serum dropper, a single golden droplet suspended in mid-air catching the light before landing on her palm, her other hand enters frame to blend the serum with circular motions, the skin texture visibly transforms becoming more radiant and plump within seconds, split-second B-roll cut to her surprised expression in selfie mode reacting to how fast it absorbed, soft ring light providing catch lights in her eyes, product bottle standing elegantly blurred in the background"
        duration_seconds: 9
        style: "Realistic"
        mood: "Happy"
        camera: "Zoom In"
        lighting: "Studio Soft"
        aspect_ratio: "9:16"
        narration: ""
      - prompt: "medium selfie shot of the woman leaning against her bathroom vanity, she holds the product bottle up beside her glowing cheek, turns her face left and right to show the dewy after-effect under flattering natural window light, she speaks to the camera with the relaxed confidence of someone who genuinely loves the product, text overlay animates in showing key ingredients as she mentions them, she ends by bringing the bottle close to the lens for a final product close-up, authentic satisfied smile and a playful wink to the viewer"
        duration_seconds: 8
        style: "Realistic"
        mood: "Peaceful"
        camera: "Fixed"
        lighting: "Natural"
        aspect_ratio: "9:16"
        narration: ""
    edges:
      - { from: 1, to: 2, label: "" }
      - { from: 2, to: 3, label: "" }

  - name: "Trải nghiệm nhanh đồ công nghệ"
    description: "4 cảnh unbox đồ công nghệ: hộp đẹp gây ấn tượng, lấy sản phẩm ra, cận cảnh thiết kế, trải nghiệm đầu tiên"
    direction: "review"
    scenes:
      - prompt: "handheld POV shot from a tech enthusiast sitting at a modern desk setup with RGB backlighting and dual monitors, both hands enter frame holding a sleek matte black gadget box with embossed branding, the box slowly rotates showing all angles while morning daylight from a large window catches the premium packaging texture, a cat briefly walks in the background adding organic authenticity, the user's voice comments off-camera with genuine excitement about the unboxing weight and feel, monitor screens display tech review website in the defocused background"
        duration_seconds: 7
        style: "Realistic"
        mood: "Energetic"
        camera: "Handheld"
        lighting: "Natural"
        aspect_ratio: "16:9"
        narration: ""
      - prompt: "overhead flat-lay shot of the desk surface, hands carefully slice open the box seal with a precision knife, the lid lifts to reveal the gadget nestled in precision-cut foam, a quick pan up to the reviewer's face showing an impressed wide-eyed reaction, then back down as fingers slowly lift the device from its cradle, metallic surfaces catching the mixed natural and monitor light, the satisfying weight and premium build immediately visible, slow deliberate movements to let the viewer appreciate every detail of the unboxing ritual"
        duration_seconds: 9
        style: "Realistic"
        mood: "Energetic"
        camera: "Fixed"
        lighting: "Studio Soft"
        aspect_ratio: "16:9"
        narration: ""
      - prompt: "macro tracking shot gliding along the edge of the gadget, camera traveling slowly across its brushed aluminum body revealing every port, seam, and design detail, fingers rotate the device to show different angles — top, bottom, side profiles — each surface reflecting soft diffused studio light, extreme close-up of the logo etched into the metal, then pull back to a medium shot of the reviewer holding the device at eye level, futuristic desk setup with LED strips providing subtle accent lighting, shallow depth of field keeps all focus on the product"
        duration_seconds: 8
        style: "Realistic"
        mood: "Peaceful"
        camera: "Dolly"
        lighting: "Studio Soft"
        aspect_ratio: "16:9"
        narration: ""
      - prompt: "handheld selfie shot of the reviewer now actually using the gadget, fingers tapping on the interface as the screen lights up with vivid colors, a genuine wow reaction as the first feature activates smoothly, the reviewer looks from the device to the camera and back repeatedly as they narrate their live first impressions, natural afternoon light mixed with the device screen glow illuminating their face, quick cutaway to a screen recording of the device interface displayed on the main monitor behind them, ending with the reviewer holding the gadget forward toward the lens for a hero pose"
        duration_seconds: 11
        style: "Realistic"
        mood: "Energetic"
        camera: "Handheld"
        lighting: "Natural"
        aspect_ratio: "16:9"
        narration: ""
    edges:
      - { from: 1, to: 2, label: "" }
      - { from: 2, to: 3, label: "" }
      - { from: 3, to: 4, label: "" }

  - name: "Chuyển đổi trước và sau"
    description: "3 cảnh chứng minh hiệu quả: tình trạng trước khi dùng, quá trình sử dụng, kết quả sau — tăng độ tin cậy bằng visual proof"
    direction: "review"
    scenes:
      - prompt: "handheld selfie shot of a woman in her early thirties sitting in natural window light, no makeup, tired expression, she points to specific skin concerns on her face — dark spots on cheek, uneven texture on forehead — camera zooms in slightly on each area she indicates, the raw unfiltered lighting reveals every detail honestly, she speaks vulnerably to camera about her skin struggles, a calendar overlay appears in the corner showing 'Day 1', the neutral beige wall behind her reinforces the documentary-style authenticity, zero filters or beauty retouching"
        duration_seconds: 8
        style: "Realistic"
        mood: "Peaceful"
        camera: "Zoom In"
        lighting: "Natural"
        aspect_ratio: "9:16"
        narration: ""
      - prompt: "fast-paced timelapse montage showing the woman applying the product each morning for 14 days, quick cuts between different days — day 3 patting serum on cheeks, day 7 massaging moisturizer in circular motions, day 10 applying sunscreen as the final step — each clip is approximately one second, the lighting and camera angle remain consistent throughout to allow visual comparison, a day counter ticks up rapidly in the corner, her expression gradually shifts from hopeful to confident as the days progress, warm morning light in every frame"
        duration_seconds: 10
        style: "Realistic"
        mood: "Happy"
        camera: "Fixed"
        lighting: "Natural"
        aspect_ratio: "9:16"
        narration: ""
      - prompt: "split screen comparison sequence — the left side shows day 1 footage with visible dark spots and uneven skin tone in flat natural light, the right side shows day 14 footage capturing the same woman with visibly brighter clearer skin and a radiant healthy glow under identical lighting conditions, the camera slowly pans across her face on each side allowing detailed comparison, she then appears in full frame smiling confidently with a simple swipe transition revealing the transformation, text overlay fades in with key results and a before-after date stamp, genuine satisfied smile that reaches her eyes"
        duration_seconds: 9
        style: "Realistic"
        mood: "Happy"
        camera: "Handheld"
        lighting: "Natural"
        aspect_ratio: "9:16"
        narration: ""
    edges:
      - { from: 1, to: 2, label: "" }
      - { from: 2, to: 3, label: "" }
---

# UGC Review

Nội dung đánh giá sản phẩm theo phong cách user-generated content. Cảm giác chân thực, gần gũi, không quá bóng bẩy, như một người bạn giới thiệu sản phẩm.

## Phong cách quay
- Máy quay handheld tạo cảm giác tự nhiên
- Góc selfie hoặc góc nhìn thứ nhất
- Ánh sáng tự nhiên, không studio
- Có thể hơi rung, không cần tripod

## Đặc điểm prompt
- Giọng điệu thân thiện, như đang nói chuyện với bạn bè
- Có B-roll chen ngang minh họa
- Phản ứng chân thật, không diễn
- Thời lượng ngắn 3-8s mỗi cảnh
