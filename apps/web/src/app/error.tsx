'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') return;
    console.error(error);
  }, [error]);

  if (process.env.NODE_ENV === 'development') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="login-bg-orb login-bg-orb-1 opacity-50" />
        <div className="login-bg-orb login-bg-orb-2 opacity-50" />
        <div className="login-bg-orb login-bg-orb-3 opacity-50" />
        <div className="login-bg-grain opacity-30" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-lg mx-auto">
        <div className="h-16 w-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-6">
          <AlertTriangle className="h-8 w-8 text-red-400" />
        </div>

        <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-2">
          Đã xảy ra lỗi
        </h2>

        <p className="text-sm text-slate-500 font-medium max-w-sm mx-auto leading-relaxed mb-8">
          Vui lòng thử lại sau
        </p>

        <button
          onClick={() => reset()}
          className="h-12 px-8 rounded-xl bg-[#FF5A1F] hover:bg-[#FF6A2B] text-white font-bold text-sm tracking-tight shadow-sm shadow-[#FF5A1F]/20 transition-all flex items-center justify-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Thử lại
        </button>
      </div>
    </div>
  );
}
