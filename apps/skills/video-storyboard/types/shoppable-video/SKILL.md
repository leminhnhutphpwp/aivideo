---
id: shoppable_video
label: Shoppable Video
label_en: Shoppable Video
featured: true
capability: t2v
direction_hints: ["review", "product-reveal"]
mood_hints: ["Happy", "Energetic"]
camera_hints: ["Fixed", "Handheld"]
lighting_hints: ["Natural", "Studio Soft"]
aspect_hints: ["9:16", "1:1"]
duration_hint: "5–15s per scene"
style_keywords: ["shoppable video", "e-commerce", "live shopping", "product tagging", "add to cart", "interactive", "clickable overlay", "purchase flow", "social commerce", "TikTok Shop", "Instagram Shopping", "video commerce", "conversion", "product link", "swipe up"]
prompt_template: "shoppable {video_type} video, {direction} direction, {mood} mood, {camera} camera, {lighting} lighting, interactive product tags, clear purchase flow, social commerce optimized, shoppable overlay elements, {negative}"
anti_patterns: ["static image", "no product interaction", "passive viewing", "no CTA", "complex checkout"]
default_negative: "static, passive, no CTA, complex, text overlay, watermark, low quality, dark, unclickable, confusing layout"
example_prompt: "a fashion influencer holding up a trench coat in natural window light, as she describes the fabric a shoppable tag appears on the coat with a shopping bag icon and the price, she swipes her hand and the tag animates to a navy blue variant, another tag appears on her boots with a tap to shop animation, the bottom of the frame shows a persistent add all to cart button with a countdown timer, vertical 9:16, 4K, 20 seconds"
example_prompt_vi: "một influencer thời trang cầm áo trench coat dưới ánh sáng cửa sổ tự nhiên, khi cô mô tả chất vải một tag mua sắm xuất hiện trên áo với icon túi mua sắm và giá tiền, cô vuốt tay và tag chuyển animation sang biến thể màu navy, một tag khác xuất hiện trên đôi boots với animation tap to shop, phía dưới khung hình hiển thị nút add all to cart cố định với đồng hồ đếm ngược, dọc 9:16, 4K, 20 giây"
best_for:
  - "Live shopping and social commerce streams"
  - "TikTok Shop and Instagram Shopping videos"
  - "Product discovery with instant purchase"
  - "Fashion and beauty try-on hauls with links"
when_to_use:
  - "Cần video có thể mua hàng trực tiếp"
  - "Nội dung live stream hoặc video thương mại"
  - "Sản phẩm cần demo và có nút mua ngay"
