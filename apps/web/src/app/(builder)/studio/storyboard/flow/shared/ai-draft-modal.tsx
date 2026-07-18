'use client';

import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Loader2 } from 'lucide-react';

interface AiDraftModalProps {
  open: boolean;
  concept: string;
  onConceptChange: (v: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  submitting: boolean;
}

export function AiDraftModal({ open, concept, onConceptChange, onClose, onSubmit, submitting }: AiDraftModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-zinc-950/70 backdrop-blur-md z-[200] flex items-center justify-center p-4"
          onClick={submitting ? undefined : onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-md bg-zinc-900 border border-white/[0.08] rounded-2xl p-6 shadow-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF5A1F]/20 to-[#FF8A5B]/10 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-[#FF5A1F]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">AI Phác thảo kịch bản</h3>
                <p className="text-[11px] text-slate-500">Nhập ý tưởng, AI sẽ tạo các cảnh tự động</p>
              </div>
            </div>
            <textarea
              value={concept}
              onChange={(e) => onConceptChange(e.target.value)}
              placeholder='Ví dụ: "Quảng cáo nước tăng lực cyberpunk 30s, kết thúc bằng cảnh nhân vật bay lên trời"...'
              rows={4}
              maxLength={1000}
              autoFocus
              disabled={submitting}
              className="w-full bg-[#0A0A0E] border border-white/[0.08] rounded-xl p-3 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-[#FF5A1F]/50 transition-all resize-none disabled:opacity-50"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.metaKey && !submitting) onSubmit();
              }}
            />

            {submitting && (
              <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-[#FF5A1F]/[0.07] border border-[#FF5A1F]/20 px-3 py-2.5">
                <Loader2 className="h-4 w-4 text-[#FF5A1F] animate-spin shrink-0" />
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-[#FF8A5B]">AI đang phác thảo kịch bản…</p>
                  <p className="text-[10px] text-slate-500">Quá trình này có thể mất 30–60 giây, vui lòng đợi một chút.</p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mt-4">
              <span className="text-[10px] text-slate-600">{concept.length}/1000</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  disabled={submitting}
                  className="cursor-pointer h-9 px-4 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[11px] text-slate-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Hủy
                </button>
                <button
                  onClick={onSubmit}
                  disabled={concept.trim().length < 10 || submitting}
                  className="cursor-pointer h-9 px-4 rounded-xl bg-gradient-to-r from-[#FF5A1F] to-[#FF6B35] hover:from-[#FF6B35] hover:to-[#FF7B45] text-[11px] text-white font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_2px_12px_rgba(255,90,31,0.25)] flex items-center gap-1.5"
                >
                  {submitting ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang tạo…</>
                  ) : (
                    'Tạo kịch bản'
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
