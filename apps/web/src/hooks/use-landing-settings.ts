"use client";
import { useState, useEffect } from "react";
import { LARAVEL_URL } from "@/lib/api/client";

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

export function useLandingSettings(): ResolvedLandingSettings {
  const [settings, setSettings] = useState<ResolvedLandingSettings>(DEFAULTS);

  useEffect(() => {
    fetch(`${LARAVEL_URL}/api/landing-page`)
      .then(res => res.json())
      .then(data => {
        setSettings({
          hero_label: data.hero_label || DEFAULTS.hero_label,
          hero_title_line1: data.hero_title_line1 || DEFAULTS.hero_title_line1,
          hero_title_line2: data.hero_title_line2 || DEFAULTS.hero_title_line2,
          hero_subtitle: data.hero_subtitle || DEFAULTS.hero_subtitle,
          hero_cta_text: data.hero_cta_text || DEFAULTS.hero_cta_text,
          hero_cta_url: data.hero_cta_url || DEFAULTS.hero_cta_url,
          hero_typewriter_words: data.hero_typewriter_words || DEFAULTS.hero_typewriter_words,
          portal_label_texts: data.portal_label_texts || DEFAULTS.portal_label_texts,
          portal_title_line1: data.portal_title_line1 || DEFAULTS.portal_title_line1,
          portal_title_line2: data.portal_title_line2 || DEFAULTS.portal_title_line2,
          portal_subtitle: data.portal_subtitle || DEFAULTS.portal_subtitle,
          portal_cta_text: data.portal_cta_text || DEFAULTS.portal_cta_text,
          portal_login_text: data.portal_login_text || DEFAULTS.portal_login_text,
          portal_login_label: data.portal_login_label || DEFAULTS.portal_login_label,
          reel_label: data.reel_label || DEFAULTS.reel_label,
          reel_title_line1: data.reel_title_line1 || DEFAULTS.reel_title_line1,
          reel_title_line2: data.reel_title_line2 || DEFAULTS.reel_title_line2,
          intro_label: data.intro_label || DEFAULTS.intro_label,
          intro_title_line1: data.intro_title_line1 || DEFAULTS.intro_title_line1,
          intro_title_line2: data.intro_title_line2 || DEFAULTS.intro_title_line2,
          intro_subtitle: data.intro_subtitle || DEFAULTS.intro_subtitle,
          intro_features: data.intro_features || DEFAULTS.intro_features,
          genesis_label: data.genesis_label || DEFAULTS.genesis_label,
          genesis_title_line1: data.genesis_title_line1 || DEFAULTS.genesis_title_line1,
          genesis_title_line2: data.genesis_title_line2 || DEFAULTS.genesis_title_line2,
          forge_label: data.forge_label || DEFAULTS.forge_label,
          forge_cta_text: data.forge_cta_text || DEFAULTS.forge_cta_text,
          workflow_label: data.workflow_label || DEFAULTS.workflow_label,
          director_label: data.director_label || DEFAULTS.director_label,
          director_title_line1: data.director_title_line1 || DEFAULTS.director_title_line1,
          director_title_line2: data.director_title_line2 || DEFAULTS.director_title_line2,
          director_subtitle: data.director_subtitle || DEFAULTS.director_subtitle,
          gallery_label: data.gallery_label || DEFAULTS.gallery_label,
          gallery_title_line1: data.gallery_title_line1 || DEFAULTS.gallery_title_line1,
          gallery_title_line2: data.gallery_title_line2 || DEFAULTS.gallery_title_line2,
          sound_label: data.sound_label || DEFAULTS.sound_label,
          sound_title_line1: data.sound_title_line1 || DEFAULTS.sound_title_line1,
          sound_title_line2: data.sound_title_line2 || DEFAULTS.sound_title_line2,
          ecosystem_label: data.ecosystem_label || DEFAULTS.ecosystem_label,
          ecosystem_title_line1: data.ecosystem_title_line1 || DEFAULTS.ecosystem_title_line1,
          ecosystem_title_line2: data.ecosystem_title_line2 || DEFAULTS.ecosystem_title_line2,
          ecosystem_subtitle: data.ecosystem_subtitle || DEFAULTS.ecosystem_subtitle,
          stats_label: data.stats_label || DEFAULTS.stats_label,
          stats_title_line1: data.stats_title_line1 || DEFAULTS.stats_title_line1,
          stats_title_line2: data.stats_title_line2 || DEFAULTS.stats_title_line2,
          vision_label: data.vision_label || DEFAULTS.vision_label,
          vision_title_line1: data.vision_title_line1 || DEFAULTS.vision_title_line1,
          vision_title_line2: data.vision_title_line2 || DEFAULTS.vision_title_line2,
          vision_description_p1: data.vision_description_p1 || DEFAULTS.vision_description_p1,
          vision_description_p2: data.vision_description_p2 || DEFAULTS.vision_description_p2,
          footer_copyright: data.footer_copyright || DEFAULTS.footer_copyright,
          footer_privacy_url: data.footer_privacy_url || DEFAULTS.footer_privacy_url,
          footer_terms_url: data.footer_terms_url || DEFAULTS.footer_terms_url,
          footer_contact_url: data.footer_contact_url || DEFAULTS.footer_contact_url,
        });
      })
      .catch(() => {
        // API fail -> keep defaults, no crash
      });
  }, []);

  return settings;
}
