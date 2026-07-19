'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CreditCard, Coins, X, AlertCircle, CheckCircle, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToastStore } from '@/stores/toast-store';
import { t } from '@/lib/i18n';
import type { PurchaseData, UpgradeData } from './types';

interface BankInfoModalProps {
  data: PurchaseData | UpgradeData;
  type: 'purchase' | 'upgrade';
  onClose: () => void;
}

export function BankInfoModal({ data, type, onClose }: BankInfoModalProps) {
  const addToast = useToastStore((s) => s.addToast);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('vi-VN').format(amount) + '\u0111';

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
      addToast('\u0110\u00e3 sao ch\u00e9p!', 'success');
    } catch {
      addToast('Kh\u00f4ng th\u1ec3 sao ch\u00e9p', 'error');
    }
  };

  const isUpgrade = type === 'upgrade';
  const upgradeData = isUpgrade ? (data as UpgradeData) : null;
  const purchaseData = !isUpgrade ? (data as PurchaseData) : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-[#16141a]/70 backdrop-blur-md z-[200] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          className="w-full max-w-sm bg-[#16141a] border border-white/12 rounded-2xl shadow-md shadow-black/80 relative overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="billing-zigzag-top h-3 w-full" />

          <div className="p-5 md:p-6 pt-2 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center">
                  {isUpgrade ? <CreditCard className="h-4 w-4 text-slate-400" /> : <Coins className="h-4 w-4 text-slate-400" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{isUpgrade ? t('billing.upgradePayment') : t('billing.purchaseCredits')}</h3>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {isUpgrade ? upgradeData?.target_plan : `${purchaseData?.credits_to_receive?.toLocaleString('vi-VN') ?? '...'} credits`}
                  </p>
                </div>
              </div>
              <button onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-all">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-gradient-to-r from-[#FF5A1F]/15 to-[#FF5A1F]/5 border border-[#FF5A1F]/25 text-center">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">{t('billing.amount')}</p>
              <p className="text-2xl font-bold text-[#FF5A1F] tracking-tight">
                {formatCurrency(data.amount || 0)}
              </p>
            </div>

            {data.bank && (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: t('billing.bankName'), value: data.bank.bank },
                  { label: t('billing.accountNumber'), value: data.bank.account, mono: true },
                  { label: t('billing.accountHolder'), value: data.bank.holder },
                ].map((item) => (
                  <div key={item.label} className="p-2.5 rounded-xl bg-white/[0.03] border border-white/12 text-center">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1">{item.label}</p>
                    <p className={`text-[11px] font-bold text-white leading-tight ${item.mono ? 'font-mono' : ''}`}>{item.value}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/12">
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-2">{t('billing.transferContent')}</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-bold text-white font-mono bg-[#16141a]/30 rounded-lg px-3 py-2 truncate">
                  {data.content}
                </code>
                <button
                  onClick={() => copyToClipboard(data.content || '', 'content')}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all shrink-0"
                >
                  {copiedField === 'content' ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/6 border border-amber-500/12">
              <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-200/70 leading-relaxed">{data.note}</p>
            </div>

            <Button
              onClick={onClose}
              className="w-full h-11 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm"
            >
              {t('billing.done')}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
