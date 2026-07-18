---
id: campaign
label: Campaign
label_en: Campaign
featured: true
capability: t2v
direction_hints: ["social-ad", "cinematic"]
mood_hints: ["Energetic", "Dramatic"]
camera_hints: ["Tracking", "Dolly", "Fixed"]
lighting_hints: ["Natural", "Studio Soft"]
aspect_hints: ["16:9", "9:16"]
duration_hint: "10–20s per scene"
style_keywords: ["marketing campaign", "multi-platform", "brand storytelling", "seasonal promotion", "event launch", "cohesive visual identity", "call to action", "social media", "hero banner", "conversion focused", "brand consistency", "audience targeting", "campaign key visual", "launch video", "integrated marketing"]
prompt_template: "integrated marketing campaign video for {video_type}, {direction} direction, {mood} mood, {camera} camera, {lighting} lighting, multi-platform delivery, cohesive brand identity, clear call to action, {negative}"
anti_patterns: ["single platform only", "inconsistent branding", "passive tone", "no CTA", "confusing message"]
default_negative: "single platform, inconsistent, passive, no CTA, confusing, off brand, low quality, watermark, generic, unrelated imagery"
example_prompt: "split-screen campaign video opening with a countdown timer ticking from 3 to 0, rapid montage of the same product appearing across multiple platforms — Instagram Story, billboard, YouTube unboxing, TikTok challenge, email mockup — all unified by the same coral and navy color palette and consistent typography, ending on a full-screen text overlay with a limited-time offer and QR code, energetic electronic beat driving the pace, 4K, 15 seconds"
example_prompt_vi: "video chiến dịch split-screen mở đầu với đồng hồ đếm ngược từ 3 về 0, montage nhanh cùng một sản phẩm xuất hiện trên nhiều nền tảng — Instagram Story, billboard, YouTube unboxing, TikTok challenge, email mockup — tất cả thống nhất bởi bảng màu san hô và navy cùng typography nhất quán, kết thúc với text overlay toàn màn hình ưu đãi có thời hạn và mã QR, nhịp nhạc điện tử năng lượng, 4K, 15 giây"
best_for:
  - "Multi-channel marketing campaign launches"
  - "Seasonal and holiday promotion videos"
  - "Brand awareness and reach campaigns"
  - "Product launch across social and digital"
when_to_use:
  - "Chiến dịch cần chạy đồng bộ trên nhiều kênh"
  - "Cần video chủ đạo cho landing page và social"
  - "Nội dung khuyến mãi, ra mắt sản phẩm mới"
