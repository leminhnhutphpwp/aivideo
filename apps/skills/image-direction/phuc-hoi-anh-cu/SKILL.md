---
mode: image
surface: image
id: phuc-hoi-anh-cu
label: Phục hồi ảnh cũ
label_en: Old Photo Restoration
description: "Phục hồi ảnh cũ hư hỏng — vá vết xước/rách, khử ố mốc, làm nét, tô màu tự nhiên cho ảnh đen trắng — GIỮ NGUYÊN nội dung, khuôn mặt, bố cục và tỉ lệ gốc, chỉ khôi phục chất lượng."
example_prompt: "restore this damaged old photo, keep the exact same content, faces, composition and framing, only repair the damage: remove scratches, tears, stains and mold spots, reduce noise and blur, sharpen fine details, and add natural realistic color to the black-and-white image, photorealistic, faithful to the original people and scene"
example_prompt_vi: "phục hồi tấm ảnh cũ hư hỏng này, giữ NGUYÊN nội dung, khuôn mặt, bố cục và khung hình, chỉ sửa hư hỏng: xoá vết xước, rách, ố và mốc, giảm nhiễu và mờ, làm nét chi tiết, và tô màu tự nhiên chân thực cho ảnh đen trắng, chân thực, trung thành với người và cảnh gốc"
aspect_hints: ["4:3", "1:1", "3:4"]
mood_tones: ["Peaceful", "Natural", "Melancholic"]
style_keywords: ["old photo restoration", "preserve faces and content", "scratch and tear removal", "stain and mold cleanup", "denoise and deblur", "detail sharpening", "natural realistic colorization", "photorealistic", "faithful to original", "archival restoration", "identity fidelity", "before-after photo repair"]
prompt_template: "photorealistic restoration of {subject}, the old damaged photo repaired and gently colorized while preserving the exact same content, faces, composition and framing, only quality restored, faithful to the original, {negative}"
anti_patterns: ["changing faces or identity", "altering the people", "changing the composition", "different framing", "adding or removing people", "cartoon beautification", "unnatural colors", "over-smoothed plastic skin"]
default_negative: "changed faces, altered identity, different people, added or removed people, changed composition, different framing, cartoon, illustration, over-smoothed plastic skin, unnatural colors, oversaturated, hallucinated details, distorted features, blurry, low quality, watermark, text"
color_palette:
  - { name: "Natural Skin", hex: "#E3B49C", role: "Realistic skin tones" }
  - { name: "Vintage Warm", hex: "#D8C3A0", role: "Period-appropriate warmth" }
  - { name: "Soft White", hex: "#F2EEE4", role: "Cleaned highlights" }
  - { name: "Deep Sepia Shadow", hex: "#3A2E22", role: "Restored depth" }
  - { name: "Muted Blue", hex: "#7C93A6", role: "Natural cool tones" }
  - { name: "Faded Green", hex: "#6E7A52", role: "Natural foliage/fabric" }
visual_elements:
  - "Exact same content, faces, composition and framing as the input"
  - "Removed scratches, tears, stains and mold, with clean surfaces"
  - "Reduced noise and blur, with sharpened but natural detail"
  - "Natural, realistic colorization faithful to the era and subjects"
  - "Preserved facial identity and expressions"
  - "Photorealistic, archival-quality restoration"
style_rules_do:
  - "Preserve the exact faces, identity, content, composition and framing"
  - "Repair damage and restore clarity only"
  - "Colorize black-and-white images naturally and believably"
  - "Keep skin tones and colors realistic and period-appropriate"
  - "Maintain natural detail without over-smoothing"
style_rules_dont:
  - "Do not change faces, identity, or the people present"
  - "Do not alter the composition or framing"
  - "Do not add or remove people or objects"
  - "Avoid cartoon beautification or plastic over-smoothed skin"
  - "No unnatural or oversaturated colors"
best_for:
  - "Phục hồi ảnh gia đình cũ, ảnh thờ, ảnh kỷ niệm hư hỏng"
  - "Tô màu ảnh đen trắng tự nhiên"
  - "Ảnh 'trước → sau' phục hồi ảnh cũ"
  - "Dịch vụ phục hồi ảnh, nội dung cảm xúc TikTok/Reels"
---

# Phục hồi ảnh cũ (Old Photo Restoration)

Preset i2i phục hồi ảnh cũ hư hỏng (xước, rách, ố, mờ, nhiễu) và tô màu tự nhiên cho ảnh đen trắng
mà **giữ nguyên nội dung, khuôn mặt, danh tính và bố cục gốc**. Nhấn mạnh **giữ đúng khuôn mặt** —
tránh làm đổi người, biến dạng nét mặt, hay da nhựa.
