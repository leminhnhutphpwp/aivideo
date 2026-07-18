'use client';

import Link from 'next/link';
import { Lock, Crown } from 'lucide-react';

interface PremiumLockProps {
  message: string;
}

export function PremiumLock({ message }: PremiumLockProps) {
  return (
    <Link href="/billing" className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gradient-to-b from-black/70 to-black/50 backdrop-blur-sm rounded-2xl group cursor-pointer">
      <div className="flex flex-col items-center gap-3 px-6">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#FF5A1F]/20 to-[#FF8A5B]/10 border border-[#FF5A1F]/20 flex items-center justify-center">
          <Lock className="h-4 w-4 text-[#FF5A1F]" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-xs font-bold text-white">Tính năng Pro</p>
          <p className="text-[10px] text-slate-500 leading-relaxed">{message}</p>
        </div>
        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#FF5A1F] to-[#FF6A2B] text-[10px] font-bold text-white shadow-sm shadow-[#FF5A1F]/20 group-hover:shadow-[#FF5A1F]/30 transition-all">
          <Crown className="h-3 w-3" /> Nâng cấp ngay
        </span>
      </div>
    </Link>
  );
}
