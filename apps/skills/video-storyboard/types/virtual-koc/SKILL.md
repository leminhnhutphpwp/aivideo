---
id: virtual_koc
label: Virtual KOC
label_en: Virtual KOC
featured: true
capability: t2v
direction_hints: ["review", "beauty"]
mood_hints: ["Happy", "Peaceful"]
camera_hints: ["Fixed", "Handheld", "Zoom In"]
lighting_hints: ["Studio Soft", "Natural"]
aspect_hints: ["9:16", "16:9"]
duration_hint: "5-15s per scene"
style_keywords: ["virtual KOC", "AI influencer", "digital avatar", "virtual spokesperson", "brand ambassador", "computer generated", "3D character", "virtual human", "product endorsement", "social media influencer", "metaverse", "virtual try-on", "CGI host", "synthetic media", "digital content creator"]
prompt_template: "virtual KOC {video_type} content, {direction} direction, {mood} mood, {camera} camera, {lighting} lighting, AI-generated virtual spokesperson, photorealistic digital avatar, authentic brand endorsement style, social media native, {negative}"
anti_patterns: ["uncanny valley", "robotic voice", "stiff animation", "obvious CGI", "creepy", "unnatural eyes", "dead eyes", "plastic skin"]
default_negative: "uncanny valley, robotic, stiff, obvious CGI, creepy, unnatural eyes, dead eyes, plastic skin, watermark, low quality, distorted face, jerky movement, glitching"
example_prompt: "a photorealistic virtual influencer with natural skin texture and subtle facial micro-expressions stands in a sunlit modern apartment kitchen, she picks up a smart water bottle and the LED temperature display glows blue as she takes a sip, direct eye contact with camera, she speaks naturally with slight head tilts and hand gestures explaining the hydration tracking feature, B-roll of the app interface floating next to her as she points to the data, casual athleisure outfit, warm natural lighting through sheer curtains, indistinguishable from a human influencer, 4K, 20 seconds"
example_prompt_vi: "một virtual influencer siêu thực với kết cấu da tự nhiên và vi biểu cảm khuôn mặt tinh tế đứng trong bếp căn hộ hiện đại ngập nắng, cô cầm chai nước thông minh và màn hình LED hiển thị nhiệt độ phát sáng xanh khi cô uống một ngụm, giao tiếp bằng mắt trực tiếp với camera, cô nói tự nhiên với động tác nghiêng đầu nhẹ và cử chỉ tay giải thích tính năng theo dõi hydrat hóa, B-roll giao diện ứng dụng nổi bên cạnh khi cô chỉ vào dữ liệu, trang phục athleisure thường ngày, ánh sáng tự nhiên ấm qua rèm sheer, không thể phân biệt với influencer người thật, 4K, 20 giây"
best_for:
  - "Virtual brand ambassador and spokesperson videos"
  - "AI-generated product review and endorsement"
  - "Digital influencer marketing campaigns"
  - "Virtual try-on and product demonstration"
when_to_use:
  - "Cần KOL/KOC nhưng không muốn phụ thuộc người thật"
  - "Sản xuất nội dung quy mô lớn, đa ngôn ngữ"
  - "Thương hiệu muốn kiểm soát hoàn toàn hình ảnh đại diện"
