'use client';

import type { ReactNode } from 'react';
import { Wrench } from 'lucide-react';
import Link from 'next/link';
import { useCapability } from '@/lib/feature-capabilities';

/**
 * Renders children only if the current plan has `capability` configured in its
 * model_mapping. Otherwise shows the "under maintenance" screen.
 */
export function FeatureGate({ capability, children }: { capability: string; children: ReactNode }) {
  const enabled = useCapability(capability);
  return enabled ? <>{children}</> : <FeatureMaintenance />;
}

export function FeatureMaintenance() {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-5 py-24 px-6 min-h-[60vh]">
      <div className="h-16 w-16 rounded-2xl bg-[#FF5A1F]/10 border border-[#FF5A1F]/20 flex items-center justify-center">
        <Wrench className="h-7 w-7 text-[#FF5A1F]" />
      </div>
      <div className="space-y-2 max-w-md">
        <h2 className="text-xl md:text-2xl font-display font-bold text-white">Tính năng đang bảo trì</h2>
        <p className="text-sm text-slate-400 leading-relaxed">
          Tính năng này chưa được cấu hình cho gói của bạn và đang trong quá trình
          hoàn thiện. Vui lòng quay lại sau, hoặc nâng cấp gói để trải nghiệm sớm hơn.
        </p>
      </div>
      <Link
        href="/billing"
        className="h-10 px-6 rounded-xl bg-[#FF5A1F] hover:bg-[#FF6A2B] text-white font-bold text-xs flex items-center transition-all"
      >
        Xem các gói
      </Link>
    </div>
  );
}