template_flows:
  - name: "Chiến dịch ra mắt sản phẩm"
    description: "4 cảnh chiến dịch ra mắt sản phẩm: teaser bí ẩn, reveal sản phẩm, multi-platform montage, CTA mua ngay"
    direction: "cinematic"
    scenes:
      - prompt: "the campaign opens in complete darkness, a single pulsing light appears in the center growing larger with each beat, the sound of a heartbeat intensifies, the darkness slowly recedes revealing a shrouded object on a pedestal silhouetted against a dramatic backlight, the camera orbits the mysterious form at a low angle emphasizing its scale and importance, beams of colored light — the brand's signature colors — sweep across the scene like searchlights at a premiere event, text fades in letter by letter spelling the launch date, the atmosphere is charged with anticipation and the feeling that something monumental is about to happen, cinematic color grade with deep blacks and saturated accent lights"
        duration_seconds: 10
        style: "Cinematic"
        mood: "Dramatic"
        camera: "Dolly"
        lighting: "Dramatic"
        aspect_ratio: "16:9"
        narration: ""
      - prompt: "the grand reveal moment — the shroud dramatically falls away in slow motion revealing the new product suspended in a beam of light, the fabric ripples and floats down like silk, the product catches the light with a brilliant gleam that creates lens flares radiating outward, the camera performs a reveal dolly push-in from wide shot to extreme close-up in one continuous fluid motion, sparks and particle effects explode outward from the product like a controlled fireworks display, cut to a close-up of a hand reaching toward the product for the first human touch, the moment is treated with the reverence of unveiling a masterpiece, epic orchestral music reaches its first major crescendo"
        duration_seconds: 12
        style: "Cinematic"
        mood: "Dramatic"
        camera: "Zoom In"
        lighting: "Dramatic"
        aspect_ratio: "16:9"
        narration: ""
      - prompt: "rapid-fire multi-platform montage showing the campaign activating across every channel simultaneously, the screen splits into a dynamic grid of six panels, panel one shows an Instagram Story with the product in a swipe-up format being tapped by a user's finger, panel two shows a YouTube pre-roll ad with the skip button counting down, panel three shows a massive digital billboard in a Times-Square-like cityscape with the product glowing above the crowds, panel four shows a TikTok featuring an influencer dancing with the product, panel five shows an email newsletter opening on a laptop, panel six shows the product listing on an e-commerce homepage with a countdown banner, all panels coordinated with the same color palette and launch message, the montage accelerates building toward a climax"
        duration_seconds: 14
        style: "Minimalist"
        mood: "Energetic"
        camera: "Fixed"
        lighting: "Neon"
        aspect_ratio: "16:9"
        narration: ""
      - prompt: "the grid collapses into a single powerful closing frame featuring the product in its hero pose against a clean brand-color background, a countdown timer displays prominently showing limited early-bird pricing with numbers ticking down, the main call to action appears in large bold typography with a 'Shop the Launch' button emulating a real purchase flow, a QR code materializes in the corner with a gentle glow inviting mobile scanning, social proof indicators flash briefly showing live purchase notifications and low stock warnings creating urgency, the music resolves on a powerful final chord and the frame holds for three seconds allowing all information to land, conversion-optimized design"
        duration_seconds: 10
        style: "Minimalist"
        mood: "Energetic"
        camera: "Fixed"
        lighting: "Studio Soft"
        aspect_ratio: "16:9"
        narration: ""
    edges:
      - { from: 1, to: 2, label: "" }
      - { from: 2, to: 3, label: "" }
      - { from: 3, to: 4, label: "" }

  - name: "Khuyến mãi theo mùa"
    description: "4 cảnh chiến dịch khuyến mãi mùa: không khí lễ hội, sản phẩm giảm giá, deal hấp dẫn, CTA khẩn cấp"
    direction: "social-ad"
    scenes:
      - prompt: "the campaign opens on a festive seasonal scene — a beautifully decorated living room with a Christmas tree twinkling with warm lights, wrapped gift boxes with ribbons scattered beneath, a gentle snowfall visible through the window, the camera slowly dollies through the cozy space past holiday decorations toward a glowing tablet screen sitting on the coffee table, the tablet displays the campaign announcement with animated snowflakes falling across the interface, stockings hang from the mantle and a fire crackles in the hearth casting dancing shadows, the mood is warm nostalgic and joyful, the color palette is rich reds deep greens and warm golds, the feeling is home and family during the holiday season"
        duration_seconds: 11
        style: "Cinematic"
        mood: "Happy"
        camera: "Dolly"
        lighting: "Golden Hour"
        aspect_ratio: "16:9"
        narration: ""
      - prompt: "transition to a dynamic product showcase sequence, multiple gift-worthy products parade across the screen in a conveyor-belt-style horizontal scroll, each product spins into view with a glossy 3D presentation against a seasonal backdrop that shifts — snow for winter collections, cherry blossoms for spring, beach waves for summer — the products are adorned with sale tags showing the discount percentage in large bold numbers, animated price slashes strike through old prices as new lower prices pop in with a celebratory confetti burst, the lighting is bright and commercial with clean studio reflections, fast rhythmic pacing synced to an upbeat holiday remix track"
        duration_seconds: 12
        style: "Realistic"
        mood: "Energetic"
        camera: "Fixed"
        lighting: "Studio Soft"
        aspect_ratio: "16:9"
        narration: ""
      - prompt: "split-screen deal comparison intensifying the value proposition, the left panel shows the full-priced item at its original cost with a grayed-out muted color treatment, the right panel shows the same item with the sale price in vivid saturated colors and a large percentage discount badge pulsing, the right panel footage shows a happy customer unboxing and enjoying the product while the left panel remains static, the right side gradually expands to take over the full screen symbolizing the logical and emotional superiority of the deal, the background fills with floating sale tags and gift boxes, text overlays highlight the savings amount and free shipping offer in bold typography"
        duration_seconds: 10
        style: "Minimalist"
        mood: "Energetic"
        camera: "Fixed"
        lighting: "Neon"
        aspect_ratio: "16:9"
        narration: ""
      - prompt: "urgent closing frame designed to drive immediate action, a large countdown timer dominates the top of the screen with hours minutes and seconds ticking down against a dark background with holiday lights bokeh, the offer details appear in a clean card layout — discount percentage terms and promo code — all in the brand's signature colors, beneath that a progress bar shows limited stock depleting rapidly with an animated label, a bold call-to-action button reads 'Grab Yours Now' with a gentle pulse animation, a QR code appears in the bottom corner for mobile users, the frame ends with the countdown reaching zero triggering a flash transition to the brand logo, the holiday music swells to a finale"
        duration_seconds: 9
        style: "Minimalist"
        mood: "Energetic"
        camera: "Fixed"
        lighting: "Dramatic"
        aspect_ratio: "16:9"
        narration: ""
    edges:
      - { from: 1, to: 2, label: "" }
      - { from: 2, to: 3, label: "" }
      - { from: 3, to: 4, label: "" }

  - name: "Nhận diện thương hiệu"
    description: "4 cảnh chiến dịch nhận diện thương hiệu: vấn đề cảm xúc, thương hiệu xuất hiện, giá trị cốt lõi, tagline và logo"
    direction: "cinematic"
    scenes:
      - prompt: "montage of authentic human moments — a young professional staring at her laptop screen at 2am with exhaustion in her eyes and cold coffee beside her, a small business owner reviewing disappointing monthly reports at his kitchen table with his head in his hands, a creative staring at a blank canvas unable to start, a student overwhelmed by textbooks scattered across her dorm room floor — each vignette is captured with intimate documentary-style lighting and shallow depth of field, the color grade is slightly desaturated with cool tones, subtle ambient music carries a hint of melancholy, the universal feeling of being stuck and wanting more from life, no brand yet just pure human emotion, the camera moves slowly and gently respecting the vulnerability"
        duration_seconds: 18
        style: "Cinematic"
        mood: "Melancholic"
        camera: "Tracking"
        lighting: "Natural"
        aspect_ratio: "16:9"
        narration: ""
      - prompt: "a single warm light appears in the distance within each scene gradually growing brighter, the brand's presence enters not as a logo but as an enabling force — the professional's laptop screen suddenly fills with organized clear data and she straightens up with renewed energy, the business owner receives a notification on his phone and his expression transforms from worry to relief and determination, the creative picks up her brush and begins painting with flowing confident strokes, the student's notes organize themselves into a coherent system and she smiles for the first time, the color grade gradually warms and saturates in each scene, the transformation is subtle and earned not magical, the brand is felt as an enabler of human potential"
        duration_seconds: 16
        style: "Cinematic"
        mood: "Peaceful"
        camera: "Dolly"
        lighting: "Golden Hour"
        aspect_ratio: "16:9"
        narration: ""
      - prompt: "the four characters from the opening now appear together in a montage of success moments — the professional presenting confidently in a boardroom with charts behind her, the business owner shaking hands with a new partner in a sunlit café, the creative at her own gallery opening surrounded by admirers, the student walking across the graduation stage in cap and gown as her family cheers — quick cuts between these scenes with a building orchestral score, the camera movement becomes more dynamic and assured, tracking alongside each character as they move through their transformed world, the brand's visual elements begin subtly appearing integrated into the environments — a color accent here a design motif there — establishing the brand as the invisible force behind their success"
        duration_seconds: 15
        style: "Cinematic"
        mood: "Happy"
        camera: "Tracking"
        lighting: "Natural"
        aspect_ratio: "16:9"
        narration: ""
      - prompt: "the four characters fade away leaving a clean elegant frame, the brand's logo animates into the center of the screen with a sophisticated reveal — each letter forming from particles of light that coalesce into the final mark, the brand tagline appears beneath in refined typography with a subtle fade-in, the background transitions to the brand's signature color with a gentle gradient, the music resolves into a single sustained note that rings with clarity and purpose, the frame holds for several seconds allowing the brand identity to imprint on the viewer's memory, no call to action no pricing — pure brand equity building, the final impression is one of aspiration trust and emotional connection"
        duration_seconds: 11
        style: "Cinematic"
        mood: "Dramatic"
        camera: "Fixed"
        lighting: "Dramatic"
        aspect_ratio: "16:9"
        narration: ""
    edges:
      - { from: 1, to: 2, label: "" }
      - { from: 2, to: 3, label: "" }
      - { from: 3, to: 4, label: "" }
---

# Campaign

Video chiến dịch marketing đa kênh với nhận diện thương hiệu nhất quán và thông điệp chuyển đổi rõ ràng. Phù hợp cho campaign launch, promotion, và event marketing.

## Hướng dẫn prompt
- Sử dụng direction social-ad để có nhịp độ nhanh, năng lượng
- Mỗi cảnh nên tập trung vào một kênh hoặc một thông điệp
- Giữ CTA rõ ràng ở cuối video
