'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { CheckCircle, Clock } from 'lucide-react';
import { laravel } from '@/lib/api/client';
import { useToastStore } from '@/stores/toast-store';

interface PendingPurchasesProps {
  onStatusChange: () => void;
}

export function PendingPurchases({ onStatusChange }: PendingPurchasesProps) {
  const addToast = useToastStore(s => s.addToast);
  const [pendingPurchases, setPendingPurchases] = useState<any[]>([]);
  const prevStatusRef = useRef<string>('');

  const loadPendingPurchases = async (silent = false) => {
    try {
      const res: any = await laravel.pendingCreditsPurchases();
      const list = Array.isArray(res) ? res : (res?.data || []);
      const currStatus = list.map((p: any) => p.status).join(',');

      if (!silent && prevStatusRef.current && prevStatusRef.current !== currStatus) {
        addToast('Có cập nhật trạng thái yêu cầu nạp tiền!', 'success');
        onStatusChange();
      }

      prevStatusRef.current = currStatus;
      setPendingPurchases(list);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadPendingPurchases(true);
  }, []);

  useEffect(() => {
    if (pendingPurchases.length === 0) return;
    const interval = setInterval(() => loadPendingPurchases(false), 10000);
    return () => clearInterval(interval);
  }, [pendingPurchases.length > 0]);

  const pendingOnly = pendingPurchases.filter(p => p.status === 'pending');
  if (pendingOnly.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Yêu cầu đang chờ</span>
        <div className="h-px flex-1 bg-gradient-to-l from-white/10 to-transparent" />
      </div>

      <div className="space-y-3">
        {pendingOnly.map((p, idx) => {
          const statusCfg: Record<string, { bg: string; border: string; text: string; dot: string; label: string }> = {
            pending: { bg: 'bg-amber-500/5', border: 'border-amber-500/15', text: 'text-amber-400', dot: 'bg-amber-400', label: 'Chờ xác nhận' },
            paid: { bg: 'bg-emerald-500/5', border: 'border-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-400', label: 'Đã duyệt' },
            expired: { bg: 'bg-red-500/5', border: 'border-red-500/15', text: 'text-red-400', dot: 'bg-red-400', label: 'Hết hạn' },
          };
          const cfg = statusCfg[p.status] || statusCfg.pending;
          return (
            <motion.div key={p.transfer_code ?? `purchase-${idx}`}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`flex items-center justify-between p-4 rounded-2xl ${cfg.bg} border ${cfg.border}`}
            >
              <div className="flex items-center gap-3.5">
                <div className={`h-9 w-9 rounded-xl bg-white/5 border border-white/12 flex items-center justify-center`}>
                  {p.status === 'paid' ? <CheckCircle className="h-4 w-4 text-emerald-400" /> : <Clock className="h-4 w-4 text-amber-400" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Nạp {p.credits?.toLocaleString('vi-VN') || 0} credits</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${cfg.bg} ${cfg.text}`}>
                      <div className={`h-1 w-1 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">{new Date(p.created_at).toLocaleString('vi-VN')}</span>
                    {p.paid_at && (
                      <span className="text-[10px] text-slate-400">· Duyệt lúc {new Date(p.paid_at).toLocaleString('vi-VN')}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-white">{p.amount?.toLocaleString('vi-VN') || 0}đ</p>
                <p className="text-[9px] text-slate-400">Mã: {p.transfer_code}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