template_flows:
  - name: "KOC ảo đánh giá sản phẩm"
    description: "4 cảnh virtual KOC review sản phẩm: chào sân giới thiệu, unbox cận cảnh, demo tính năng, kết luận và rating"
    direction: "review"
    scenes:
      - prompt: "a photorealistic virtual influencer with East Asian features and flawless skin texture stands in a sun-drenched modern living room with floor-to-ceiling windows overlooking a city skyline, she has gentle micro-expressions including a slight crinkle around her eyes as she smiles and subtle muscle movements around her mouth when she speaks, wearing a casual cream cashmere sweater, she looks directly into the camera lens with natural eye contact and welcoming hand gesture, the product box sits on a marble coffee table beside a vase of fresh orchids, she introduces herself and the product with a warm friendly tone and smooth natural head tilts, the morning light through sheer curtains creates soft diffused illumination on her face with subtle subsurface scattering on her skin, the animation is fluid with natural idle movements including slight weight shifts and breathing visible through shoulder movement, indistinguishable from a human presenter"
        duration_seconds: 10
        style: "Realistic"
        mood: "Happy"
        camera: "Fixed"
        lighting: "Natural"
        aspect_ratio: "9:16"
        narration: ""
      - prompt: "overhead flat-lay shot looking down at the marble table as the virtual influencer's hands enter frame with elegant manicured fingers, she carefully unboxes the product with deliberate graceful movements peeling back tissue paper and lifting the item from its cradle, extreme close-up of her fingertips tracing the product's surface texture showing realistic skin pores and subtle nail bed translucency, the product catches studio-grade softbox lighting creating controlled reflections on its surface, her face remains visible in a picture-in-picture circle at the top of the frame showing genuine delight reactions as each packaging layer reveals something new, the B-roll transitions smoothly between overhead macro shots and her facial expressions, soft ambient lighting with a subtle ring light catchlight in her eyes, the unboxing feels premium and ASMR-like with every movement deliberate and aesthetically composed"
        duration_seconds: 12
        style: "Realistic"
        mood: "Happy"
        camera: "Zoom In"
        lighting: "Studio Soft"
        aspect_ratio: "9:16"
        narration: ""
      - prompt: "mid-shot of the virtual influencer now sitting on a modern minimalist sofa demonstrating the product's key features, she holds the product at eye level and activates each function while animated feature callouts appear beside her in clean typography, her hand gestures are fluid and natural with fingers pointing to specific details and her palm opening to present the full product, quick B-roll insert shows a macro shot of the product's LED display illuminating with vibrant accurate color, her face transitions through expressions of curiosity surprise and satisfaction as she tests each feature, a split-screen moment shows the product in her hand on the left and an animated infographic of its internal technology on the right with glowing connections between them, the lighting shifts to a warm golden hour glow as late afternoon sun streams through the windows creating lens flares that add organic authenticity to the synthetic scene"
        duration_seconds: 14
        style: "Realistic"
        mood: "Peaceful"
        camera: "Handheld"
        lighting: "Natural"
        aspect_ratio: "9:16"
        narration: ""
      - prompt: "closing scene with the virtual influencer in a tight portrait frame holding the product beside her face in a classic beauty-shot pose, the background is softly blurred with warm bokeh circles from string lights in the evening ambiance, she delivers her final verdict with a confident genuine smile speaking directly to the viewer as if recommending to a close friend, an animated five-star rating appears beside her head with stars filling in sequentially, the product name and key benefit overlay in elegant typography at the bottom, she gives a subtle wink and a small wave as the frame fades slightly around the edges drawing all focus to her face and the product, the lighting is a perfect blend of warm ambient light and a subtle hair light separating her silhouette from the darkening background, the final impression is a trustworthy virtual friend whose recommendation feels authentic"
        duration_seconds: 9
        style: "Realistic"
        mood: "Happy"
        camera: "Fixed"
        lighting: "Studio Soft"
        aspect_ratio: "9:16"
        narration: ""
    edges:
      - { from: 1, to: 2, label: "" }
      - { from: 2, to: 3, label: "" }
      - { from: 3, to: 4, label: "" }

  - name: "KOC ảo hướng dẫn làm đẹp"
    description: "4 cảnh virtual KOC hướng dẫn làm đẹp: giới thiệu routine, apply từng bước, close-up kết quả, tips và sản phẩm"
    direction: "beauty"
    scenes:
      - prompt: "a photorealistic virtual beauty influencer with dewy glass skin and delicate East Asian features sits at a sleek modern vanity table with a Hollywood-style mirror bordered by warm LED bulbs, she wears a silk robe and her hair is wrapped in a soft towel turban, the vanity displays an elegant arrangement of skincare products in minimalist packaging, she greets the viewer with a gentle voice and soft eye contact explaining her morning skincare routine while gesturing to the lineup of products with graceful hand movements, the mirror reflection shows her from a second angle adding depth and realism to the scene, natural morning light from a nearby window mixes with the vanity mirror's warm glow creating flattering catchlights in her eyes, her skin rendering shows realistic subsurface scattering with visible but subtle pores and a natural hyaluronic acid glow, the atmosphere is calm spa-like and aspirational"
        duration_seconds: 10
        style: "Realistic"
        mood: "Peaceful"
        camera: "Fixed"
        lighting: "Natural"
        aspect_ratio: "9:16"
        narration: ""
      - prompt: "step-by-step application sequence beginning with the virtual influencer cleansing her face with a foam cleanser, the camera zooms into a macro shot capturing her fingertips massaging the product into her skin with circular motions, the foam texture renders photorealistically with tiny bubbles catching the light, she applies toner with a cotton pad showing the gentle patting technique, then serum with pressing motions, each product triggers a small animated label appearing beside her hand naming the product and its key ingredient, the sequence is edited with smooth dissolve transitions between each step keeping the visual flow continuous and hypnotic, split-screen inserts show her face from the front and a 45-degree angle simultaneously demonstrating proper application angles, her expression remains focused and serene throughout, the lighting is consistent warm and diffused from the vanity mirror creating an intimate tutorial atmosphere"
        duration_seconds: 15
        style: "Realistic"
        mood: "Peaceful"
        camera: "Zoom In"
        lighting: "Studio Soft"
        aspect_ratio: "9:16"
        narration: ""
      - prompt: "result reveal sequence showing the completed skincare routine, the virtual influencer leans close to the mirror examining her skin from multiple angles, the camera captures extreme close-up details of her glowing complexion, a before-after transition sweeps across the frame showing skin texture hydration levels and radiance improvement, animated moisture-level meters and skin-barrier-strength indicators appear as holographic overlays beside her face with data visualizations filling up to optimal levels, she touches her cheek with the back of her hand demonstrating the bouncy elastic skin texture, the lighting shifts to pure natural daylight streaming through the window revealing the true skin quality without filters, every pore and natural skin detail renders with photographic accuracy proving the routine's effectiveness, her satisfied smile communicates genuine results"
        duration_seconds: 10
        style: "Realistic"
        mood: "Happy"
        camera: "Dolly"
        lighting: "Natural"
        aspect_ratio: "9:16"
        narration: ""
      - prompt: "wrap-up scene with the virtual influencer now fully ready with light natural makeup and her hair released in soft waves, she holds up her top three hero products from the routine lined up on the vanity, each product gets a quick feature callout with price and a floating shoppable tag, she shares her personal tips for each product including application techniques and best times to use them, the scene includes a quick timelapse of her entire routine condensed into ten seconds playing in a picture-in-picture circle as she narrates over it, her final message is warm and encouraging about self-care not being selfish, the video ends with her signature sign-off gesture, all products displayed in a final flat-lay composition with the brand hashtag appearing elegantly, the lighting transitions to a soft evening glow suggesting the routine can fit into any time of day, the mood is empowering and self-care focused"
        duration_seconds: 13
        style: "Realistic"
        mood: "Peaceful"
        camera: "Fixed"
        lighting: "Studio Soft"
        aspect_ratio: "9:16"
        narration: ""
    edges:
      - { from: 1, to: 2, label: "" }
      - { from: 2, to: 3, label: "" }
      - { from: 3, to: 4, label: "" }

  - name: "Vlog đời sống KOC ảo"
    description: "4 cảnh virtual KOC vlog đời sống: morning routine, hoạt động ngoài trời, cooking healthy, evening wind-down"
    direction: "review"
    scenes:
      - prompt: "the vlog opens in a beautifully designed bedroom with soft morning light filtering through linen curtains, the virtual influencer wakes up naturally without an alarm stretching in her bed with authentic morning grogginess in her micro-expressions, she wears simple cotton pajamas and her hair is naturally tousled, the camera follows her in a handheld vlog style as she pads barefoot across warm oak flooring to the kitchen, passing a yoga mat already unrolled by the window and a French press waiting on the counter, she fills a glass water bottle from a filtered tap and adds lemon slices from a bowl of fresh citrus, the first-person POV segments alternate with third-person shots showing her morning routine, the apartment is styled in warm neutral tones with abundant plants and personal touches like framed photos and stacked books, the lighting transitions from soft blue dawn to warm golden morning naturally through the scene"
        duration_seconds: 14
        style: "Realistic"
        mood: "Peaceful"
        camera: "Handheld"
        lighting: "Natural"
        aspect_ratio: "9:16"
        narration: ""
      - prompt: "outdoor activity sequence as the virtual influencer heads to a scenic park for her morning exercise, she wears stylish athleisure in coordinated earth tones and carries a yoga mat, the park features a lake with morning mist rising from the water and willow trees trailing their branches, she finds a spot on the grass with the lake as her backdrop and begins a yoga flow, the camera captures her poses from multiple angles including a stunning wide shot with the lake and skyline behind her and a close-up of her focused calm expression, her movements are fluid and anatomically accurate with muscles visibly engaging through her clothing, she transitions between poses with the grace of a practiced practitioner, other park-goers pass in the defocused background adding organic life to the scene, the sun has fully risen creating beautiful golden rim lighting around her silhouette, the sequence feels like a premium fitness influencer's content"
        duration_seconds: 15
        style: "Realistic"
        mood: "Happy"
        camera: "Tracking"
        lighting: "Golden Hour"
        aspect_ratio: "16:9"
        narration: ""
      - prompt: "midday cooking sequence in her sun-filled kitchen, the virtual influencer ties her hair back and puts on a linen apron preparing to cook a healthy Vietnamese-inspired meal, the camera captures an overhead flat-lay of fresh ingredients arranged beautifully on a wooden cutting board, her hands move with practiced skill chopping herbs with a sharp knife producing perfect even cuts, the sizzle of garlic hitting a hot pan creates visible aromatic steam, she tastes the broth from a wooden spoon with a satisfied nod, quick cuts show close-ups of vibrant ingredients and the cooking process, she plates the final dish, a steaming bowl of phở with fresh herb garnishes and sliced chili, and carries it to a sunlit dining table set for one with a simple elegant place setting, the scene showcases the beauty of cooking as self-care and the appeal of a balanced lifestyle, warm abundant natural light from large kitchen windows creates an inviting atmosphere"
        duration_seconds: 16
        style: "Realistic"
        mood: "Happy"
        camera: "Handheld"
        lighting: "Natural"
        aspect_ratio: "16:9"
        narration: ""
      - prompt: "evening wind-down sequence bringing the vlog to a peaceful close, the virtual influencer has changed into cozy loungewear and is curled up on her sofa with a soft throw blanket and a book, fairy lights twinkle on the balcony visible through glass doors and a scented candle flickers on the coffee table creating dancing shadows, she sips herbal tea from a ceramic mug and reads with genuine engagement occasionally looking up to gaze at the city lights outside, her cat jumps onto the sofa and curls up beside her adding organic warmth to the scene, the camera slowly dollies back from a close-up to a wider shot revealing the entire cozy apartment scene, the day's activities flash briefly in a picture-in-picture montage before dissolving, she closes her book and looks directly at the camera one final time delivering a reflective thought about gratitude and slowing down, the scene fades to black with her signature vlog end card appearing in elegant typography, the mood is contentment and mindful living"
        duration_seconds: 15
        style: "Realistic"
        mood: "Peaceful"
        camera: "Dolly"
        lighting: "Natural"
        aspect_ratio: "16:9"
        narration: ""
    edges:
      - { from: 1, to: 2, label: "" }
      - { from: 2, to: 3, label: "" }
      - { from: 3, to: 4, label: "" }
---

# Virtual KOC

Virtual KOC với người ảnh hưởng AI siêu thực, kiểm soát hoàn toàn hình ảnh đại diện. Phù hợp cho brand ambassador, product endorsement, và scalable content.

## Hướng dẫn prompt
- Tập trung vào chất lượng photorealistic cho avatar
- Thêm micro-expressions và chuyển động tự nhiên
- Kết hợp B-roll và product shots như influencer thật
