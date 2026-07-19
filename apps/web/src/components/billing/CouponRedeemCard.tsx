'use client';

import { useState } from 'react';
import { Ticket, Loader2 } from 'lucide-react';
import { laravel } from '@/lib/api/client';
import { useToastStore } from '@/stores/toast-store';

/**
 * Ô nhập mã coupon → nhận credits. Đặt trên trang billing (dưới số dư).
 * Khi đổi thành công gọi onRedeemed() để refresh số dư + lịch sử.
 */
export function CouponRedeemCard({ onRedeemed }: { onRedeemed: () => void }) {
  const addToast = useToastStore((s) => s.addToast);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRedeem = async () => {
    const value = code.trim();
    if (!value) {
      addToast('Vui lòng nhập mã', 'warning');
      return;
    }
    setLoading(true);
    try {
      const res = await laravel.redeemCoupon(value);
      addToast(res.message || 'Đổi mã thành công!', 'success');
      setCode('');
      onRedeemed();
    } catch (err: any) {
      addToast(err?.message || 'Mã không hợp lệ', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl bg-[#16141a] border border-white/12 p-4 md:p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-lg bg-[#FF5A1F]/10 flex items-center justify-center">
          <Ticket className="h-4 w-4 text-[#FF5A1F]" />
        </div>
        <div>
          <p className="text-sm font-bold text-white tracking-tight">Đổi mã nhận credits</p>
          <p className="text-[11px] text-slate-500">Nhập mã quà tặng để cộng credits vào tài khoản.</p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => { if (e.key === 'Enter') handleRedeem(); }}
          placeholder="Nhập mã, ví dụ WELCOME2026"
          maxLength={64}
          className="flex-1 h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white outline-none focus:border-[#FF5A1F]/30 transition-all placeholder:text-slate-500 font-medium tracking-wider uppercase"
        />
        <button
          onClick={handleRedeem}
          disabled={loading || !code.trim()}
          className="h-11 px-6 rounded-xl bg-[#FF5A1F] hover:bg-[#FF6A2B] text-white font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shrink-0"
        >
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Đang đổi...</> : 'Đổi mã'}
        </button>
      </div>
    </div>
  );
}
