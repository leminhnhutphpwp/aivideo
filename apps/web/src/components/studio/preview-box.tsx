'use client';

const ASPECT_LABELS: Record<string, string> = {
  '16:9': 'Màn hình rộng — phù hợp YouTube, TV',
  '9:16': 'Dọc — phù hợp TikTok, Reels, Shorts',
  '1:1': 'Vuông — phù hợp Instagram, Facebook',
  '4:3': 'Cổ điển — phù hợp presentation, iPad',
  '3:4': 'Dọc cổ điển — phù hợp poster, quảng cáo',
};

function aspectToSize(aspect: string, width: number): { w: number; h: number } {
  const parts = aspect.split(':').map(Number);
  if (parts.length !== 2 || parts[0] <= 0 || parts[1] <= 0) return { w: width, h: Math.round(width * 9 / 16) };
  return { w: width, h: Math.round(width * parts[1] / parts[0]) };
}

export function PreviewBox({ aspect }: { aspect: string }) {
  const maxW = 120;
  const { w, h } = aspectToSize(aspect, maxW);
  const label = ASPECT_LABELS[aspect] || aspect;

  return (
    <div className="space-y-2 pt-1 w-full sm:w-[120px]">
      <div className="flex items-center justify-center bg-white/[0.02] border border-white/5 rounded-xl p-3">
        <div className="bg-gradient-to-br from-[#FF5A1F]/20 to-[#FF5A1F]/5 border border-[#FF5A1F]/20 rounded-sm flex items-center justify-center transition-all duration-200"
          style={{ width: w, height: h }}
        >
          <span className="text-[10px] font-mono font-bold text-[#FF5A1F]/70">{aspect}</span>
        </div>
      </div>
      <p className="text-[10px] text-slate-600 text-center leading-relaxed">{label}</p>
    </div>
  );
}
