'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight, Gift } from 'lucide-react';
import { laravel } from '@/lib/api/client';
import { useToastStore } from '@/stores/toast-store';
import type { Transaction } from './types';

const TX_TYPE_CONFIG: Record<string, { label: string; color: string; icon: typeof ArrowUpRight }> = {
  purchase: { label: 'Nạp tiền', color: 'text-emerald-400 bg-emerald-400/10', icon: ArrowDownRight },
  usage: { label: 'Sử dụng', color: 'text-red-400 bg-red-400/10', icon: ArrowUpRight },
  bonus: { label: 'Thưởng', color: 'text-[#FF8A5B] bg-[#FF8A5B]/10', icon: Gift },
  refund: { label: 'Hoàn tiền', color: 'text-amber-400 bg-amber-400/10', icon: ArrowDownRight },
};

const TX_TYPE_FILTERS = [
  { slug: '', label: 'Tất cả' },
  { slug: 'purchase', label: 'Nạp tiền' },
  { slug: 'usage', label: 'Sử dụng' },
  { slug: 'bonus', label: 'Thưởng' },
  { slug: 'refund', label: 'Hoàn tiền' },
];

export function TransactionHistory() {
  const addToast = useToastStore((s) => s.addToast);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txTypeFilter, setTxTypeFilter] = useState('');
  const [txPage, setTxPage] = useState(1);
  const txPerPage = 8;

  const loadTransactions = async () => {
    setTxLoading(true);
    try {
      const res: any = await laravel.creditsHistory();
      let txs: any[] = [];
      if (Array.isArray(res)) {
        txs = res;
      } else if (Array.isArray(res?.data)) {
        txs = res.data;
      } else if (Array.isArray(res?.data?.items)) {
        txs = res.data.items;
      } else if (Array.isArray(res?.items)) {
        txs = res.items;
      }
      setTransactions(txs);
    } catch {
      addToast('Không thể tải lịch sử giao dịch', 'error');
    } finally {
      setTxLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const filteredTx = txTypeFilter
    ? transactions.filter(tx => tx.type === txTypeFilter)
    : transactions;
  const totalTxPages = Math.max(1, Math.ceil(filteredTx.length / txPerPage));
  const paginatedTx = filteredTx.slice((txPage - 1) * txPerPage, txPage * txPerPage);

  const getTxPageNumbers = (): (number | '...')[] => {
    const pages: (number | '...')[] = [];
    if (totalTxPages <= 7) {
      for (let i = 1; i <= totalTxPages; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    if (txPage > 3) pages.push('...');
    const start = Math.max(2, txPage - 1);
    const end = Math.min(totalTxPages - 1, txPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (txPage < totalTxPages - 2) pages.push('...');
    pages.push(totalTxPages);
    return pages;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Lịch sử giao dịch credits</span>
        <div className="h-px flex-1 bg-gradient-to-l from-white/10 to-transparent" />
      </div>

      {/* Type filters */}
      <div className="flex p-1.5 rounded-xl bg-[#16141a] border border-white/12 overflow-x-auto no-scrollbar w-fit">
        {TX_TYPE_FILTERS.map(f => (
          <button key={f.slug} onClick={() => { setTxTypeFilter(f.slug); setTxPage(1); }}
            className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap cursor-pointer ${
              txTypeFilter === f.slug ? 'bg-[#FF5A1F] text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Transaction list */}
      <div className="space-y-2.5">
        {!txLoading && paginatedTx.length === 0 ? (
          <div className="text-center py-12 text-slate-400 font-medium text-sm">Chưa có giao dịch nào</div>
        ) : (
          paginatedTx.map((tx, idx) => {
            const cfg = TX_TYPE_CONFIG[tx.type] || TX_TYPE_CONFIG.usage;
            const Icon = cfg.icon;
            return (
              <motion.div
                key={tx.uuid ?? `tx-${idx}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="flex items-center justify-between p-4 rounded-2xl bg-[#16141a] border border-white/12 hover:border-white/10 transition-all"
              >
                <div className="flex items-center gap-3.5">
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${cfg.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white tracking-tight">{tx.description || cfg.label}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-white/5 text-slate-500">{cfg.label}</span>
                      <span className="text-[10px] font-medium text-slate-400">{new Date(tx.created_at).toLocaleString('vi-VN')}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-bold tracking-tight ${tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                  </span>
                  {tx.balance_after != null && (
                    <p className="text-[10px] text-slate-400 font-medium">Số dư: {tx.balance_after.toLocaleString()}</p>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
        {txLoading && (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 rounded-full border-2 border-white/10 border-t-[#FF5A1F] animate-spin" />
          </div>
        )}
      </div>

      {/* Transaction pagination */}
      {totalTxPages > 1 && !txLoading && (
        <div className="flex items-center justify-center gap-1">
          <button onClick={() => setTxPage(p => Math.max(1, p - 1))} disabled={txPage <= 1}
            className="h-9 w-9 rounded-xl bg-[#16141a] border border-white/12 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronLeft className="h-4 w-4" />
          </button>
          {getTxPageNumbers().map((p, i) =>
            p === '...' ? (
              <span key={`tx-dots-${i}`} className="h-9 w-9 flex items-center justify-center text-slate-400 text-xs font-bold">...</span>
            ) : (
              <button key={p} onClick={() => setTxPage(p as number)}
                className={`h-9 w-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                  p === txPage ? 'bg-[#FF5A1F] text-white shadow-sm shadow-[#FF5A1F]/20' : 'bg-[#16141a] border border-white/12 text-slate-400 hover:text-white hover:bg-white/5'
                }`}>
                {p}
              </button>
            )
          )}
          <button onClick={() => setTxPage(p => Math.min(totalTxPages, p + 1))} disabled={txPage >= totalTxPages}
            className="h-9 w-9 rounded-xl bg-[#16141a] border border-white/12 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
