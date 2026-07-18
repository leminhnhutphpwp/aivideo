import type { Metadata } from 'next';
import Link from 'next/link';
import { Wrench, Clock, Home } from 'lucide-react';
import { RetryButton } from './retry-button';

export const metadata: Metadata = {
  title: 'Đang bảo trì — Wavise Studio',
  description: 'Hệ thống đang được nâng cấp. Vui lòng quay lại sau ít phút.',
  robots: { index: false, follow: false },
};

const COPY = {
  dashboard: {
    eyebrow: 'Khu vực làm việc',
    title: 'Đang nâng cấp hệ thống',
    body: 'Wavise Studio đang tạm gián đoạn để chúng tôi nâng cấp hạ tầng và cải thiện hiệu năng. Dữ liệu của bạn vẫn an toàn — vui lòng quay lại sau ít phút.',
  },
  landing: {
    eyebrow: 'Wavise Studio',
    title: 'Chúng tôi sẽ trở lại ngay',
    body: 'Trang web đang được bảo trì để mang đến trải nghiệm tốt hơn. Cảm ơn bạn đã kiên nhẫn chờ đợi.',
  },
} as const;

export default async function MaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string }>;
}) {
  const { area } = await searchParams;
  const copy = area === 'dashboard' ? COPY.dashboard : COPY.landing;

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center relative overflow-hidden">
      {/* Decorative background — same language as 404 / auth screens */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="login-bg-orb login-bg-orb-1 opacity-50" />
        <div className="login-bg-orb login-bg-orb-2 opacity-50" />
        <div className="login-bg-orb login-bg-orb-3 opacity-50" />
        <div className="login-bg-grain opacity-30" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-lg mx-auto">
        {/* Brand */}
        <img
          src="/logo-background-white.png"
          alt="Wavise Studio"
          className="h-9 w-auto mb-10 opacity-90"
        />

        {/* Status badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/[0.07] px-3 py-1 mb-7">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400/70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
          </span>
          <span className="text-[11px] font-semibold tracking-wide text-amber-300/90 uppercase">
            {copy.eyebrow} · Đang bảo trì
          </span>
        </div>

        {/* Icon */}
        <div className="h-16 w-16 rounded-2xl bg-[#FF5A1F]/10 border border-[#FF5A1F]/15 flex items-center justify-center mb-7">
          <Wrench className="h-7 w-7 text-[#FF5A1F]" />
        </div>

        <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-white mb-3 leading-tight">
          {copy.title}
        </h1>

        <p className="text-sm text-slate-400 font-medium max-w-md mx-auto leading-relaxed mb-8">
          {copy.body}
        </p>

        {/* ETA hint */}
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-9">
          <Clock className="h-3.5 w-3.5" />
          <span>Dự kiến hoàn tất trong giây lát</span>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <RetryButton label="Thử lại" />
          {area === 'dashboard' && (
            <Link
              href="/"
              className="h-12 px-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 font-semibold text-sm tracking-tight transition-all flex items-center justify-center gap-2"
            >
              <Home className="h-4 w-4" />
              Về trang chủ
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
