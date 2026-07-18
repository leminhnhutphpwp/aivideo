---
id: short_form_ads
label: Short-Form Ads
label_en: Short-Form Ads
featured: true
capability: t2v
direction_hints: ["social-ad"]
mood_hints: ["Energetic", "Happy"]
camera_hints: ["Fixed", "Zoom In"]
lighting_hints: ["Natural", "Neon"]
aspect_hints: ["9:16"]
duration_hint: "5–15s per scene"
style_keywords: ["short form ad", "vertical video", "TikTok ad", "Instagram Reel ad", "YouTube Shorts", "quick cut", "hook first 2 seconds", "bold text overlay", "trending audio", "viral", "scroll stopping", "pattern interrupt", "swipe up", "fast pace", "mobile first"]
prompt_template: "short-form {video_type} ad, {direction} direction, {mood} mood, {camera} camera, {lighting} lighting, attention-grabbing hook in first 2 seconds, fast-paced quick cuts, bold kinetic typography, mobile-first vertical format, {negative}"
anti_patterns: ["slow start", "long intro", "horizontal format", "no hook", "passive", "boring", "static text", "quiet audio"]
default_negative: "slow, horizontal, no hook, passive, boring, static, quiet, low energy, text heavy, long intro, fade transition"
example_prompt: "first frame a giant bold text BETTER SLEEP IN 7 DAYS fills the screen against a neon purple background with a bass drop, quick cut to a split screen showing someone tossing and turning on the left vs sleeping peacefully on the right after using a weighted blanket, rapid montage of 5-star reviews appearing as floating text bubbles, ending on a single product shot with the price crossed out and a new lower price flashing, trending lo-fi remix playing throughout, vertical 9:16, 15 seconds"
example_prompt_vi: "khung hình đầu tiên dòng chữ đậm khổng lồ NGỦ NGON HƠN SAU 7 NGÀY lấp đầy màn hình trên nền tím neon với tiếng bass drop, cắt nhanh sang split screen một bên người trằn trọc bên trái vs ngủ yên bình bên phải sau khi dùng chăn trọng lực, montage nhanh các đánh giá 5 sao xuất hiện dưới dạng bong bóng text nổi, kết thúc với một ảnh sản phẩm duy nhất với giá cũ bị gạch và giá mới thấp hơn nhấp nháy, nhạc lo-fi remix trending xuyên suốt, dọc 9:16, 15 giây"
best_for:
  - "TikTok and Instagram Reel advertising"
  - "YouTube Shorts promotional content"
  - "Mobile-first brand awareness campaigns"
  - "App install and download ads"
when_to_use:
  - "Cần quảng cáo ngắn trên TikTok, Reel, Shorts"
  - "Nội dung cần gây chú ý trong 2 giây đầu"
  - "Chiến dịch cần format dọc, nhịp nhanh"