template_flows:
  - name: "Demo bán hàng livestream"
    description: "4 cảnh live shopping: chào sân và giới thiệu bộ sưu tập, demo sản phẩm chính, biến thể và upsell, chốt đơn giới hạn"
    direction: "review"
    scenes:
      - prompt: "a charismatic Vietnamese host stands in a beautifully styled live-stream studio set with warm ambient lighting and a curated product display table behind her, she greets the audience with direct eye contact and a welcoming wave, her outfit is stylish and aspirational in a way that makes viewers want to emulate her style, the camera is on a tripod at eye level framed as a medium shot, a live chat feed scrolls on the left side of the screen with heart emojis and viewer usernames popping up, she picks up the first product — a premium handbag — and a shoppable tag appears on it with the price and a shopping cart icon, the bottom of the frame shows a persistent view all products button, the atmosphere is warm professional and trustworthy"
        duration_seconds: 12
        style: "Realistic"
        mood: "Happy"
        camera: "Fixed"
        lighting: "Studio Soft"
        aspect_ratio: "9:16"
        narration: ""
      - prompt: "close-up product demonstration as the host brings the handbag closer to the camera lens, her hands show every detail — the stitching quality the gold-tone hardware the interior compartments — each touch triggers a corresponding shoppable tag to appear and pulse briefly, she slings the bag over her shoulder in a full-length mirror shot showing how it falls on the body and fits everyday essentials, the mirror reflection adds a second angle naturally, animated arrows and text callouts highlight key features as she mentions them, each feature tag has a small info icon that suggests expandable product details, the camera smoothly switches between close-up detail shots and medium mirror shots to maintain visual variety"
        duration_seconds: 15
        style: "Realistic"
        mood: "Happy"
        camera: "Zoom In"
        lighting: "Studio Soft"
        aspect_ratio: "9:16"
        narration: ""
      - prompt: "the host presents product variants and complementary items on a rotating display stand, three color variants of the same handbag spin slowly on the turntable — classic black camel tan and deep burgundy — as she points to each one the shoppable tag updates to show the specific color name stock status and price, she then reaches for a matching wallet and silk scarf from the display creating a styled ensemble, a bundle deal badge appears with a special combined price and savings amount, the camera moves to an overhead flat-lay shot showing the full outfit layout with each item tagged and ready to purchase, she explains the savings with genuine enthusiasm making the upsell feel like helpful advice from a stylish friend"
        duration_seconds: 14
        style: "Realistic"
        mood: "Energetic"
        camera: "Dolly"
        lighting: "Studio Soft"
        aspect_ratio: "9:16"
        narration: ""
      - prompt: "urgent closing segment with the camera pushing in slightly tighter on the host's face and upper body, the background lighting dims to focus all attention on her and the final call to action, a large countdown timer appears at the top of the frame showing the live stream ending in three minutes, limited stock warnings flash on the most popular variants — only two left in burgundy, five left in black — the host speaks with kind but genuine urgency reminding viewers these are limited edition pieces, a prominent add-to-cart button pulses at the bottom of the screen with a gentle glow, confetti particles fall briefly as purchase notifications pop up showing viewer names who just bought, the host thanks buyers by name and waves goodbye with a warm smile"
        duration_seconds: 12
        style: "Realistic"
        mood: "Energetic"
        camera: "Zoom In"
        lighting: "Studio Soft"
        aspect_ratio: "9:16"
        narration: ""
    edges:
      - { from: 1, to: 2, label: "" }
      - { from: 2, to: 3, label: "" }
      - { from: 3, to: 4, label: "" }

  - name: "Thử đồ haul"
    description: "4 cảnh haul thử đồ: giới thiệu items, thử đồ trước gương, close-up chi tiết, kết luận và link mua"
    direction: "review"
    scenes:
      - prompt: "a fashion creator sits cross-legged on a plush bedroom rug surrounded by shopping bags from recognizable brands, natural afternoon light streams through large windows creating a warm inviting atmosphere, she picks up each bag one by one holding it up to the camera with the brand logo visible and gives a quick teaser of what's inside, the bags are arranged in a semi-circle around her like a treasure haul, a shoppable tag appears on each bag as she touches it showing the retailer name and collection, the room has personal touches — a gallery wall of photos a cozy throw blanket plants — making it feel like a friend's bedroom not a set, her energy is genuinely excited like she's sharing finds with best friends"
        duration_seconds: 10
        style: "Realistic"
        mood: "Happy"
        camera: "Fixed"
        lighting: "Natural"
        aspect_ratio: "9:16"
        narration: ""
      - prompt: "the try-on montage begins — the creator steps in front of a full-length ornate mirror with the camera positioned to capture both her reflection and her real self from behind, she pulls the first dress over her head and smooths it down twirling once to show the movement and fit, a shoppable tag pins to the dress with the size worn price and available color options, she steps closer to the mirror to inspect the fit touching the waist and shoulders then turns to the camera with a genuine reaction, this sequence repeats for each outfit with quick transitions — a swipe of her hand across the frame acts as a transition to the next outfit — each look is only about five seconds keeping the pace brisk and entertaining, the mirror reflects the room's warm lighting creating flattering angles"
        duration_seconds: 20
        style: "Realistic"
        mood: "Happy"
        camera: "Handheld"
        lighting: "Natural"
        aspect_ratio: "9:16"
        narration: ""
      - prompt: "detail close-up sequence now that all outfits have been previewed, the camera moves to macro shots of the most impressive pieces — the intricate lacework on a blouse collar catching the light, the silky texture of a slip dress flowing like water as her hand runs over it, the delicate chain of a necklace layered over a top sparkling, each close-up triggers a new shoppable tag with a tap-to-zoom animation inviting the viewer to examine the detail themselves, a picture-in-picture overlay in the corner shows the full outfit for context while the main frame stays on the detail, the lighting is soft and diffused to eliminate harsh shadows on the delicate fabrics, the ASMR-like focus on textures creates a sensory shopping experience"
        duration_seconds: 12
        style: "Realistic"
        mood: "Peaceful"
        camera: "Zoom In"
        lighting: "Studio Soft"
        aspect_ratio: "9:16"
        narration: ""
      - prompt: "wrap-up scene with the creator changed back into her cozy loungewear sitting on the edge of her bed, she holds up her phone showing the shopping cart screen with all the featured items added, she gives her honest ranking — which pieces were the best value which surprised her and which she would skip — building trust through transparency, each item she mentions has its shoppable tag reappear with a final chance to purchase, the bottom of the frame has a persistent shop the haul button that collects all items into one cart, she ends with a warm sign-off and a playful reminder to check the link in bio, the lighting has shifted to warm cozy evening tones with fairy lights twinkling in the background"
        duration_seconds: 13
        style: "Realistic"
        mood: "Happy"
        camera: "Fixed"
        lighting: "Natural"
        aspect_ratio: "9:16"
        narration: ""
    edges:
      - { from: 1, to: 2, label: "" }
      - { from: 2, to: 3, label: "" }
      - { from: 3, to: 4, label: "" }

  - name: "Đếm ngược flash sale"
    description: "3 cảnh flash sale: teaser deal sắp diễn ra, sản phẩm và giá sốc, đồng hồ đếm ngược chốt đơn"
    direction: "product-reveal"
    scenes:
      - prompt: "a dramatic countdown clock dominates the screen with giant red numbers ticking down from ten, the background is a moody dark studio with red accent lighting creating urgency and excitement, as the timer reaches five seconds quick flashes of products appear momentarily — a smartphone a designer watch premium headphones — each flash reveals a shoppable tag with the upcoming sale price partially obscured by motion blur to build anticipation, the sound design features a racing heartbeat that accelerates as the countdown approaches zero, the camera shakes slightly with each number change like a bass vibration, the frame composition is aggressive and commanding designed to stop the scroll and hold attention, the red lighting creates a sense of limited-time opportunity"
        duration_seconds: 8
        style: "Minimalist"
        mood: "Energetic"
        camera: "Fixed"
        lighting: "Dramatic"
        aspect_ratio: "9:16"
        narration: ""
      - prompt: "the countdown hits zero and the screen explodes into vibrant color, the main product — a premium smartwatch — appears in a hero composition on a sleek rotating pedestal against a clean white background now bathed in the brand's signature color wash, the original price appears first in large type then gets dramatically slashed with a red line and the flash sale price replaces it with a celebratory burst of confetti, shoppable tags pin to every visible product feature — the display the band material the health sensor the water resistance rating — each tag showing specs and the variant price, a progress bar appears showing limited stock depleting in real-time with sixty percent already claimed, the energy is electric and the value proposition is impossible to ignore"
        duration_seconds: 10
        style: "Realistic"
        mood: "Energetic"
        camera: "Dolly"
        lighting: "Studio Soft"
        aspect_ratio: "9:16"
        narration: ""
      - prompt: "final urgency sequence with the product still visible but now partially transparent behind a dominant flash sale overlay, the countdown timer resumes counting down from five minutes with large legible digits, a live purchase counter shows the number of units sold updating rapidly every few seconds, scrolling testimonials from verified buyers appear in a ticker at the bottom — short enthusiastic quotes like 'best deal ever' and 'just ordered two' — the add-to-cart button at the bottom has transformed into a larger 'Claim Deal' button with an aggressive pulse animation and a limited-per-customer notice, a QR code appears briefly for mobile users to scan and purchase instantly, the scene ends with the timer reaching a critical low point and the stock bar nearly empty, maximum urgency for maximum conversion"
        duration_seconds: 7
        style: "Minimalist"
        mood: "Energetic"
        camera: "Fixed"
        lighting: "Dramatic"
        aspect_ratio: "9:16"
        narration: ""
    edges:
      - { from: 1, to: 2, label: "" }
      - { from: 2, to: 3, label: "" }
---

# Shoppable Video

Video thương mại tương tác với tag sản phẩm và luồng mua hàng trực tiếp. Phù hợp cho live shopping, TikTok Shop, và social commerce.

## Hướng dẫn prompt
- Sử dụng direction review hoặc product-reveal
- Đảm bảo sản phẩm được hiển thị rõ ràng để gắn tag
- Có CTA mua hàng rõ ràng trong video
