---
id: brand_tvc
label: Brand TVC
label_en: Brand TVC
featured: true
capability: t2v
direction_hints: ["cinematic"]
mood_hints: ["Dramatic", "Romantic"]
camera_hints: ["Dolly", "Crane Up", "Tracking"]
lighting_hints: ["Golden Hour", "Dramatic"]
aspect_hints: ["16:9"]
duration_hint: "15–30s per scene"
style_keywords: ["broadcast quality", "cinematic production", "brand film", "emotional storytelling", "premium lighting", "color graded", "professional", "wide composition", "hero product", "lifestyle", "aspirational", "orchestral score", "voiceover", "4K broadcast", "TV commercial"]
prompt_template: "broadcast-quality brand TVC for {video_type}, cinematic direction, dramatic mood, dolly and crane camera movements, golden hour lighting, emotional brand storytelling, premium production value, orchestral score, broadcast ready, {negative}"
anti_patterns: ["amateur production", "shaky handheld", "vertical format", "social media style", "low budget look"]
default_negative: "amateur, shaky, vertical, social media, low budget, phone quality, unpolished, text overlay, watermark, user generated, casual, vlog style"
example_prompt: "opening on a sweeping aerial drone shot of a coastal highway at golden hour, a sleek electric SUV glides into frame along the winding road, cut to interior close-ups of the hand-stitched leather steering wheel and panoramic glass roof, quick montage of lifestyle moments — a family loading surfboards, the car parked at a cliffside villa, ending on the brand logo fading in over a black screen with the tagline in elegant serif type, orchestral score building to crescendo, cinematic 4K, 30 seconds"
example_prompt_vi: "mở đầu với cảnh quay drone trên không đường cao tốc ven biển lúc golden hour, một chiếc SUV điện bóng bẩy lướt vào khung hình trên con đường uốn lượn, cắt sang close-up nội thất vô lăng bọc da khâu tay và mái kính panorama, montage nhanh những khoảnh khắc lifestyle — gia đình chất ván lướt sóng, xe đậu trước biệt thự trên vách đá, kết thúc với logo thương hiệu hiện dần trên nền đen cùng tagline bằng kiểu chữ serif thanh lịch, nhạc giao hưởng xây dựng đến cao trào, cinematic 4K, 30 giây"
best_for:
  - "Television commercials and broadcast spots"
  - "Brand film and corporate identity videos"
  - "Product launch hero videos"
  - "Premium automotive and luxury brand content"
when_to_use:
  - "Cần chất lượng quảng cáo truyền hình chuyên nghiệp"
  - "Sản phẩm cao cấp, thương hiệu sang trọng"
  - "Video cần cảm giác điện ảnh hoành tráng"
