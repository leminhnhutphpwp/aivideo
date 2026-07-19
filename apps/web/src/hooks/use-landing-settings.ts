export type ResolvedLandingSettings = {
  hero_label: string;
  hero_title_line1: string;
  hero_title_line2: string;
  hero_subtitle: string;
  hero_cta_text: string;
  hero_cta_url: string;
  hero_typewriter_words: string;
  portal_label_texts: string;
  portal_title_line1: string;
  portal_title_line2: string;
  portal_subtitle: string;
  portal_cta_text: string;
  portal_login_text: string;
  portal_login_label: string;
  reel_label: string | null;
  reel_title_line1: string | null;
  reel_title_line2: string | null;
  intro_label: string | null;
  intro_title_line1: string | null;
  intro_title_line2: string | null;
  intro_subtitle: string | null;
  intro_features: string | null;
  genesis_label: string | null;
  genesis_title_line1: string | null;
  genesis_title_line2: string | null;
  forge_label: string | null;
  forge_cta_text: string | null;
  workflow_label: string | null;
  director_label: string | null;
  director_title_line1: string | null;
  director_title_line2: string | null;
  director_subtitle: string | null;
  gallery_label: string | null;
  gallery_title_line1: string | null;
  gallery_title_line2: string | null;
  sound_label: string | null;
  sound_title_line1: string | null;
  sound_title_line2: string | null;
  ecosystem_label: string | null;
  ecosystem_title_line1: string | null;
  ecosystem_title_line2: string | null;
  ecosystem_subtitle: string | null;
  stats_label: string | null;
  stats_title_line1: string | null;
  stats_title_line2: string | null;
  vision_label: string | null;
  vision_title_line1: string | null;
  vision_title_line2: string | null;
  vision_description_p1: string | null;
  vision_description_p2: string | null;
  footer_copyright: string | null;
  footer_privacy_url: string | null;
  footer_terms_url: string | null;
  footer_contact_url: string | null;
};

const DEFAULTS: ResolvedLandingSettings = {
  hero_label: "Nền Tảng AI Video",
  hero_title_line1: "WAVISE STUDIO",
  hero_title_line2: "SÁNG TẠO THEO CÁCH CỦA BẠN",
  hero_subtitle: "Nền tảng tạo video AI chuyên nghiệp. Biến ý tưởng thành video chất lượng cao chỉ trong vài phút.",
  hero_cta_text: "Trải nghiệm miễn phí",
  hero_cta_url: "/dashboard",
  hero_typewriter_words: "nhanh chóng, dễ dàng, chuyên nghiệp, sáng tạo",
  portal_label_texts: "THE END / IS JUST / THE BEGINNING",
  portal_title_line1: "Câu chuyện của bạn",
  portal_title_line2: "bắt đầu từ đây.",
  portal_subtitle: "Studio sẵn sàng. Máy quay đang chờ. Ý tưởng của bạn là duy nhất còn thiếu.",
  portal_cta_text: "Vào Studio",
  portal_login_text: "Đã có tài khoản?",
  portal_login_label: "Đăng nhập",
  reel_label: "Showreel",
  reel_title_line1: "Mọi phong cách.",
  reel_title_line2: "Mọi thế giới.",
  intro_label: "Social Video Studio",
  intro_title_line1: "Sáng Tạo",
  intro_title_line2: "Video Ấn Tượng",
  intro_subtitle: "Công cụ tạo video AI cho nền tảng mạng xã hội. Đa dạng phong cách (Cinematic, Anime, Cyberpunk...) và định dạng xuất chuẩn (9:16 TikTok, 16:9 YouTube).",
  intro_features: "Engine video Qwen/Wan + AI ảnh & giọng nói | 6 phong cách tạo sẵn | Xuất TikTok & YouTube",
  genesis_label: "Cốt Lõi Công Nghệ",
  genesis_title_line1: "Một Ý Tưởng.",
  genesis_title_line2: "Vô Hạn Sáng Tạo.",
  forge_label: "Style Engine",
  forge_cta_text: "Tạo ngay với phong cách này",
  workflow_label: "Quy Trình Hoạt Động",
  director_label: "Master Control",
  director_title_line1: "Bạn là ",
  director_title_line2: "Content Creator.",
  director_subtitle: "Thiết lập phong cách, góc máy và tâm trạng cho từng cảnh trong storyboard — kiểm soát sáng tạo theo ý bạn.",
  gallery_label: "Phong Cách",
  gallery_title_line1: "Tạo ra bởi AI. ",
  gallery_title_line2: "Chất lượng chuyên nghiệp.",
  sound_label: "Trải Nghiệm Âm Thanh",
  sound_title_line1: "Cảm Xúc Từ ",
  sound_title_line2: "Từng Giọng Đọc.",
  ecosystem_label: "Hệ Sinh Thái Toàn Diện",
  ecosystem_title_line1: "Một Nền Tảng.",
  ecosystem_title_line2: "Vạn Khả Năng.",
  ecosystem_subtitle: "Mọi công cụ mạnh mẽ nhất đều hội tụ trong một không gian duy nhất. Từ text-to-video, image-to-video đến voice-over và storyboard.",
  stats_label: "Live Platform Telemetry",
  stats_title_line1: "Hiệu suất thực tế.",
  stats_title_line2: "Số liệu biết nói.",
  vision_label: "ĐIỀU KHIỂN",
  vision_title_line1: "Bạn là",
  vision_title_line2: "Director.",
  vision_description_p1: "Chọn góc máy. Điều chỉnh ánh sáng. Định tâm trạng. Kiểm soát từng khung hình.",
  vision_description_p2: "Đây không phải là bộ lọc — đây là bộ công cụ chuyên nghiệp.",
  footer_copyright: "\u00a9 2026 Wavise Studio",
  footer_privacy_url: "#",
  footer_terms_url: "#",
  footer_contact_url: "#",
};

/**
 * Landing content is hardcoded in `DEFAULTS` — the CMS API (`/api/landing-page`)
 * and its admin settings were removed. Kept as a function named `useLandingSettings`
 * so the landing section components need no change.
 */
export function useLandingSettings(): ResolvedLandingSettings {
  return DEFAULTS;
}
