'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Clock, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { laravel } from '@/lib/api/client';
import { t } from '@/lib/i18n';
import type { UpgradeHistory } from './types';
import { useToastStore } from '@/stores/toast-store';

interface UpgradeHistoryTableProps {
  onUpgradeStatusChange: () => void;
}

export function UpgradeHistoryTable({ onUpgradeStatusChange }: UpgradeHistoryTableProps) {
  const addToast = useToastStore(s => s.addToast);
  const [upgradeHistory, setUpgradeHistory] = useState<UpgradeHistory[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const historyPerPage = 5;

  const prevUpgradeStatusRef = useRef<string>('');

  const fetchHistory = async (silent = false) => {
    try {
      const historyData: any = await laravel.creditsUpgradeHistory();
      let history: any[] = [];
      if (Array.isArray(historyData)) {
        history = historyData;
      } else if (Array.isArray(historyData?.data)) {
        history = historyData.data;
      } else if (Array.isArray(historyData?.data?.items)) {
        history = historyData.data.items;
      } else if (Array.isArray(historyData?.items)) {
        history = historyData.items;
      }
      
      const currStatus = history.map((p: any) => `${p.transfer_code}:${p.status}`).join(',');
      if (!silent && prevUpgradeStatusRef.current && prevUpgradeStatusRef.current !== currStatus) {
        addToast('Có cập nhật trạng thái yêu cầu nâng cấp!', 'success');
        onUpgradeStatusChange();
      }
      prevUpgradeStatusRef.current = currStatus;
      setUpgradeHistory(history);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchHistory(true);
  }, []);

  const hasPendingUpgrades = upgradeHistory.some(h => h.status === 'pending');

  useEffect(() => {
    if (!hasPendingUpgrades) return;
    const interval = setInterval(() => fetchHistory(false), 15000);
    return () => clearInterval(interval);
  }, [hasPendingUpgrades]);

  if (upgradeHistory.length === 0) return null;

  const totalHistoryPages = Math.max(1, Math.ceil(upgradeHistory.length / historyPerPage));
  const paginatedHistory = upgradeHistory.slice((historyPage - 1) * historyPerPage, historyPage * historyPerPage);
  const historyStart = (historyPage - 1) * historyPerPage + 1;
  const historyEnd = Math.min(historyPage * historyPerPage, upgradeHistory.length);

  const getHistoryPageNumbers = (): (number | '...')[] => {
    const pages: (number | '...')[] = [];
    if (totalHistoryPages <= 7) {
      for (let i = 1; i <= totalHistoryPages; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    if (historyPage > 3) pages.push('...');
    const start = Math.max(2, historyPage - 1);
    const end = Math.min(totalHistoryPages - 1, historyPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (historyPage < totalHistoryPages - 2) pages.push('...');
    pages.push(totalHistoryPages);
    return pages;
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('vi-VN').format(amount) + 'đ';

  return (
    <div id="history" className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-white tracking-tight">{t('billing.upgradeHistory')}</h3>
          <p className="text-xs text-slate-600 font-medium">Lịch sử nâng cấp và thanh toán</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
          <Clock className="h-3.5 w-3.5" />
          {historyStart}-{historyEnd} / {upgradeHistory.length}
        </div>
      </div>

      <div className="space-y-3">
        {paginatedHistory.map((upgrade, idx) => {
          const statusConfig: Record<string, { bg: string; border: string; text: string; dot: string; label: string }> = {
            paid: { bg: 'bg-emerald-500/5', border: 'border-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-400', label: 'Đã thanh toán' },
            pending: { bg: 'bg-amber-500/5', border: 'border-amber-500/15', text: 'text-amber-400', dot: 'bg-amber-400', label: 'Chờ xử lý' },
            cancelled: { bg: 'bg-red-500/5', border: 'border-red-500/15', text: 'text-red-400', dot: 'bg-red-400', label: 'Đã hủy' },
          };
          const cfg = statusConfig[upgrade.status] || statusConfig.pending;

          return (
            <motion.div
              key={upgrade.transfer_code ?? `upgrade-${idx}`}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`group flex flex-col sm:flex-row sm:items-center gap-4 p-4 md:p-5 rounded-2xl ${cfg.bg} border ${cfg.border} hover:bg-white/[0.02] transition-all`}
            >
              <div className="flex items-center gap-4 flex-1">
                <div className={`h-10 w-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0`}>
                  <ArrowRight className="h-4 w-4 text-slate-500 rotate-[-30deg]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white tracking-tight truncate">
                    {upgrade.from_plan?.name || 'Free'} <span className="text-slate-600 mx-1">→</span> {upgrade.to_plan?.name}
                  </p>
                  <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                    {upgrade.created_at ? new Date(upgrade.created_at).toLocaleDateString('vi-VN') : '—'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6">
                <p className="text-sm font-bold text-white">
                  {upgrade.amount ? formatCurrency(upgrade.amount) : '—'}
                </p>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-950/20 ${cfg.text}`}>
                  <div className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">{cfg.label}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalHistoryPages > 1 && (
        <div className="flex items-center justify-center gap-1 pt-2">
          <button
            onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
            disabled={historyPage <= 1}
            className="h-9 w-9 rounded-xl bg-zinc-950 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {getHistoryPageNumbers().map((p, i) =>
            p === '...' ? (
              <span key={`dots-${i}`} className="h-9 w-9 flex items-center justify-center text-slate-600 text-xs font-bold">...</span>
            ) : (
              <button
                key={p}
                onClick={() => setHistoryPage(p as number)}
                className={`h-9 w-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                  p === historyPage
                    ? 'bg-[#FF5A1F] text-white shadow-sm shadow-[#FF5A1F]/20'
                    : 'bg-zinc-950 border border-white/5 text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {p}
              </button>
            )
          )}
          <button
            onClick={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))}
            disabled={historyPage >= totalHistoryPages}
            className="h-9 w-9 rounded-xl bg-zinc-950 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