template_flows:
  - name: "Quảng cáo TikTok viral"
    description: "4 cảnh quảng cáo TikTok viral: hook gây sốc, montage social proof, tính năng sản phẩm, CTA kèm trend"
    direction: "social-ad"
    scenes:
      - prompt: "vertical phone POV opening on a bold statement text that fills the entire screen against a neon purple background with glitch distortion effects, the text reads 'IF YOU DO THIS ONE THING WRONG' then the screen shakes violently and the text slams into a new phrase '—YOUR SKIN IS SUFFERING' with a bass-boosted drop and screen flash, the background animates with rapidly scrolling emoji reactions — skull emoji shocked face fire emoji — mimicking a viral TikTok comment section, the entire sequence lasts exactly two seconds and is designed to be physically impossible to scroll past, the typography is large bold and slightly chaotic with motion tracking, the energy is pure pattern-interrupt designed to freeze the thumb mid-scroll in any feed"
        duration_seconds: 3
        style: "Minimalist"
        mood: "Energetic"
        camera: "Fixed"
        lighting: "Neon"
        aspect_ratio: "9:16"
        narration: ""
      - prompt: "fast-cut montage of three different young people in their authentic environments reacting to the hook statement, a college student in her dorm room with fairy lights stops mid-scroll and leans into her phone with a shocked expression, a young professional on his lunch break in a sunlit park looks down at his phone and nods in agreement, a fitness enthusiast in a gym locker room pauses between sets to watch, each reaction is a quick one-second clip stitched together with trending transition effects — a whip pan a snappy zoom a screen swipe — the background music shifts to a trending TikTok audio track with a heavy beat drop, text captions appear at the bottom in the TikTok native style alternating between words highlighting the key problem being solved"
        duration_seconds: 5
        style: "Realistic"
        mood: "Energetic"
        camera: "Handheld"
        lighting: "Natural"
        aspect_ratio: "9:16"
        narration: ""
      - prompt: "the solution reveal sequence as the main character — a relatable Vietnamese woman in her late twenties with clear glowing skin — appears in her minimalist bathroom holding the hero skincare product, she demonstrates the correct method the hook teased earlier, she applies the product with slow deliberate motions while speaking directly to the camera in a friendly coaching tone, quick B-roll cuts show macro close-ups of the product texture the applicator mechanism and her skin before and after, kinetic text callouts pop up beside her head with key ingredients and benefits, the lighting shifts from the cool hook aesthetic to warm flattering natural bathroom light, the before-after transformation is shown in a side-by-side split within the same frame, genuine creator energy not scripted commercial talent"
        duration_seconds: 8
        style: "Realistic"
        mood: "Happy"
        camera: "Handheld"
        lighting: "Natural"
        aspect_ratio: "9:16"
        narration: ""
      - prompt: "the final conversion frame designed for the TikTok shop ecosystem, the product appears in a floating hero shot with the orange shopping cart icon pulsing at the bottom — TikTok's native purchase button placement, the price flashes with a limited-time discount badge and crossed-out original price, scrolling user reviews appear as green-screen-style text bubbles popping up organically — five stars 'changed my skin in a week' 'my mom asked what I'm using' — the creator's voice continues in voiceover with a personal testimonial and a genuine recommendation, a trending sound plays at peak energy, the video ends with a transition to a related-product carousel that the TikTok algorithm would naturally serve next, designed for maximum watch time and conversion within the platform's native behavior patterns"
        duration_seconds: 5
        style: "Minimalist"
        mood: "Energetic"
        camera: "Fixed"
        lighting: "Studio Soft"
        aspect_ratio: "9:16"
        narration: ""
    edges:
      - { from: 1, to: 2, label: "" }
      - { from: 2, to: 3, label: "" }
      - { from: 3, to: 4, label: "" }

  - name: "Sản phẩm Instagram Reel"
    description: "4 cảnh Reel quảng cáo: aesthetic hook, lifestyle đẹp, sản phẩm hero, swipe-up CTA"
    direction: "social-ad"
    scenes:
      - prompt: "opening on a perfectly composed aesthetic frame — a marble countertop with fresh flowers a steaming matcha latte in a ceramic mug and morning sunlight creating diagonal shadows across the scene, the camera slowly pushes in on the hero product — a sleek reusable water bottle — that sits among the lifestyle props looking like it belongs in an Architectural Digest photoshoot, the color palette is intentional and cohesive — sage green cream and brushed gold — the first text overlay fades in with a delicate serif font reading 'your morning routine just got an upgrade', no aggressive hooks just pure aesthetic aspiration, the pacing is calm and deliberate like a visual exhale, designed for the Instagram audience that values beauty and curation, warm natural lighting with soft golden tones"
        duration_seconds: 6
        style: "Realistic"
        mood: "Peaceful"
        camera: "Dolly"
        lighting: "Golden Hour"
        aspect_ratio: "9:16"
        narration: ""
      - prompt: "lifestyle sequence following a stylish woman through her morning routine, she walks barefoot on light oak flooring in a sun-filled apartment wearing a linen robe, she fills the water bottle at a filtered water tap and the camera captures the water stream in slow motion with backlight making each droplet sparkle, she adds lemon slices and fresh mint from a small herb garden on her windowsill, then carries the bottle to her home office where the morning light hits her desk perfectly, she takes a sip while reviewing her planner looking content and focused, the bottle is always in frame but never forced — it fits naturally into the aspirational lifestyle being depicted, the camera movement is smooth and floating like a gentle handheld glide, the editing rhythm matches a popular lo-fi beat"
        duration_seconds: 10
        style: "Cinematic"
        mood: "Peaceful"
        camera: "Handheld"
        lighting: "Golden Hour"
        aspect_ratio: "9:16"
        narration: ""
      - prompt: "transition to a studio-style product hero sequence, the water bottle now isolated on a clean neutral background with diffused rim lighting that traces its elegant silhouette, the camera performs a slow 360-degree orbit revealing the design details — the vacuum-insulated double wall the leak-proof bamboo cap the time-marker engravings down the side, each feature gets a quick macro close-up with elegant animated text callouts appearing in the brand's signature font, ice cubes clink inside the bottle as it rotates demonstrating the audible quality, the temperature retention is shown with a subtle visual — condensation forming only on the outside of a non-insulated competitor bottle beside it while the hero bottle stays perfectly dry, premium ASMR-like product presentation"
        duration_seconds: 7
        style: "Realistic"
        mood: "Peaceful"
        camera: "Dolly"
        lighting: "Studio Soft"
        aspect_ratio: "9:16"
        narration: ""
      - prompt: "closing frame tailored for Instagram's native shopping experience, the product returns to a lifestyle setting — now sitting on a café table with the woman's hand wrapped around it and a partially visible pastry plate — the 'View Shop' tag appears at the bottom where Instagram places its native shopping button, the price appears elegantly beside the product, a subtle arrow animation points upward suggesting the swipe-up motion for the link in stories or the tap for the shop tag in Reels, the brand name and a short tagline appear in refined lowercase typography at the top, the music fades to a gentle melodic resolution, the final frame is saved to the user's shopping collection by the algorithm's design, conversion through aspiration not aggression"
        duration_seconds: 7
        style: "Realistic"
        mood: "Peaceful"
        camera: "Fixed"
        lighting: "Natural"
        aspect_ratio: "9:16"
        narration: ""
    edges:
      - { from: 1, to: 2, label: "" }
      - { from: 2, to: 3, label: "" }
      - { from: 3, to: 4, label: "" }

  - name: "Hook YouTube Shorts"
    description: "4 cảnh YouTube Shorts: hook 2 giây, vấn đề người xem gặp, giải pháp sản phẩm, subscribe CTA"
    direction: "social-ad"
    scenes:
      - prompt: "the first frame hits with maximum impact — a side-by-side comparison filling the vertical screen, on the left raw unedited footage of a messy room with clutter everywhere and a frustrated person throwing their hands up, on the right the same room transformed into a beautifully organized space with the person relaxed on the couch reading a book, the text 'FROM THIS TO THIS' slams across the center with a satisfying snap sound effect, a big red circle appears around the right side with an arrow pointing to the organizing product sitting on the shelf, everything about this opening is designed for the YouTube Shorts viewer who's judging whether to swipe away in under one second, the contrast is so stark and the resolution so desirable that it triggers immediate curiosity, harsh before lighting vs warm after lighting reinforces the transformation"
        duration_seconds: 3
        style: "Minimalist"
        mood: "Energetic"
        camera: "Fixed"
        lighting: "Natural"
        aspect_ratio: "9:16"
        narration: ""
      - prompt: "the creator appears in a talking-head format standing in the 'after' organized room speaking energetically to camera, she explains the three biggest organizing mistakes people make and shows each one visually — mistake one piling things on chairs she tosses clothes onto a chair dramatically, mistake two buying storage without measuring she holds up a bin that clearly doesn't fit its shelf, mistake three organizing by room instead of by category she gestures to scattered items around the house — each mistake is illustrated in under two seconds with a quick visual gag that makes the content both informative and entertaining, picture-in-picture inserts show close-ups of the mistakes with bold red X marks appearing, the caption text at the bottom is large and readable with keywords emphasized, her energy is high and her delivery is fast-paced and conversational"
        duration_seconds: 10
        style: "Realistic"
        mood: "Energetic"
        camera: "Handheld"
        lighting: "Natural"
        aspect_ratio: "9:16"
        narration: ""
      - prompt: "the solution montage begins with the creator pulling out the hero organizing product — modular drawer dividers — and demonstrating the correct approach, she measures her drawer with a tape measure in a quick satisfying clip, then the dividers click into place with perfect fit and a satisfying snap sound, she sorts items into categories and places them in the compartments showing how much more fits when organized properly, the footage speeds up into a satisfying time-lapse of the transformation happening in seconds, each compartment fills with neatly arranged items, a final pull-back reveals the stunning organized drawer in all its glory, text overlays highlight the product name and key specs — adjustable fits any drawer expandable up to four compartments — all while the creator's voice continues over in voiceover, the before-and-after of just the drawer fills half the screen"
        duration_seconds: 10
        style: "Realistic"
        mood: "Happy"
        camera: "Fixed"
        lighting: "Studio Soft"
        aspect_ratio: "9:16"
        narration: ""
      - prompt: "the closing segment is optimized for YouTube Shorts engagement metrics, the creator holds the product package up to the camera with a shopping link displayed as a YouTube product tag in the corner, she gives a clear direct call to action — tap the product tag or check the link in the comments — while demonstrating the product one final time, the screen splits to show three related Shorts thumbnails on the right side mimicking YouTube's suggested content panel, a subscribe button animation appears with the channel name and a reminder about weekly organizing tips, the video ends on a satisfying final shot of the organized drawer closing smoothly, the ending is designed to maximize watch time retention and trigger the YouTube algorithm to recommend the next video in the series, the music builds to a bright resolving chord"
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

  - name: "Quảng cáo cài đặt ứng dụng"
    description: "3 cảnh quảng cáo cài app: pain point, app giải quyết, download CTA với rating"
    direction: "social-ad"
    scenes:
      - prompt: "a young woman sits on her bed at night illuminated only by her phone screen, her face shows frustration as she scrolls rapidly through some generic app, the phone screen is reflected in her glasses showing a cluttered confusing interface, text overlays appear on screen mimicking her internal thoughts — 'why is this so complicated' 'there has to be a better way' 'I just want it to work' — each thought bubble appears and pops with a disappointed tone, the room is dim with cool blue light from the phone creating a lonely isolated atmosphere, the camera slowly pushes in on her exhausted expression as she tosses her phone onto the bed beside her and rubs her temples, the moment captures a universal pain point that millions of app users experience daily — the feeling that technology should be easier"
        duration_seconds: 7
        style: "Realistic"
        mood: "Melancholic"
        camera: "Zoom In"
        lighting: "Natural"
        aspect_ratio: "9:16"
        narration: ""
      - prompt: "a friend's hand enters frame from the side holding a different phone with a bright clean app interface visible, the screen glows warmly illuminating both faces, the woman looks up curious as her friend swipes through the app with exaggerated ease — smooth animations intuitive layout beautiful design — in three rapid cuts each showing a different feature of the app being used effortlessly, the color grade shifts dramatically from cold blue to warm golden tones as the app's screen light fills the space, the friend demonstrates with genuine enthusiasm pointing to features like one-tap ordering real-time tracking and personalized recommendations, quick screen recordings of the app interface fill the frame showing the polished UI, the contrast between the complicated old app and the new solution is visually undeniable"
        duration_seconds: 8
        style: "Realistic"
        mood: "Happy"
        camera: "Handheld"
        lighting: "Natural"
        aspect_ratio: "9:16"
        narration: ""
      - prompt: "the final frame is a clean app-store-style presentation, the app icon appears large and prominently in the center with a subtle 3D rotation showing its polished design, beneath it the app name and developer name appear in clean typography, a star rating of four-point-eight fills in with animated stars and the review count displays beside it, three key feature bullets swipe in from the left — each with a corresponding icon — below them the install button appears as a prominent colorful call-to-action matching the platform's native style, the background transitions to the app's signature gradient with floating interface screenshots orbiting the icon, a QR code appears in the bottom corner for instant camera scanning, the woman from the opening appears in a small circle at the top with a huge smile and thumbs up indicating her approval, the entire composition is designed to look like the moment before someone taps install"
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
---

# Short-Form Ads

Quảng cáo ngắn dọc tối ưu cho mobile với hook gây chú ý trong 2 giây đầu. Phù hợp cho TikTok Ads, Reel Ads, và YouTube Shorts.

## Hướng dẫn prompt
- 2 giây đầu tiên phải có hook gây chú ý mạnh
- Dùng bold text overlay và quick cuts
- Luôn format dọc 9:16, nhịp nhanh
