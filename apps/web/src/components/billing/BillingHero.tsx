'use client';

import { useState, useEffect, useRef } from 'react';
import { Coins, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'motion/react';
import { t } from '@/lib/i18n';

function AnimatedCounter({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const startTime = useRef<number | null>(null);

  useEffect(() => {
    startTime.current = null;
    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const progress = Math.min((timestamp - startTime.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target, duration]);

  return <span>{count.toLocaleString()}</span>;
}

interface BillingHeroProps {
  credits: number | null;
}

export function BillingHero({ credits }: BillingHeroProps) {
  return (
    <div className="relative">
      <div className="billing-hero-glow absolute -top-20 -left-20 w-[500px] h-[500px] rounded-full bg-[#FF5A1F]/[0.08] blur-[120px] pointer-events-none" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-6 items-start">
        {/* Left: Title + desc */}
        <div className="lg:col-span-7 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5">
            <div className="h-1.5 w-1.5 rounded-full bg-[#FF5A1F] animate-pulse" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('billing.desc')}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight text-white leading-[1.1]">
            {t('billing.title')}
          </h1>
          <p className="text-sm text-slate-500 font-medium max-w-md leading-relaxed">
            Quản lý gói dịch vụ, nạp credits và theo dõi lịch sử thanh toán của bạn.
          </p>
        </div>

        {/* Right: Credit Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-5"
        >
          <div className="billing-credit-card relative p-6 md:p-6 rounded-2xl bg-gradient-to-br from-[#0f0f0f] to-[#080808] border border-white/10 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-[#FF5A1F]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF5A1F]/10 blur-[60px] rounded-full" />

            <div className="relative space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center">
                    <Coins className="h-5 w-5 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Credits</p>
                    <p className="text-xs text-slate-600 font-medium">Còn lại</p>
                  </div>
                </div>
                <div className="h-8 w-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-slate-600" />
                </div>
              </div>

              <div>
                <p className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                  {credits !== null ? <AnimatedCounter target={credits} /> : '...'}
                </p>
                <p className="text-xs text-slate-600 font-medium mt-1">credits</p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => document.getElementById('credit-packs')?.scrollIntoView({ behavior: 'smooth' })}
                  className="flex-1 h-10 rounded-lg bg-white text-black hover:bg-zinc-200 font-bold text-xs"
                >
                  Nạp ngay
                </Button>
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('history')?.scrollIntoView({ behavior: 'smooth' })}
                  className="h-10 rounded-lg border-white/10 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 font-bold text-xs px-4"
                >
                  Lịch sử
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
