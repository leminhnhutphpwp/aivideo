'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Coins, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { laravel } from '@/lib/api/client';
import { t } from '@/lib/i18n';
import { MAX_PENDING_PURCHASES } from '@/constants/billing';
import type { CreditPack } from '@/constants/billing';

interface CreditPackSectionProps {
  pendingCount: number;
  loading: boolean;
  selectedPack: CreditPack | null;
  onSelectPack: (pack: CreditPack | null) => void;
  onConfirmPack: (pack: CreditPack) => void;
}

function calcCredits(price: number, exchangeRate: number): number {
  return Math.floor(price * exchangeRate);
}

export function CreditPackSection({
  pendingCount,
  loading,
  selectedPack,
  onSelectPack,
  onConfirmPack,
}: CreditPackSectionProps) {
  const [exchangeRate, setExchangeRate] = useState(0.1);
  const isLocked = pendingCount >= MAX_PENDING_PURCHASES;
  const formatCurrency = (amount: number) => new Intl.NumberFormat('vi-VN').format(amount) + '\u0111';

  const [creditPacks, setCreditPacks] = useState<any[]>([]);

  useEffect(() => {
    laravel.creditsSettings().then((settings) => {
      setExchangeRate(settings.exchange_rate);
    }).catch(() => {
      // fallback: exchange_rate default 0.1
    });

    laravel.creditPacks().then((packs) => {
      setCreditPacks(packs);
    }).catch(console.error);
  }, []);

  return (
    <section id="credit-packs" className="space-y-6 scroll-mt-20">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5">
          <Coins className="h-3.5 w-3.5 text-[#FF5A1F]" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('creditPack.title')}</span>
        </div>
        <div className="h-px flex-1 bg-gradient-to-l from-white/10 to-transparent" />
      </div>

      <p className="text-sm text-slate-500 font-medium text-center">{t('creditPack.desc')}</p>

      {isLocked && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-amber-500/6 border border-amber-500/15"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Coins className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-300">{t('creditPack.lockedTitle', { count: pendingCount })}</p>
              <p className="text-[11px] text-amber-200/60 mt-0.5">{t('creditPack.lockedDesc')}</p>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {creditPacks.map((pack) => {
          const credits = pack.credits; // Use the actual DB credits
          const isSelected = selectedPack?.id === pack.id;

          return (
            <motion.div
              key={pack.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: creditPacks.indexOf(pack) * 0.1 }}
              className={`relative bg-zinc-900/50 border rounded-2xl p-5 transition-all duration-200 ${
                isSelected
                  ? 'border-[#FF5A1F] shadow-sm shadow-[#FF5A1F]/10'
                  : 'border-white/10 hover:border-white/20'
              } ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}
            >
              {pack.label && (
                <div className="absolute -top-2.5 right-4 px-3 py-0.5 rounded-full bg-gradient-to-r from-[#FF5A1F] to-[#FF6A2B] text-[10px] font-bold text-white shadow-sm shadow-[#FF5A1F]/20">
                  {pack.label}
                </div>
              )}

              <div className="flex items-center gap-2.5 mb-4">
                <div className="h-8 w-8 rounded-lg bg-white/[0.03] border border-white/10 flex items-center justify-center">
                  {pack.id === 'large' ? <Sparkles className="h-4 w-4 text-[#FF5A1F]" /> : <Coins className="h-4 w-4 text-slate-400" />}
                </div>
                <span className="text-sm font-bold text-white">{pack.name}</span>
              </div>

              <div className="mb-4">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">{t('creditPack.price')}</p>
                <p className="text-2xl font-bold text-white tracking-tight">{formatCurrency(pack.price)}</p>
              </div>

              <div className="flex items-center gap-2 mb-5 p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                <Coins className="h-4 w-4 text-[#FF5A1F] shrink-0" />
                <span className="text-sm font-bold text-white">{credits.toLocaleString('vi-VN')}</span>
                <span className="text-[11px] text-slate-500">{t('creditPack.credits')}</span>
              </div>

              {isSelected ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-[#FF5A1F]/10 border border-[#FF5A1F]/20">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] text-slate-500 font-medium">{t('billing.amount')}</span>
                      <span className="text-sm font-bold text-white">{formatCurrency(pack.price)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 font-medium">{t('creditPack.youReceive')}</span>
                      <span className="text-sm font-bold text-[#FF5A1F]">{credits.toLocaleString('vi-VN')} credits</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => onSelectPack(null)}
                      disabled={loading}
                      className="flex-1 h-10 rounded-lg bg-white/5 hover:bg-white/10 text-white font-bold text-xs disabled:opacity-50"
                    >
                      {t('creditPack.changePack')}
                    </Button>
                    <Button
                      onClick={() => onConfirmPack({ ...pack, credits })}
                      disabled={loading}
                      className="flex-1 h-10 rounded-lg bg-white text-black hover:bg-zinc-200 font-bold text-xs disabled:opacity-50"
                    >
                      {loading ? (
                        <div className="flex items-center gap-1.5">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span className="text-[11px]">Đang xử lý...</span>
                        </div>
                      ) : (
                        t('creditPack.confirm')
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={() => onSelectPack({ ...pack, credits })}
                  disabled={isLocked}
                  className="w-full h-10 rounded-lg bg-white/5 hover:bg-white/10 text-white font-bold text-xs border border-white/5 hover:border-white/10 disabled:opacity-50"
                >
                  {t('creditPack.select')}
                </Button>
              )}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
