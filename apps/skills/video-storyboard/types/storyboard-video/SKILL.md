---
id: storyboard_video
label: Storyboard Video
label_en: Storyboard Video
featured: true
capability: t2v
direction_hints: ["cinematic", "explainer"]
mood_hints: ["Dramatic", "Peaceful"]
camera_hints: ["Dolly", "Crane Up", "Tracking"]
lighting_hints: ["Golden Hour", "Natural", "Dramatic"]
aspect_hints: ["16:9"]
duration_hint: "5–20s per scene"
style_keywords: ["narrative storyboard", "cinematic storytelling", "scene sequence", "plot development", "character arc", "visual narrative", "story beats", "shot list", "camera direction", "scene transition", "story structure", "emotional journey", "visual script", "beginning middle end", "director treatment"]
prompt_template: "narrative storyboard for {video_type}, {direction} direction, {mood} mood, {camera} camera, {lighting} lighting, cinematic storytelling, clear narrative arc, defined scene transitions, visual story beats, {negative}"
anti_patterns: ["random scenes", "no narrative flow", "disjointed", "inconsistent style", "confusing timeline", "unclear characters"]
default_negative: "random, disjointed, inconsistent, confusing, timeline unclear, characters undefined, low quality, jarring transitions, mismatched lighting"
example_prompt: "scene 1 wide establishing shot of a lighthouse on a stormy cliff at dusk, waves crashing against rocks, a single light in the window, dolly in slowly; scene 2 interior of lighthouse, an old man reading a letter by candlelight, close-up on a faded photograph in the envelope; scene 3 flashback transition sepia to young couple dancing on the same cliff at sunset 50 years ago, handheld camera circling them intimately; scene 4 return to present, the old man wipes a tear and smiles, stands up and walks to the window, silhouette against the lighthouse beam sweeping across the dark sea, crane up through the roof revealing the vast ocean, fade to black, cinematic 4K, 45 seconds"
example_prompt_vi: "cảnh 1 wide establishing shot ngọn hải đăng trên vách đá bão tố lúc hoàng hôn, sóng đập vào đá, một ánh đèn duy nhất trong cửa sổ, dolly in chậm; cảnh 2 nội thất hải đăng, một ông lão đọc thư dưới ánh nến, close-up tấm ảnh cũ kẹp trong phong bì; cảnh 3 chuyển flashback tông sepia sang cặp đôi trẻ khiêu vũ trên cùng vách đá lúc hoàng hôn 50 năm trước, máy handheld xoay quanh họ thân mật; cảnh 4 trở về hiện tại, ông lão lau nước mắt và mỉm cười, đứng dậy bước tới cửa sổ, bóng người trên nền chùm sáng hải đăng quét qua biển đen, crane up xuyên qua mái nhà để lộ đại dương bao la, fade to black, cinematic 4K, 45 giây"
best_for:
  - "Narrative short films and brand storytelling"
  - "Multi-scene commercial and campaign videos"
  - "Music video storyboards and treatments"
  - "Film and animation pre-visualization"
when_to_use:
  - "Cần kể một câu chuyện có đầu có cuối"
  - "Video nhiều cảnh cần mạch truyện rõ ràng"
  - "Nội dung cần cảm xúc và hành trình nhân vật"
