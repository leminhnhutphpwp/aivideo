'use client';

import { useState } from 'react';
import { Receipt, ChevronDown, ChevronUp, AlertTriangle, Zap, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

interface PriceBreakdownItem {
  label: string;
  value: number;
  multiplier?: number;
  description?: string;
}

interface PriceBreakdown {
  video_type?: { name: string; base_credits: number };
  duration?: { code: string; seconds: number; multiplier: number; cost: number };
  resolution?: { code: string; multiplier: number; cost: number };
  quality?: { code: string; multiplier: number; cost: number };
  provider?: { name: string; model?: string; multiplier: number; cost: number };
  addons?: { code: string; name: string; cost: number }[];
  total_addons?: number;
}

interface PricingData {
  breakdown: PriceBreakdown;
  pricing: {
    subtotal: number;
    addons_total: number;
    total_credits: number;
    vnd_equivalent: number;
    exchange_rate: number;
  };
  user_plan?: {
    plan: string;
    discount_percent: number;
    discount_amount: number;
    final_total: number;
  };
  validation?: {
    valid: boolean;
    warnings: string[];
    errors: string[];
  };
}

interface PricePreviewProps {
  priceData: PricingData | null;
  loading: boolean;
  error: string | null;
  quantity?: number;
  className?: string;
}

function formatCredits(n: number): string {
  return n.toLocaleString('vi-VN');
}

export function PricePreview({ priceData, loading, error, quantity = 1, className }: PricePreviewProps) {
  const [expanded, setExpanded] = useState(false);

  if (loading && !priceData) {
    return (
      <div className={cn("bg-[#16141a] border border-white/12 rounded-2xl p-5 space-y-3", className)}>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#FF5A1F]" />
          Đang tính giá...
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-white/5 rounded w-3/4 animate-pulse" />
          <div className="h-3 bg-white/5 rounded w-1/2 animate-pulse" />
          <div className="h-3 bg-white/5 rounded w-2/3 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("bg-[#16141a] border border-white/12 rounded-2xl p-5", className)}>
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-500">
          <AlertTriangle className="h-3.5 w-3.5" />
          Không thể ước tính giá
        </div>
        <p className="text-[10px] text-slate-400 mt-1">{error}</p>
      </div>
    );
  }

  if (!priceData) {
    return (
      <div className={cn("bg-[#16141a] border border-white/12 rounded-2xl p-5", className)}>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Receipt className="h-3.5 w-3.5" />
          Ước tính chi phí
        </div>
        <p className="text-[10px] text-slate-400 mt-1">Điền thông tin để xem chi phí</p>
      </div>
    );
  }

  const { breakdown, pricing, user_plan } = priceData;
  const items: PriceBreakdownItem[] = [];

  if (breakdown.video_type) {
    items.push({
      label: breakdown.video_type.name || 'Video',
      value: breakdown.video_type.base_credits || 0,
      description: 'Cơ bản',
    });
  }
  if (breakdown.duration && breakdown.duration.cost !== 0) {
    items.push({
      label: `${breakdown.duration.code} (${breakdown.duration.seconds}s)`,
      value: breakdown.duration.cost,
      multiplier: breakdown.duration.multiplier,
    });
  }
  if (breakdown.resolution && breakdown.resolution.cost !== 0) {
    items.push({
      label: breakdown.resolution.code,
      value: breakdown.resolution.cost,
      multiplier: breakdown.resolution.multiplier,
    });
  }
  if (breakdown.quality && breakdown.quality.cost !== 0) {
    items.push({
      label: breakdown.quality.code,
      value: breakdown.quality.cost,
      multiplier: breakdown.quality.multiplier,
    });
  }
  if (breakdown.provider?.name && breakdown.provider.cost !== 0) {
    items.push({
      label: breakdown.provider.model
        ? `${breakdown.provider.name} (${breakdown.provider.model})`
        : breakdown.provider.name,
      value: breakdown.provider.cost,
      multiplier: breakdown.provider.multiplier,
    });
  }

  const addonItems = breakdown.addons || [];
  const hasAddons = addonItems.length > 0 || (pricing.addons_total > 0);
  const hasDiscount = user_plan && user_plan.discount_percent > 0;
  const finalTotal = user_plan?.final_total ?? pricing.total_credits;
  const totalPerItem = finalTotal;
  const grandTotal = totalPerItem * quantity;

  return (
    <div className={cn("bg-gradient-to-b from-[#0c0c0c] to-[#080808] border border-white/12 rounded-2xl overflow-hidden", className)}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-all"
      >
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-[#FF5A1F]/10 flex items-center justify-center">
            {loading ? (
              <Loader2 className="h-4 w-4 text-[#FF5A1F] animate-spin" />
            ) : (
              <Receipt className="h-4 w-4 text-[#FF5A1F]" />
            )}
          </div>
          <div className="text-left">
            <p className="text-xs font-bold text-white">Chi phí ước tính</p>
            <p className="text-[10px] text-slate-500">{quantity > 1 ? `${quantity} cảnh × ${formatCredits(totalPerItem)}` : 'Mỗi cảnh'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("text-lg font-display font-bold text-[#FF5A1F] transition-opacity", loading && "opacity-50")}>
            {formatCredits(grandTotal)}
          </span>
          <span className="text-[10px] text-slate-500 font-medium">credits</span>
          {expanded ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
        </div>
      </button>

      {/* Breakdown */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className={cn("px-5 pb-4 space-y-2 border-t border-white/12 pt-3 transition-opacity", loading && "opacity-50")}>
              {/* Base items */}
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    {item.label}
                    {item.multiplier && item.multiplier !== 1 ? (
                      <span className="text-slate-400 ml-1">×{item.multiplier}</span>
                    ) : null}
                  </span>
                  <span className={idx === 0 ? 'text-white font-semibold' : 'text-[#FF5A1F] font-medium'}>
                    {idx === 0 ? formatCredits(item.value) : `+${formatCredits(item.value)}`}
                  </span>
                </div>
              ))}

              {/* Subtotal */}
              <div className="flex items-center justify-between text-xs border-t border-white/12 pt-2">
                <span className="text-slate-400 font-medium">Tổng phụ</span>
                <span className="text-white font-semibold">{formatCredits(pricing.subtotal)}</span>
              </div>

              {/* Addons */}
              {hasAddons && (
                <>
                  {addonItems.map((addon, idx) => (
                    <div key={`addon-${idx}`} className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">{addon.name || addon.code}</span>
                      <span className="text-slate-400 font-medium">+{formatCredits(addon.cost)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Tổng addon</span>
                    <span className="text-white font-semibold">+{formatCredits(pricing.addons_total)}</span>
                  </div>
                </>
              )}

              {/* Total before discount */}
              <div className="flex items-center justify-between text-xs border-t border-white/12 pt-2">
                <span className="text-slate-400 font-medium">Tổng</span>
                <span className="text-white font-semibold">{formatCredits(pricing.total_credits)}</span>
              </div>

              {/* Plan discount */}
              {hasDiscount && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    {user_plan.plan} -{user_plan.discount_percent}%
                  </span>
                  <span className="text-emerald-400 font-semibold">-{formatCredits(user_plan.discount_amount)}</span>
                </div>
              )}

              {/* Final */}
              <div className="flex items-center justify-between text-sm border-t border-white/10 pt-2 mt-1">
                <span className="text-white font-bold">Thanh toán</span>
                <span className="text-[#FF5A1F] font-display font-bold text-lg">
                  {formatCredits(grandTotal)}
                </span>
              </div>

              {/* Warnings */}
              {priceData.validation?.warnings?.map((w, i) => (
                <p key={`warn-${i}`} className="text-[10px] text-amber-500 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />{w}
                </p>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
