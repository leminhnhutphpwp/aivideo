'use client';

import React, { useState } from 'react';
import { X, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { laravel } from '@/lib/api/client';
import { useScrollLock } from '@/hooks/use-scroll-lock';
import { useToastStore } from '@/stores/toast-store';

interface ReportModalProps {
  assetUuid: string;
  isOpen: boolean;
  onClose: () => void;
}

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'inappropriate', label: 'Nội dung không phù hợp' },
  { value: 'copyright', label: 'Vi phạm bản quyền' },
  { value: 'other', label: 'Lý do khác' },
];

export function ReportModal({ assetUuid, isOpen, onClose }: ReportModalProps) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const addToast = useToastStore(s => s.addToast);

  useScrollLock(isOpen);

  const handleSubmit = async () => {
    if (!reason) return;

    setIsLoading(true);
    try {
      await laravel.communityReport(assetUuid, reason, details);
      setIsSuccess(true);
      setTimeout(() => {
        onClose();
        setIsSuccess(false);
        setReason('');
        setDetails('');
      }, 2000);
    } catch (error) {
      console.error('Failed to report:', error);
      addToast('Không thể gửi báo cáo. Vui lòng thử lại sau.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#16141a]/80 backdrop-blur-md"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative z-10 w-full max-w-md bg-[#16141a] border border-white/12 rounded-2xl p-6"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        {isSuccess ? (
          <div className="text-center py-8">
            <Flag className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Gửi báo cáo thành công</h3>
            <p className="text-sm text-slate-400">Cảm ơn bạn đã giúp cộng đồng an toàn hơn</p>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-bold text-white mb-4">Báo cáo tác phẩm</h3>

            <div className="space-y-2 mb-4">
              {REPORT_REASONS.map((r) => (
                <label
                  key={r.value}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                    reason === r.value
                      ? "border-[#FF5A1F]/30 bg-[#FF5A1F]/[0.02]"
                      : "border-white/12 hover:border-white/12"
                  )}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={(e) => setReason(e.target.value)}
                    className="sr-only"
                  />
                  <span className="text-sm text-slate-300">{r.label}</span>
                </label>
              ))}
            </div>

            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Chi tiết (tùy chọn)"
              className="w-full bg-white/[0.03] border border-white/12 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#FF5A1F]/30 mb-4 resize-none"
              rows={3}
            />

            <button
              onClick={handleSubmit}
              disabled={isLoading || !reason}
              className="w-full h-12 rounded-xl bg-[#FF5A1F] text-white font-bold text-sm hover:brightness-110 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? 'Đang gửi...' : 'Gửi báo cáo'}
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