template_flows:
  - name: "Phim ngắn tình yêu"
    description: "5 cảnh phim ngắn tình yêu: gặp gỡ định mệnh, yêu đương ngọt ngào, xung đột chia xa, nỗi nhớ và hối tiếc, đoàn tụ cảm động"
    direction: "cinematic"
    scenes:
      - prompt: "wide establishing shot of a rain-soaked Hanoi street at dusk, the old quarter's yellow-walled buildings glisten under vintage street lamps, motorbikes with colorful ponchos stream past in motion blur, a young woman in a cream áo dài stands under a shop awning holding a leather notebook against her chest to protect it from the drizzle, she looks up at the darkening sky with a mixture of frustration and wonder, across the street a young man in a simple white shirt emerges from a bookstore with a newspaper over his head, their eyes meet through the curtain of rain between them, the camera slowly dollies forward capturing the exact moment two strangers become aware of each other's existence, warm amber street light mixing with cool blue twilight, a single piano note holds in the air"
        duration_seconds: 15
        style: "Cinematic"
        mood: "Romantic"
        camera: "Dolly"
        lighting: "Golden Hour"
        aspect_ratio: "16:9"
        narration: ""
      - prompt: "montage of their relationship blooming across the seasons of Hanoi set to a gentle acoustic guitar piece, spring — they sit on the edge of Hoàn Kiếm Lake with their feet dangling above the water eating bánh mì and laughing with crumbs on their cheeks, the ancient turtle tower reflected in the still green water behind them, summer — they ride a bicycle through streets lined with blooming phượng vĩ trees, her arms wrapped around his waist her long hair flowing in the wind, autumn — they walk hand in hand through a carpet of fallen yellow leaves on Phan Đình Phùng Street, the camera circles around them, winter — they share a steaming bowl of phở at a street stall huddled close for warmth with their breath visible in the cold air, each season transition marked by falling leaves that dissolve into the next scene, golden warm color grade throughout"
        duration_seconds: 20
        style: "Cinematic"
        mood: "Romantic"
        camera: "Handheld"
        lighting: "Golden Hour"
        aspect_ratio: "16:9"
        narration: ""
      - prompt: "the tone shifts dramatically to conflict, the young man stands alone in a sterile airport departure terminal holding a one-way plane ticket and a scholarship letter, through the floor-to-ceiling windows rain streaks down matching the tears on the young woman's face, a heated argument plays out in fragmented cuts — her hands gesturing desperately his head bowed in guilt their mouths forming words we cannot hear over the swelling melancholic strings, the camera stays at a respectful distance like an unwilling witness, the terminal's cold fluorescent lighting creates harsh shadows on their faces replacing the warm golden light of their happy memories, she hands him the leather notebook from their first meeting as a parting gift and walks away without looking back, the camera tracks her exit through the automatic doors as they close between them, the notebook remains clutched in his trembling hands"
        duration_seconds: 18
        style: "Cinematic"
        mood: "Dramatic"
        camera: "Tracking"
        lighting: "Moody"
        aspect_ratio: "16:9"
        narration: ""
      - prompt: "a year later in two parallel sequences connected by the same melancholic music, sunrise in a modern apartment in Singapore — the young man sits at his desk surrounded by engineering textbooks, he opens the leather notebook and finds pressed flowers from their first spring together and a handwritten note he never read, his composure breaks and tears fall onto the pages smudging the ink, simultaneous scenes of her in Hanoi walking the same streets alone pausing at the lake where they first sat together, the split-screen shows both of them separately touching the same notebook the same pressed flower the same memory from opposite sides, she writes a new letter and sends it without an address hoping the universe delivers it, the notebook becomes the symbolic thread connecting them across distance, the lighting is cool and lonely for him warm but melancholy for her"
        duration_seconds: 17
        style: "Cinematic"
        mood: "Melancholic"
        camera: "Fixed"
        lighting: "Natural"
        aspect_ratio: "16:9"
        narration: ""
      - prompt: "one year later at the exact same train street spot in Hanoi's old quarter where they first met, the young woman returns to the now-famous tourist spot to take a photograph for her new photography portfolio, she sets up her tripod and frames the shot of the train tracks between the narrow alley buildings, as the afternoon train approaches and tourists scramble to the sides she stays focused on her composition, just as she presses the shutter someone steps into her frame — she lowers the camera annoyed and finds him standing there holding her letter and the notebook, his hair slightly longer his expression carrying the weight of the year apart but his eyes holding the same light she remembered, the train rushes past inches away creating a tunnel of motion blur around them, they stand frozen staring at each other as the world blurs past, the train passes revealing them still standing there, she takes a tentative step forward then runs into his arms, the camera cranes up above the narrow alley as the afternoon sun breaks through the clouds bathing the entire scene in golden light, fade to black with the title card appearing in elegant Vietnamese calligraphy"
        duration_seconds: 19
        style: "Cinematic"
        mood: "Romantic"
        camera: "Crane Up"
        lighting: "Golden Hour"
        aspect_ratio: "16:9"
        narration: ""
    edges:
      - { from: 1, to: 2, label: "" }
      - { from: 2, to: 3, label: "" }
      - { from: 3, to: 4, label: "" }
      - { from: 4, to: 5, label: "" }

  - name: "Hành trình thương hiệu"
    description: "4 cảnh hành trình thương hiệu: khởi đầu khiêm tốn, đam mê và thử thách, bước ngoặt thành công, tầm nhìn tương lai"
    direction: "cinematic"
    scenes:
      - prompt: "the origin story begins in a humble setting twenty years ago — a cramped apartment kitchen in Ho Chi Minh City at 4am, a young Vietnamese woman in her forties kneads dough by hand on a worn wooden table, a single bare bulb hanging from the ceiling casts harsh shadows, sweat on her brow catching the light as she works with determined focus, her young daughter sits at the same table doing homework by the same light occasionally glancing at her mother with admiration, the camera is static and documentary-like observing without romanticizing, the color grade is desaturated almost monochromatic with only the fresh green herbs on the counter retaining any color, the scene communicates sacrifice dedication and the quiet dignity of building something from nothing, no music just the sounds of kneading and the distant hum of the city waking up"
        duration_seconds: 16
        style: "Cinematic"
        mood: "Peaceful"
        camera: "Fixed"
        lighting: "Natural"
        aspect_ratio: "16:9"
        narration: ""
      - prompt: "a montage of the challenging years building the business — the same woman now standing at a small market stall in the rain with a plastic tarp shelter, she hands a steaming bánh bao to a customer with a warm smile even as water drips onto her shoulder, cut to her riding a bicycle with a bamboo basket filled with ingredients navigating through Saigon traffic at sunrise, her hands counting small bills at the end of the day spreading them flat on the same wooden table now more worn, a health inspector's visit showing tension in her clenched jaw and her daughter watching from the corner, a competitor opening across the street stealing customers, each challenge is presented in a quick vignette with the camera always close and intimate, the lighting is natural and often harsh — fluorescent markets dim kitchens glaring street light — the music is minimal a single traditional đàn bầu string bending with emotion, the sequence builds resilience and determination through adversity"
        duration_seconds: 18
        style: "Cinematic"
        mood: "Dramatic"
        camera: "Handheld"
        lighting: "Natural"
        aspect_ratio: "16:9"
        narration: ""
      - prompt: "the turning point sequence begins with the first customer returning with a friend then the friend returns with family, the market stall now has a small line of customers waiting patiently in the morning light, the daughter now a teenager helps her mother serve customers with the same warm smile, a food blogger visits and takes photos her camera flash illuminating the simple stall with sudden bursts of light, the blogger's review goes viral represented by a montage of phone screens lighting up across the city with the same photo and five-star rating appearing on each screen, the next scene shows the mother standing in front of a small storefront with her name painted on the window — her first physical restaurant — she touches the glass door with tears in her eyes, the lighting transforms from the harsh realism of the market to the warm golden light of achievement, the traditional đàn bầu is joined by a full orchestra swelling with pride and accomplishment"
        duration_seconds: 17
        style: "Cinematic"
        mood: "Happy"
        camera: "Dolly"
        lighting: "Golden Hour"
        aspect_ratio: "16:9"
        narration: ""
      - prompt: "the present day and future vision landing together in a powerful closing sequence, the camera crane rises above a modern flagship restaurant in downtown Saigon — the granddaughter of the original founder now runs the business with the same family recipes, through the glass facade we see a diverse team of employees working in a bright state-of-the-art kitchen, the camera pushes through the window seamlessly entering the space, the original worn wooden table now preserved as a centerpiece in the restaurant lobby with a plaque telling the founding story, the founder now in her seventies sits at a VIP table with her great-grandchildren teaching them to fold bánh bao with their small hands, the camera pans across the restaurant walls covered with photos of the journey — the market stall the first store the expansion to three cities — then rises through the ceiling to reveal a vision of future locations across Southeast Asia appearing as glowing pins on a map, the brand tagline appears in elegant Vietnamese typography, the orchestra reaches its final resolving chord"
        duration_seconds: 19
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

  - name: "Câu chuyện vấn đề - giải pháp"
    description: "4 cảnh kể chuyện vấn đề - giải pháp: cuộc sống khó khăn hiện tại, khoảnh khắc nhận ra vấn đề, khám phá giải pháp, cuộc sống mới tốt đẹp hơn"
    direction: "explainer"
    scenes:
      - prompt: "a montage of a young professional's exhausting daily routine shot in a documentary observational style, the alarm clock reads 5:30am and his hand slaps it silent against a dark bedroom, he rushes through a crowded Saigon street on his motorbike wedged between buses with stress etched on his face, at the office his desk is buried under papers and his computer has forty-seven unread emails, lunch is a sad sandwich eaten while typing, the afternoon meeting runs two hours over and his shoulders visibly slump, the evening commute home in the rain with water seeping through his poncho, he arrives home at 8pm to his small apartment and collapses on the bed still in work clothes staring at the ceiling, the color grade is desaturated with a slight blue tint, the camera is handheld with a slight jitter matching the stressful chaotic energy of his life, the only sound is his tired breathing and the ambient noise of the city"
        duration_seconds: 20
        style: "Cinematic"
        mood: "Melancholic"
        camera: "Handheld"
        lighting: "Natural"
        aspect_ratio: "16:9"
        narration: ""
      - prompt: "the breaking point scene — the same man sits at his kitchen table late at night with a calculator and bills spread before him, his daughter's school fee notice with a red overdue stamp sits on top, he rubs his temples and looks at a framed photo of his family on the wall — his wife and two children smiling on a beach vacation from years ago — the contrast between the happy memory and his current stress creates a powerful emotional wallop, a single tear rolls down his cheek as he whispers to himself in Vietnamese, the camera slowly pushes in on his face while the background fades to darkness isolating him in his moment of despair, the only light source is the harsh fluorescent kitchen light above creating deep shadows under his eyes, this is the rock bottom moment where the problem becomes unbearable, the music is a single somber violin note that holds with painful tension"
        duration_seconds: 12
        style: "Cinematic"
        mood: "Dramatic"
        camera: "Zoom In"
        lighting: "Moody"
        aspect_ratio: "16:9"
        narration: ""
      - prompt: "the discovery sequence shifts the film's entire visual language, the scene transitions with a morning light bursting through curtains as the man's wife enters holding her phone with excitement, she shows him the solution — a new financial management app — and demonstrates the interface with quick finger taps, the app's screen glows with warm inviting colors and clean intuitive design, the camera pushes into her phone screen and transitions into an animated explainer sequence where the app's features come to life — expenses organizing themselves into color-coded categories bills automating themselves a savings tracker filling up like water in a glass, the man watches with skepticism transforming into cautious hope, his daughter runs into the room and hugs his leg grounding the moment in family love, the lighting shifts from the cold fluorescent of the previous scene to warm natural morning light filling the entire kitchen, a gentle acoustic guitar begins playing a hopeful melody"
        duration_seconds: 14
        style: "Cinematic"
        mood: "Peaceful"
        camera: "Dolly"
        lighting: "Natural"
        aspect_ratio: "16:9"
        narration: ""
      - prompt: "the new life montage shows the transformation across a series of vignettes — three months later the same kitchen table now has a healthy breakfast spread and the family eating together with genuine laughter, the school fee notice now stamped PAID sits on the counter beside a new acceptance letter for the daughter's advanced program, the man at work now organized and efficient wrapping up at 5pm with his boss nodding approval, the evening commute replaced with him arriving home early to play football with his son in the apartment courtyard, a weekend scene of the family at the beach — the same beach from the old photo now alive with his family laughing in the waves while he captures the moment on his phone through the same app that transformed their finances, a final shot of him sitting at the same kitchen table at night alone but now smiling peacefully as he checks his savings progress on the app, the app icon zooms to fill the screen transitioning to the brand logo with a tagline about financial freedom for Vietnamese families"
        duration_seconds: 19
        style: "Cinematic"
        mood: "Happy"
        camera: "Tracking"
        lighting: "Golden Hour"
        aspect_ratio: "16:9"
        narration: ""
    edges:
      - { from: 1, to: 2, label: "" }
      - { from: 2, to: 3, label: "" }
      - { from: 3, to: 4, label: "" }

  - name: "Phóng sự một ngày"
    description: "5 cảnh documentary một ngày: bình minh thức dậy, công việc buổi sáng, tương tác xã hội, đam mê buổi chiều, hoàng hôn suy tư"
    direction: "cinematic"
    scenes:
      - prompt: "the documentary opens before dawn in a traditional Vietnamese fishing village on the central coast, the sky is still deep indigo with only a hint of orange on the horizon, an elderly fisherman in his sixties steps out of his simple bamboo house wearing a worn conical hat and rubber sandals, the camera follows him from behind as he walks down a sandy path between palm trees toward the beach, his bare feet leave footprints in the sand, he carries a rolled fishing net over his shoulder and a small lantern swinging from his other hand casting a warm circle of light that moves with him, the only sounds are the rhythmic crash of waves the distant crow of roosters and the soft crunch of his footsteps, the camera movement is slow and meditative matching the pace of a life lived in harmony with the sea, the lighting transitions from pre-dawn indigo to the first golden rays breaking over the East Sea"
        duration_seconds: 14
        style: "Cinematic"
        mood: "Peaceful"
        camera: "Tracking"
        lighting: "Golden Hour"
        aspect_ratio: "16:9"
        narration: ""
      - prompt: "morning work sequence on the water, the fisherman's round bamboo coracle boat bobs gently on the glassy sea as the sun now fully risen paints everything in warm gold, he casts his net with practiced grace — the circular net opens in the air like a blooming flower before settling onto the water's surface — captured in slow motion from both a drone overhead showing the perfect circle pattern and from a water-level camera capturing his concentrated weathered face, he hauls in the net hand over hand revealing a modest catch of silver fish glittering in the morning light, close-up of his hands — leathery and calloused but moving with the precision of five decades of practice — sorting the fish and throwing back the smallest ones into the sea, other fishermen in their boats pass nearby and they exchange shouted greetings and laughter across the water, the drone pulls back revealing the small fleet of coracle boats dotting the golden sea like fallen petals"
        duration_seconds: 18
        style: "Cinematic"
        mood: "Happy"
        camera: "Crane Up"
        lighting: "Golden Hour"
        aspect_ratio: "16:9"
        narration: ""
      - prompt: "midday transition to the village market where the fisherman has brought his catch, the market is a riot of color and sound — women in áo bà ba tops haggle over prices their voices rising and falling like music, the fisherman sits on a low plastic stool cleaning fish for a customer while sharing a cigarette and stories with the vegetable seller beside him, children run barefoot through the narrow aisles chasing a puppy, an old woman counts coins slowly into his calloused palm, close-up detail shots capture the textures of the market — glistening fish scales on a wooden cutting board fresh green herbs tied with banana leaf strips the cracked leather of his sandals, the camera weaves through the crowd like another villager its movement fluid and unscripted, the lighting is the harsh midday sun filtered through corrugated metal roofing creating dramatic patches of light and shadow"
        duration_seconds: 15
        style: "Cinematic"
        mood: "Energetic"
        camera: "Handheld"
        lighting: "Natural"
        aspect_ratio: "16:9"
        narration: ""
      - prompt: "afternoon sequence showing the fisherman's personal passion and family life, he returns home and instead of resting he heads to a small workshop behind his house where he builds miniature wooden boat models by hand — an art he learned from his father and grandfather, extreme close-up of his weathered hands carefully carving the hull of a small fishing boat with a chisel, wood shavings curl and fall onto his lap, the camera slowly dollies past shelves lined with dozens of completed models — each one a different traditional Vietnamese boat design representing his life's work preserving maritime heritage, his grandson arrives from school and sits beside him asking questions in Vietnamese while the old man patiently teaches him how to sand the wood, the afternoon light pours through the open workshop door illuminating the airborne sawdust like floating gold dust, a vintage radio in the corner plays cải lương opera quietly"
        duration_seconds: 16
        style: "Cinematic"
        mood: "Peaceful"
        camera: "Dolly"
        lighting: "Natural"
        aspect_ratio: "16:9"
        narration: ""
      - prompt: "closing sequence as the sun sets over the same beach where the day began, the fisherman sits on an upturned boat on the sand smoking his pipe and watching the horizon, his wife joins him carrying two cups of hot trà and sits beside him without speaking — a lifetime of companionship expressed in comfortable silence, the sky transitions through a spectacular palette of orange pink purple and finally deep blue, the camera slowly cranes up and away from the couple revealing the entire coastline — the fishing boats returning to shore as dots of light the village beginning to twinkle with electricity the mountains silhouetted against the dying light, the audio transitions to a traditional Vietnamese folk song playing softly as if carried on the evening breeze, a single text card appears with the Vietnamese proverb about the sea giving and the sea taking, the camera continues rising until the scene becomes a painting of light and water, fade to black with the documentary title in simple Vietnamese calligraphy"
        duration_seconds: 17
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
      - { from: 4, to: 5, label: "" }

  - name: "Chuyển đổi trước và sau"
    description: "4 cảnh chuyển đổi cuộc sống: cuộc sống cũ tù túng, quyết định thay đổi, hành trình gian nan, phiên bản mới tự do"
    direction: "explainer"
    scenes:
      - prompt: "the before state presented through a series of confined claustrophobic compositions — a woman in her forties sits at her corporate desk in a glass-walled office, the camera shoots through the glass from outside making her look like an exhibit in a museum, reflections of other office workers moving in the background create a sense of being trapped in a machine, close-up of her hand gripping a coffee mug with visible tension in her knuckles, her reflection in the dark computer monitor shows exhaustion with dark circles under her eyes, the clock on the wall shows 7:45pm but no one is leaving, her desk is clean and organized but soulless — no personal photos no plants no color, everything is beige and gray, the lighting is flat and fluorescent creating an institutional atmosphere, the camera is locked off on a tripod with no movement emphasizing the static trapped nature of her existence, ambient office sounds — keyboard clicking phone ringing photocopier humming — create a suffocating soundscape"
        duration_seconds: 12
        style: "Cinematic"
        mood: "Melancholic"
        camera: "Fixed"
        lighting: "Moody"
        aspect_ratio: "16:9"
        narration: ""
      - prompt: "the turning point — the same woman now lying awake in bed at 3am with her husband asleep beside her, the moonlight through the window casts long blue shadows across the room, she picks up her phone and starts scrolling through photos of herself from college — a young woman with paint-stained hands standing in front of an easel in a sunlit art studio with a huge smile — the contrast between that vibrant creative person and the exhausted professional she has become hits her visibly, a single tear rolls across the bridge of her nose and falls onto the phone screen where it magnifies the pixel of the canvas in the old photo, she closes the phone and stares at the ceiling for a long beat, then gets out of bed determination replacing despair, she walks to her closet and from the very back pulls out a dusty art portfolio tied with ribbon, she unties it with trembling hands and looks at her old paintings — landscapes of Vietnamese countryside life — and a decision forms on her face, the camera slowly pushes in on her determined eyes"
        duration_seconds: 13
        style: "Cinematic"
        mood: "Dramatic"
        camera: "Zoom In"
        lighting: "Moody"
        aspect_ratio: "16:9"
        narration: ""
      - prompt: "the journey montage depicting the difficult transition — she takes night art classes after work captured in quick scenes of her hands relearning brush techniques with visible frustration then gradual improvement, she quits her job symbolized by her placing her ID badge on the boss's desk in slow motion with her hand trembling, she sells her paintings at a weekend market where the first few hours no one stops and her face shows the fear of failure, then a young girl buys a small painting for her mother and the transaction — a simple exchange of crumpled bills — becomes the most meaningful sale of her life, she converts her garage into a tiny studio painting through the night with headphones on while her family sleeps, the camera captures the accumulation of effort — paint-covered hands late nights with coffee cups stacked creative breakthroughs at dawn — each setback and small victory building toward transformation, the music is a mix of traditional Vietnamese instruments and modern indie folk reflecting her journey of honoring heritage while embracing change"
        duration_seconds: 15
        style: "Cinematic"
        mood: "Peaceful"
        camera: "Handheld"
        lighting: "Natural"
        aspect_ratio: "16:9"
        narration: ""
      - prompt: "the after state — two years later the same woman now stands in her own art gallery in Hoi An's old town, the space is a beautifully restored traditional wooden house with her paintings covering the walls, she wears a flowing linen dress and her face is relaxed and radiant, tourists and locals admire her work and she speaks with them about the inspiration behind each piece with the confident passion of someone doing exactly what they were meant to do, her husband and children arrive with flowers and her daughter runs to hug her legs, a framed photo on the reception desk shows the very first crumpled-bill sale from the market, the camera slowly dollies through the gallery showing each painting — landscapes of Vietnam rendered with the skill of a mature artist — then pushes through the back door into a sun-filled courtyard where her easel is set up with a work in progress, she sits down and picks up her brush and the final shot mirrors the old college photo but now with the wisdom and peace of someone who found their way back, a simple text card appears reading in Vietnamese about never being too old to become who you were always meant to be, the music resolves with a traditional đàn tranh zither melody"
        duration_seconds: 17
        style: "Cinematic"
        mood: "Happy"
        camera: "Dolly"
        lighting: "Golden Hour"
        aspect_ratio: "16:9"
        narration: ""
    edges:
      - { from: 1, to: 2, label: "" }
      - { from: 2, to: 3, label: "" }
      - { from: 3, to: 4, label: "" }
---

# Storyboard Video

Kịch bản video kể chuyện điện ảnh với mạch truyện rõ ràng và hành trình cảm xúc. Phù hợp cho phim ngắn, brand storytelling, và music video.

## Hướng dẫn prompt
- Sử dụng direction cinematic để có chất lượng điện ảnh
- Mỗi cảnh nên có chỉ dẫn rõ về chuyển động máy quay
- Xây dựng mạch truyện: mở đầu → phát triển → cao trào → kết thúc
