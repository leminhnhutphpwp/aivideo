'use client';

import { Check, X, Minus } from 'lucide-react';

const competitors = [
  {
    name: 'Wavise Studio',
    isOurs: true,
    features: {
      multiLanguage: true,
      vietnameseUI: true,
      cheapCredits: true,
      storyboardMode: true,
      elevenlabsVoice: true,
      aiStoryboard: true,
      multiPanelImage: true,
      hdQuality: true,
      apiAccess: true,
      cloudStorage: true,
      teamCollaboration: false,
    },
    price: 'Từ 1.500đ/giây',
  },
  {
    name: 'Kling',
    isOurs: false,
    features: {
      multiLanguage: false,
      vietnameseUI: false,
      cheapCredits: false,
      storyboardMode: false,
      elevenlabsVoice: false,
      aiStoryboard: false,
      multiPanelImage: false,
      hdQuality: true,
      apiAccess: true,
      cloudStorage: false,
      teamCollaboration: false,
    },
    price: '~$0.11/giây (~2.800đ)',
  },
  {
    name: 'Runway Gen-3',
    isOurs: false,
    features: {
      multiLanguage: true,
      vietnameseUI: false,
      cheapCredits: false,
      storyboardMode: true,
      elevenlabsVoice: true,
      aiStoryboard: false,
      multiPanelImage: false,
      hdQuality: true,
      apiAccess: false,
      cloudStorage: true,
      teamCollaboration: true,
    },
    price: '~$0.15/giây (~3.800đ)',
  },
  {
    name: 'Pika Labs',
    isOurs: false,
    features: {
      multiLanguage: false,
      vietnameseUI: false,
      cheapCredits: false,
      storyboardMode: false,
      elevenlabsVoice: false,
      aiStoryboard: false,
      multiPanelImage: false,
      hdQuality: true,
      apiAccess: false,
      cloudStorage: true,
      teamCollaboration: false,
    },
    price: '~$0.10/giây (~2.500đ)',
  },
];

const featureLabels: Record<string, string> = {
  multiLanguage: 'Đa ngôn ngữ',
  vietnameseUI: 'Giao diện Tiếng Việt',
  cheapCredits: 'Credits rẻ hơn 40%',
  storyboardMode: 'Chế độ Storyboard',
  elevenlabsVoice: 'Giọng ElevenLabs chất lượng cao',
  aiStoryboard: 'Tạo kịch bản bằng AI',
  multiPanelImage: 'Tạo ảnh Multi-Panel từ AI',
  hdQuality: 'Chất lượng HD 1080p',
  apiAccess: 'API cho doanh nghiệp',
  cloudStorage: 'Lưu trữ đám mây',
  teamCollaboration: 'Cộng tác nhóm',
};

export function CompetitorComparison() {
  return (
    <div className="mt-10 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
          So sánh với đối thủ
        </span>
        <div className="h-px flex-1 bg-gradient-to-l from-white/10 to-transparent" />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/12 bg-[#16141a]">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-white/12">
              <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Tính năng
              </th>
              {competitors.map((c) => (
                <th
                  key={c.name}
                  className={`px-4 py-3 text-center text-[11px] font-semibold ${
                    c.isOurs ? 'text-[#FF5A1F]' : 'text-slate-400'
                  }`}
                >
                  <span className={c.isOurs ? 'text-white' : ''}>{c.name}</span>
                  <div className="text-[9px] font-normal text-slate-400 mt-0.5">
                    {c.price}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(featureLabels).map(([key, label], i) => {
              const rows = competitors.map((c) => c.features[key as keyof typeof c.features]);
              const hasAny = rows.some((r) => r);
              return (
                <tr
                  key={key}
                  className={`border-b border-white/[0.03] transition-colors hover:bg-white/[0.01] ${
                    i % 2 === 0 ? 'bg-white/[0.01]' : ''
                  }`}
                >
                  <td className="px-4 py-2.5 text-slate-300 font-medium whitespace-nowrap">
                    {label}
                  </td>
                  {competitors.map((c) => {
                    const val = c.features[key as keyof typeof c.features];
                    return (
                      <td
                        key={c.name}
                        className={`px-4 py-2.5 text-center ${
                          c.isOurs ? 'bg-[#FF5A1F]/[0.02]' : ''
                        }`}
                      >
                        {val === true ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400 mx-auto" />
                        ) : val === false ? (
                          <X className="h-3.5 w-3.5 text-slate-400 mx-auto" />
                        ) : (
                          <Minus className="h-3.5 w-3.5 text-slate-400 mx-auto" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-slate-400 text-center italic">
        * Thông tin dựa trên so sánh thị trường tháng 06/2026. Giá có thể thay đổi theo từng thời điểm.
      </p>
    </div>
  );
}
