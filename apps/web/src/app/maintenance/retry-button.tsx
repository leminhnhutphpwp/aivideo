'use client';

import { RotateCw } from 'lucide-react';

export function RetryButton({ label }: { label: string }) {
  return (
    <button
      onClick={() => window.location.reload()}
      className="h-12 px-8 rounded-xl bg-[#FF5A1F] hover:bg-[#FF6A2B] text-white font-bold text-sm tracking-tight shadow-sm shadow-[#FF5A1F]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
    >
      <RotateCw className="h-4 w-4" />
      {label}
    </button>
  );
}
