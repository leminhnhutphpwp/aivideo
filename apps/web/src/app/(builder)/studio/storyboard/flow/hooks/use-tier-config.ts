'use client';

import { useRef, useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { Crown, Shield, Zap } from 'lucide-react';

export function useTierConfig() {
  const planTier = ((useAuthStore((s) => s.user) as any)?.plan?.quality_tier_code || 'standard') as string;

  const tierConfig: Record<string, { label: string; icon: any; desc: string; bg: string; border: string; text: string; iconColor: string }> = {
    standard: { label: 'Tiêu chuẩn', icon: Shield, desc: 'Chất lượng cơ bản — phù hợp thử nghiệm ý tưởng', bg: 'bg-slate-500/15', border: 'border-slate-500/30', text: 'text-slate-300', iconColor: 'text-slate-400' },
    standard_hd: { label: 'HD', icon: Shield, desc: 'Chất lượng HD — sắc nét hơn, chi tiết tốt', bg: 'bg-blue-500/15', border: 'border-blue-500/30', text: 'text-blue-300', iconColor: 'text-blue-400' },
    premium: { label: 'Cao cấp', icon: Crown, desc: 'Độ phân giải cao, màu sắc chuyên nghiệp, chi tiết vượt trội', bg: 'bg-amber-500/15', border: 'border-amber-500/30', text: 'text-amber-300', iconColor: 'text-amber-400' },
    ultra: { label: 'Siêu nét', icon: Zap, desc: 'Chất lượng tối đa — 4K, HDR, dành cho sản xuất chuyên nghiệp', bg: 'bg-rose-500/15', border: 'border-rose-500/30', text: 'text-rose-300', iconColor: 'text-rose-400' },
  };

  const tier = tierConfig[planTier as keyof typeof tierConfig] || tierConfig.standard;
  const tierRef = useRef<HTMLDivElement>(null);
  const [tierTooltip, setTierTooltip] = useState(false);
  const [tierTooltipStyle, setTierTooltipStyle] = useState<React.CSSProperties>({});

  return { planTier, tier, tierRef, tierTooltip, setTierTooltip, tierTooltipStyle, setTierTooltipStyle };
}
