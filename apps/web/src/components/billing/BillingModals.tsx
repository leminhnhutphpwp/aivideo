'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { laravel } from '@/lib/api/client';
import { useToastStore } from '@/stores/toast-store';
import { BankInfoModal } from './BankInfoModal';
import type { UpgradeData } from './types';

interface BillingModalsProps {
  upgradeModal: UpgradeData | null;
  setUpgradeModal: (data: UpgradeData | null) => void;
  onDone: () => void;
}

export function BillingModals({
  upgradeModal,
  setUpgradeModal,
  onDone,
}: BillingModalsProps) {
  const addToast = useToastStore((s) => s.addToast);
  const [loadingUpgrade, setLoadingUpgrade] = useState(false);
  const [upgradeConfirm, setUpgradeConfirm] = useState<{ slug: string; plan_name: string; price: number } | null>(null);
  const [upgradeReceipt, setUpgradeReceipt] = useState<UpgradeData | null>(null);

  const handleCloseReceipt = () => {
    setUpgradeReceipt(null);
    onDone();
  };

  useEffect(() => {
    if (upgradeModal && (upgradeModal as any).slug) {
      const m = upgradeModal as any;
      setUpgradeConfirm({ slug: m.slug, plan_name: m.plan_name || m.slug, price: m.price || 0 });
      setUpgradeModal(null);
    }
  }, [upgradeModal]);

  return (
    <>
      {/* ========== UPGRADE CONFIRM MODAL ========== */}
      <AnimatePresence>
        {upgradeConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#16141a]/70 backdrop-blur-md z-[200] flex items-center justify-center p-4"
            onClick={() => setUpgradeConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="w-full max-w-sm bg-[#16141a] border border-white/10 rounded-2xl overflow-hidden shadow-md"
              onClick={e => e.stopPropagation()}
            >
              <div className="billing-zigzag-top h-3 w-full" />
              <div className="p-5 md:p-6 pt-2 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center">
                    <CreditCard className="h-4 w-4 text-slate-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Nâng cấp gói</h3>
                    <p className="text-[10px] text-slate-500 font-medium">{upgradeConfirm.plan_name}</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-r from-[#FF5A1F]/15 to-[#FF5A1F]/5 border border-[#FF5A1F]/25 text-center">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Số tiền</p>
                  <p className="text-2xl font-bold text-[#FF5A1F]">{upgradeConfirm.price.toLocaleString('vi-VN')}đ</p>
                </div>

                <p className="text-xs text-slate-500 text-center leading-relaxed">
                  Bấm <span className="text-[#FF5A1F] font-semibold">Xác nhận</span> để tạo yêu cầu nâng cấp và nhận thông tin chuyển khoản
                </p>

                {loadingUpgrade && (
                  <div className="flex items-center justify-center gap-2 py-2">
                    <div className="h-4 w-4 rounded-full border-2 border-[#FF5A1F]/30 border-t-[#FF5A1F] animate-spin" />
                    <span className="text-xs text-slate-400">Đang tạo yêu cầu...</span>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button onClick={() => setUpgradeConfirm(null)} disabled={loadingUpgrade}
                    className="flex-1 h-11 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm disabled:opacity-50">
                    Quay lại
                  </Button>
                  <Button onClick={async () => {
                    setLoadingUpgrade(true);
                    try {
                      const data = await laravel.creditsUpgrade(upgradeConfirm.slug);
                      if (data.success) {
                        setUpgradeConfirm(null);
                        setUpgradeReceipt(data);
                      } else {
                        addToast(data.message || 'Có lỗi xảy ra', 'error');
                        setUpgradeConfirm(null);
                      }
                    } catch (err: any) {
                      addToast(err.message || 'Có lỗi xảy ra', 'error');
                      setUpgradeConfirm(null);
                    } finally {
                      setLoadingUpgrade(false);
                    }
                  }} disabled={loadingUpgrade}
                    className="flex-1 h-11 rounded-xl bg-[#FF5A1F] hover:bg-[#FF6A2B] text-white font-bold text-sm disabled:opacity-50">
                    Xác nhận
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========== UPGRADE RECEIPT ========== */}
      {upgradeReceipt && (
        <BankInfoModal
          data={upgradeReceipt}
          type="upgrade"
          onClose={handleCloseReceipt}
        />
      )}
    </>
  );
}
