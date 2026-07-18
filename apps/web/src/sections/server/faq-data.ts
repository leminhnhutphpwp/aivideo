/**
 * Shared FAQ content — the single source used by both the visible FAQ section
 * and the FAQPage JSON-LD, so structured data always matches on-page content.
 *
 * Answers are written "answer-first" (the entity/definition comes first) for
 * both SEO snippets and Generative Engine Optimization (LLM extraction).
 *
 * Keep every answer factually accurate: the video engine is Qwen/Wan plus
 * dedicated image & voice models — do NOT list providers we don't run.
 */
export type FaqItem = {
  question: string;
  answer: string;
};

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: "Wavise Studio là gì?",
    answer:
      "Wavise Studio là nền tảng tạo video ngắn bằng AI. Bạn nhập ý tưởng, kịch bản hoặc ảnh, hệ thống tự dựng thành video hoàn chỉnh kèm lồng tiếng AI để đăng lên TikTok, Reels và YouTube Shorts.",
  },
  {
    question: "Tôi có thể tạo video từ những gì?",
    answer:
      "Bạn có thể tạo video từ văn bản (text-to-video), từ ảnh có sẵn (image-to-video), hoặc dựng theo storyboard nhiều cảnh với chế độ One-Shot và Multi-Panel để kiểm soát phong cách, góc máy và bố cục từng khung hình.",
  },
  {
    question: "Wavise Studio dùng công nghệ AI nào?",
    answer:
      "Nền tảng sử dụng engine tạo video Qwen/Wan cùng các mô hình AI chuyên biệt cho tạo ảnh và tổng hợp giọng nói. Nhờ vậy, video và lồng tiếng được tạo tự động mà bạn không cần dùng nhiều công cụ rời rạc.",
  },
  {
    question: "Video xuất ra ở những định dạng nào?",
    answer:
      "Wavise Studio hỗ trợ định dạng dọc 9:16 cho TikTok, Reels và YouTube Shorts, cùng định dạng ngang 16:9 cho YouTube và website. Bạn chọn tỷ lệ khung hình phù hợp trước khi kết xuất.",
  },
  {
    question: "Wavise Studio có lồng tiếng AI không?",
    answer:
      "Có. Sau khi tạo video, bạn có thể thêm lồng tiếng AI bằng nhiều giọng đọc tự nhiên. Voiceover là bước riêng sau khi dựng hình nên bạn chủ động chọn giọng và nội dung đọc.",
  },
  {
    question: "Tôi có cần biết dựng phim để dùng Wavise Studio không?",
    answer:
      "Không. Wavise Studio được thiết kế theo hướng prompt-first: bạn chỉ cần mô tả ý tưởng bằng tiếng Việt, nền tảng lo phần dựng cảnh, chuyển động và kết xuất. Bạn vẫn có thể tinh chỉnh chi tiết nếu muốn.",
  },
  {
    question: "Chi phí sử dụng Wavise Studio như thế nào?",
    answer:
      "Bạn có thể đăng ký dùng thử miễn phí. Khi tạo video, hệ thống tính theo lượng credit sử dụng tùy độ dài và chất lượng, nên bạn chỉ trả cho phần mình thực sự dùng.",
  },
];