template_flows:
  - name: "Phim thương hiệu cao cấp"
    description: "4 cảnh phim thương hiệu cao cấp: establishing shot hoành tráng, di sản thủ công, lifestyle đẳng cấp, kết logo sang trọng"
    direction: "cinematic"
    scenes:
      - prompt: "aerial drone establishing shot soaring over a mist-covered mountain range at first light, the camera glides through layers of clouds that part to reveal an ancient stone villa perched on a cliff edge overlooking the Mediterranean Sea, warm golden light spills across the terracotta rooftops and cypress trees lining the winding drive, the camera begins a slow majestic descent toward the villa as a solo cello begins playing, every frame composed with classical painting precision, rich color grade with deep emerald greens and warm amber tones, helicopter-style smoothness"
        duration_seconds: 12
        style: "Cinematic"
        mood: "Dramatic"
        camera: "Crane Up"
        lighting: "Golden Hour"
        aspect_ratio: "16:9"
        narration: ""
      - prompt: "intimate interior sequence inside a sunlit artisan workshop within the villa, shafts of golden light pierce through tall arched windows illuminating dust particles dancing in the air, an elderly craftsman's weathered hands carefully stitch fine leather with a needle and waxed thread, extreme macro close-ups of the needle piercing through the material, a brass branding stamp heated over a small flame is pressed into the leather with a satisfying sizzle, the camera slowly dollies along the workbench revealing generations of tools worn smooth by decades of use, warm amber lighting with deep shadows evoking Renaissance chiaroscuro paintings"
        duration_seconds: 15
        style: "Cinematic"
        mood: "Romantic"
        camera: "Dolly"
        lighting: "Dramatic"
        aspect_ratio: "16:9"
        narration: ""
      - prompt: "lifestyle montage sequence shifting to contemporary luxury, a couple in elegant evening attire walks through the villa's moonlit garden with the finished leather goods in hand, fountains cascade in the background with soft backlighting, a vintage convertible pulls up on the gravel driveway with headlights cutting through the twilight, the woman places the leather handbag on the passenger seat with deliberate grace, slow motion captures her silk dress flowing in the evening breeze, a servant pours champagne into crystal flutes on a marble terrace overlooking the illuminated coastline below, every frame styled like a fashion editorial"
        duration_seconds: 18
        style: "Cinematic"
        mood: "Romantic"
        camera: "Tracking"
        lighting: "Golden Hour"
        aspect_ratio: "16:9"
        narration: ""
      - prompt: "the final hero shot begins with an extreme close-up of the brand logo embossed in gold foil on premium leather, the camera slowly pulls back revealing the full product line arranged in an elegant composition on a slab of raw marble, a single beam of light traces across each piece activating the metallic accents, the background fades gradually to absolute black isolating the products, the brand name appears in refined serif typography centered on screen with a subtle glow animation, a quiet orchestral chord holds and fades to silence, pure luxury minimalism in the closing frame"
        duration_seconds: 10
        style: "Cinematic"
        mood: "Dramatic"
        camera: "Zoom Out"
        lighting: "Dramatic"
        aspect_ratio: "16:9"
        narration: ""
    edges:
      - { from: 1, to: 2, label: "" }
      - { from: 2, to: 3, label: "" }
      - { from: 3, to: 4, label: "" }

  - name: "Quảng cáo xe hơi"
    description: "4 cảnh quảng cáo xe hơi: drone toàn cảnh, nội thất thủ công, hiệu suất trên đường, hero shot kết thúc"
    direction: "cinematic"
    scenes:
      - prompt: "opening from complete darkness, a single beam of a lighthouse sweeps across a coastal highway carved into dramatic cliffs, the beam reveals a sleek sports car silhouetted against the pre-dawn sky parked at the cliff's edge, camera slowly dollies forward as the first rays of sunrise ignite the car's metallic paint shifting from deep obsidian to liquid copper, the ocean crashes against rocks 200 feet below sending white spray into the air, the distant lighthouse continues its rhythmic sweep, the engine starts with a deep resonant growl that echoes off the cliff face, cinematic anamorphic flares streak across the lens"
        duration_seconds: 14
        style: "Cinematic"
        mood: "Dramatic"
        camera: "Dolly"
        lighting: "Golden Hour"
        aspect_ratio: "16:9"
        narration: ""
      - prompt: "interior sequence beginning with a macro shot of a fingertip pressing the engine start button which pulses red then glows steady, the digital cockpit illuminates with a sweeping animation across the curved display, camera glides across the hand-stitched leather dashboard with contrasting thread catching the light, carbon fiber trim reflects the ambient interior lighting with a subtle weave pattern, a hand grips the sculpted steering wheel and paddle shifters click with mechanical precision, the heads-up display projects navigation arrows that appear to float above the hood, every surface and material rendered with obsessive detail, cool blue ambient lighting contrasting warm leather tones"
        duration_seconds: 12
        style: "Cinematic"
        mood: "Peaceful"
        camera: "Tracking"
        lighting: "Dramatic"
        aspect_ratio: "16:9"
        narration: ""
      - prompt: "performance sequence shot from a drone tracking the car at high speed along the coastal highway, the drone matches the car's velocity perfectly keeping it centered in frame against the backdrop of the rising sun over the ocean, cut to a low angle ground camera as the car thunders past kicking up autumn leaves in a vortex, the suspension compresses visibly through a tight corner with body roll perfectly controlled, slow motion captures water spray arcing from the tires as they clip a puddle, quick cuts between the exhaust pipes glowing faintly, the speedometer needle sweeping right, and the driver's focused intense expression, the engine note builds to a screaming crescendo"
        duration_seconds: 16
        style: "Cinematic"
        mood: "Energetic"
        camera: "Tracking"
        lighting: "Golden Hour"
        aspect_ratio: "16:9"
        narration: ""
      - prompt: "the car comes to a stop on an infinity-edge platform extending over the ocean at full sunset, the sky explodes in orange pink and purple layers reflected perfectly in the still water below, camera begins a slow crane up pulling away from the vehicle as it becomes a singular elegant silhouette against the vast horizon, the brand logo fades in from the sun's corona position with a lens flare transition, the tagline appears beneath in fine serif typography with a subtle reveal animation, the orchestral score reaches its final resolving chord and holds, the frame slowly fades to black with only the logo remaining glowing for the final three seconds, broadcast-ready 4K"
        duration_seconds: 13
        style: "Cinematic"
        mood: "Dramatic"
        camera: "Crane Up"
        lighting: "Golden Hour"
        aspect_ratio: "16:9"
        narration: ""
    edges:
      - { from: 1, to: 2, label: "" }
      - { from: 2, to: 3, label: "" }
      - { from: 3, to: 4, label: "" }

  - name: "Câu chuyện thương hiệu thời trang"
    description: "4 cảnh phim thời trang: hậu trường studio, người mẫu catwalk, chi tiết trang phục, brand reveal"
    direction: "cinematic"
    scenes:
      - prompt: "behind-the-scenes opening in a high-fashion atelier bathed in soft morning light through floor-to-ceiling frosted windows, dress forms draped with flowing silk and pinned with delicate patterns line the room, a designer's hands sketch rapidly on cream paper with charcoal, the camera slowly dollies forward through hanging racks of garments — each piece rustling gently as if breathing, close-up of scissors cutting through expensive fabric with a satisfying crisp sound, scattered pearls and loose threads on a vintage wooden table, dust motes floating in the shafts of light, intimate documentary-like elegance, desaturated color palette with only the fabrics holding vivid color"
        duration_seconds: 15
        style: "Cinematic"
        mood: "Peaceful"
        camera: "Dolly"
        lighting: "Natural"
        aspect_ratio: "16:9"
        narration: ""
      - prompt: "abrupt transition to a dramatic runway show, the model emerges from complete darkness into a single spotlight, she strides forward in slow motion wearing the collection's hero piece — a flowing gown that seems to float around her, the fabric catches the light with every step revealing hidden embroidery that sparkles like constellations, cameras flash from the darkened audience creating staccato bursts of light, close-up tracking shot following her feet in stiletto heels on the glossy black runway, reflections of the stage lights shimmer on the floor, her expression is fierce and commanding, dramatic high-contrast lighting with deep shadows, fashion week documentary energy"
        duration_seconds: 14
        style: "Cinematic"
        mood: "Dramatic"
        camera: "Tracking"
        lighting: "Dramatic"
        aspect_ratio: "16:9"
        narration: ""
      - prompt: "intricate detail montage sequence — extreme macro of hand-beaded embroidery with each seed pearl individually catching the light, slow pan across layered tulle creating depth and dimension, a single feather on a shoulder piece quivering with the model's breath, fingers buttoning a row of mother-of-pearl buttons, the dress swirling in a 360-degree spin captured at 120 frames per second showing the fabric's movement in unprecedented detail, a zipper being pulled up slowly with satisfying precision, quick cuts between each detail shot maintaining a rhythmic visual tempo that matches the building orchestral score, editorial photography lighting"
        duration_seconds: 12
        style: "Cinematic"
        mood: "Romantic"
        camera: "Zoom In"
        lighting: "Studio Soft"
        aspect_ratio: "16:9"
        narration: ""
      - prompt: "the final model walks to the end of the runway and pauses, the lights behind her fade leaving only a single key light illuminating her and the gown, she slowly turns to face the camera directly breaking the fourth wall with a subtle knowing smile, the brand name appears letter by letter in elegant calligraphy across the bottom of the frame as if being written by an invisible hand, the logo mark fades in above, the camera begins a slow crane up rising above the runway revealing the scale of the venue and the audience rising for a standing ovation in silhouette, fade to black with only the brand name remaining in gold, couture-level production quality"
        duration_seconds: 14
        style: "Cinematic"
        mood: "Dramatic"
        camera: "Crane Up"
        lighting: "Dramatic"
        aspect_ratio: "16:9"
        narration: ""
    edges:
      - { from: 1, to: 2, label: "" }
      - { from: 2, to: 3, label: "" }
      - { from: 3, to: 4, label: "" }

  - name: "Giá trị thương hiệu doanh nghiệp"
    description: "4 cảnh corporate brand film: tầm nhìn mở đầu, con người và văn hóa, đổi mới và công nghệ, cam kết tương lai"
    direction: "cinematic"
    scenes:
      - prompt: "opening on a time-lapse of a modern city skyline transitioning from night to day, the camera slowly tilts down from the skyscrapers to street level where a sleek glass corporate headquarters comes into focus, early morning light creates golden reflections across the building's facade, the automatic doors open as the first employees arrive — diverse professionals in smart-casual attire carrying laptops and coffee cups, the company flag flutters gently atop the building, an establishing wide shot conveys stability permanence and forward momentum, polished color grade with clean whites and corporate blues"
        duration_seconds: 12
        style: "Cinematic"
        mood: "Peaceful"
        camera: "Crane Up"
        lighting: "Golden Hour"
        aspect_ratio: "16:9"
        narration: ""
      - prompt: "documentary-style sequence moving through the office interior capturing authentic moments of collaboration and human connection, a team of engineers huddles around a whiteboard covered in diagrams debating enthusiastically with marker gestures, a mentor leans over a junior employee's desk pointing at code on her screen with patient encouragement, the employee cafeteria shows colleagues from different departments laughing together over lunch with natural window light flooding the space, a quick cut to a factory floor where a line worker wipes sweat from his brow and smiles proudly at the finished product, handheld camera with slight natural shake giving cinéma vérité authenticity, warm inclusive lighting"
        duration_seconds: 18
        style: "Cinematic"
        mood: "Happy"
        camera: "Handheld"
        lighting: "Natural"
        aspect_ratio: "16:9"
        narration: ""
      - prompt: "innovation sequence set in the research and development lab at night, scientists in white coats study holographic projections of molecular structures floating above illuminated tables, a robotic arm performs precise micro-assembly under blue LED lighting, the camera tracks through a server room with thousands of blinking lights creating a cathedral of data, a researcher removes VR goggles and her eyes widen with the thrill of breakthrough discovery, clean room technicians in full protective suits handle silicon wafers with robotic precision, the color palette shifts to cool blues and electric cyans with sharp modern lighting, the energy is focused intense and forward-looking"
        duration_seconds: 15
        style: "Cinematic"
        mood: "Energetic"
        camera: "Tracking"
        lighting: "Dramatic"
        aspect_ratio: "16:9"
        narration: ""
      - prompt: "closing sequence shot from a drone pulling back from the rooftop of the headquarters at sunset, employees are gathered on the green roof garden for a company event with string lights strung between trees, children run between adults' legs and someone plays acoustic guitar, the camera continues rising until the building becomes part of the city skyline and then the world, a globe visualization rotates slowly in the corner representing global impact, the company mission statement appears in clean sans-serif typography over the final wide shot, the corporate logo fades in beneath the text with a subtle glow, inspiring orchestral resolution"
        duration_seconds: 15
        style: "Cinematic"
        mood: "Peaceful"
        camera: "Crane Up"
        lighting: "Golden Hour"
        aspect_ratio: "16:9"
        narration: ""
    edges:
      - { from: 1, to: 2, label: "" }
      - { from: 2, to: 3, label: "" }
      - { from: 3, to: 4, label: "" }
---

# Brand TVC

Quảng cáo truyền hình chuyên nghiệp với chất lượng sản xuất cao, hình ảnh điện ảnh và kể chuyện thương hiệu cảm xúc. Phù hợp cho TVC, brand film, và product launch.

## Hướng dẫn prompt
- Sử dụng direction cinematic để có phong cách điện ảnh phù hợp nhất
- Mỗi cảnh nên có mô tả rõ: chủ thể, hành động, bối cảnh, góc máy
- Giữ nhịp độ chậm rãi, sang trọng, tập trung vào cảm xúc
