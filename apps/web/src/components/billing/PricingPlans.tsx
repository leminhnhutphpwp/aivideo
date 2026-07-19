'use client';

import { Crown, Rocket, Zap, Check, X, Sparkles, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'motion/react';
import { t } from '@/lib/i18n';
import type { Plan } from './types';

interface PricingPlansProps {
  plans: Plan[];
  currentPlanSlug: string | null;
  onUpgradeClick: (slug: string) => void;
}

export function PricingPlans({ plans, currentPlanSlug, onUpgradeClick }: PricingPlansProps) {
  const formatPrice = (price: number) =>
    price === 0 ? t('billing.free') : `${(price / 1000).toLocaleString('vi-VN')}k`;
  const isCurrentPlan = (slug: string) => currentPlanSlug === slug;

  const planIcon = (slug: string) => {
    if (slug === 'pro') return Crown;
    if (slug === 'studio') return Rocket;
    return Zap;
  };

  const planBorder = (slug: string) => {
    if (slug === 'pro') return 'border-[#FF5A1F]/[0.3]';
    if (slug === 'studio') return 'border-[#FF5A1F]/[0.3]';
    return 'border-white/12';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Chọn gói phù hợp</span>
        <div className="h-px flex-1 bg-gradient-to-l from-white/10 to-transparent" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
        {plans.sort((a, b) => a.sort_order - b.sort_order).map((plan, i) => {
          const Icon = planIcon(plan.slug);
          const current = isCurrentPlan(plan.slug);
          const border = planBorder(plan.slug);
          const isPro = plan.slug === 'pro';
          const isComingSoon = plan.status === 'coming_soon';
          const features = [
            { label: `${plan.monthly_credits.toLocaleString('vi-VN')} credits/tháng`, included: true },
            { label: `${plan.max_concurrent_jobs} job đồng thời`, included: true },
            { label: 'Ưu tiên xử lý nhanh', included: plan.queue_priority === 'high' },
            { label: 'Đa tỷ lệ khung hình (9:16 · 16:9 · 1:1)', included: true },
            { label: 'Hỗ trợ references', included: Boolean(plan.audio_generation) },
            ...(plan.slug === 'studio' ? [
              { label: 'Studio chỉnh sửa video', included: true, coming: true },
              { label: 'Build & custom video theo ý muốn', included: true, coming: true },
            ] : []),
          ];

          return (
            <motion.div
              key={plan.slug}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, type: 'spring', stiffness: 300, damping: 30 }}
              className={`relative rounded-2xl border ${border} bg-[#1f1c25]/50 p-5 flex flex-col gap-4 overflow-hidden group hover:border-opacity-60 transition-all duration-500 ${
                isPro ? 'md:-mt-1 md:mb-1 ring-1 ring-[#FF5A1F]/15 md:scale-[1.02]' : ''
              }`}
            >
              {/* Recommended badge */}
              {plan.is_popular && !current && (
                <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-[#FF5A1F] to-[#FF6A2B] shadow-sm shadow-[#FF5A1F]/[0.3]">
                  <Crown className="h-3 w-3 text-white" />
                  <span className="text-[9px] font-bold text-white uppercase tracking-wider">Phổ biến nhất</span>
                </div>
              )}

              {/* Coming soon badge */}
              {isComingSoon && !current && (
                <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/15 border border-orange-500/20">
                  <span className="text-[9px] font-bold text-orange-400 uppercase tracking-wider">Sắp ra mắt</span>
                </div>
              )}

              {/* Current badge */}
              {current && (
                <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/20">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">Đang dùng</span>
                </div>
              )}

              {/* Header */}
              <div className="relative space-y-2">
                <div className="h-9 w-9 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-slate-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">{plan.name}</h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">{plan.description || `Gói ${plan.name}`}</p>
                </div>
              </div>

              {/* Price */}
              <div className="relative">
                {(() => {
                  const displayPrice = plan.price_regular;
                  const displaySale = plan.price_sale ?? null;
                  return (
                    <>
                      <div className="flex items-baseline gap-1.5">
                        {displaySale ? (
                          <>
                            <span className="text-3xl font-bold text-white tracking-tight">{formatPrice(displaySale)}</span>
                            <span className="text-sm text-slate-500 line-through">{formatPrice(displayPrice)}</span>
                          </>
                        ) : plan.price_regular > 0 ? (
                          <span className="text-3xl font-bold text-white tracking-tight">{formatPrice(displayPrice)}</span>
                        ) : isComingSoon ? (
                          <span className="text-3xl font-bold text-white tracking-tight">Sắp ra mắt</span>
                        ) : plan.slug === 'free' ? (
                          <span className="text-3xl font-bold text-white tracking-tight">Miễn phí</span>
                        ) : (
                          <span className="text-3xl font-bold text-white tracking-tight">0đ</span>
                        )}
                        {plan.price_regular > 0 && (
                          <span className="text-xs text-slate-400 font-medium">
                            /{t('billing.perMonth').toLowerCase()}
                          </span>
                        )}
                      </div>
                      {typeof displaySale === 'number' && displaySale > 0 && displaySale < displayPrice && (
                        <p className="text-[10px] text-emerald-400 font-semibold mt-1">
                          Tiết kiệm {Math.round((1 - displaySale / displayPrice) * 100)}%
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Features list */}
              <div className="relative space-y-2 flex-1">
                {features.map((f, idx) => (
                  <div key={idx} className={`flex items-center gap-2 text-xs ${f.included ? (f as any).coming ? 'text-orange-300' : 'text-slate-300' : 'text-slate-400'}`}>
                    <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${(f as any).coming ? 'bg-orange-500/15' : f.included ? 'bg-emerald-500/15' : 'bg-white/5'}`}>
                      {(f as any).coming ? (
                        <Sparkles className="h-3 w-3 text-orange-400" />
                      ) : f.included ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <X className="h-3 w-3 text-slate-400" />
                      )}
                    </div>
                    <span className={`font-medium ${(f as any).coming ? 'text-orange-300' : f.included ? 'text-slate-300' : 'text-slate-400'}`}>{f.label}</span>
                    {(f as any).coming && (
                      <span className="text-[8px] font-bold text-orange-400 bg-orange-500/15 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Sắp có</span>
                    )}
                  </div>
                ))}
              </div>

              <Button
                  onClick={() => {
                    if (isComingSoon) return;
                    const current = plan.slug === currentPlanSlug;
                    if (current) return;
                    if (plan.price_regular <= 0) return;
                    onUpgradeClick(plan.slug);
                  }}
                disabled={isComingSoon || current || plan.price_regular <= 0}
                className={`h-10 rounded-lg text-xs font-bold tracking-tight transition-all mt-2 ${
                  isComingSoon
                    ? 'bg-white/5 text-slate-400 border border-white/12 cursor-not-allowed opacity-50'
                    : current
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default'
                    : plan.price_regular <= 0
                      ? 'bg-white/5 text-white border border-white/10 hover:bg-white/10'
                      : isPro
                      ? 'bg-gradient-to-r from-[#FF5A1F] to-[#FF6A2B] text-white shadow-sm hover:shadow-[#FF5A1F]/[0.3] hover:scale-[1.02]'
                      : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'
                }`}
              >
                {isComingSoon ? (
                  'Sắp ra mắt'
                ) : current ? (
                  <><Check className="mr-2 h-4 w-4" /> {t('billing.currentPlan')}</>
                ) : plan.price_regular <= 0 ? (
                   'Bắt đầu miễn phí'
                ) : (
                  <>{t('billing.upgrade')} <ChevronRight className="ml-1 h-4 w-4" /></>
                )}
              </Button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
