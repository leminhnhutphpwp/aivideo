'use client';

import Link from 'next/link';
import { SearchX, LayoutDashboard } from 'lucide-react';

export default function StudioNotFoundPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="login-bg-orb login-bg-orb-1 opacity-50" />
        <div className="login-bg-orb login-bg-orb-2 opacity-50" />
        <div className="login-bg-orb login-bg-orb-3 opacity-50" />
        <div className="login-bg-grain opacity-30" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-lg mx-auto">
        <div className="h-16 w-16 rounded-2xl bg-[#FF5A1F]/10 flex items-center justify-center mb-6">
          <SearchX className="h-8 w-8 text-[#FF5A1F]" />
        </div>

        <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-2">
          Không tìm thấy dự án
        </h2>

        <p className="text-sm text-slate-500 font-medium max-w-sm mx-auto leading-relaxed mb-8">
          Dự án bạn đang tìm không tồn tại hoặc đã bị xóa
        </p>

        <Link
          href="/studio"
          className="h-12 px-8 rounded-xl bg-[#FF5A1F] hover:bg-[#FF6A2B] text-white font-bold text-sm tracking-tight shadow-sm shadow-[#FF5A1F]/20 transition-all flex items-center justify-center gap-2"
        >
          <LayoutDashboard className="h-4 w-4" />
          Về Studio
        </Link>
      </div>
    </div>
  );
}
