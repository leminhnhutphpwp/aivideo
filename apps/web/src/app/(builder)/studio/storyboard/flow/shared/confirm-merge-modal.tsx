'use client';

import { motion, AnimatePresence } from 'motion/react';
import { Film } from 'lucide-react';

interface ConfirmMergeModalProps {
  open: boolean;
  templateName: string;
  templateSceneCount: number;
  existingNodeCount: number;
  onCancel: () => void;
  onAppend: () => void;
  onReplace: () => void;
}

export function ConfirmMergeModal({
  open,
  templateName,
  templateSceneCount,
  existingNodeCount,
  onCancel,
  onAppend,
  onReplace,
}: ConfirmMergeModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-zinc-950/70 backdrop-blur-md z-[60] flex items-center justify-center p-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-sm bg-zinc-900 border border-white/[0.08] rounded-2xl shadow-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 text-center">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
                <Film className="h-6 w-6 text-amber-400" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">
                Đã có {existingNodeCount} cảnh trong kịch bản
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Mẫu <span className="text-white font-medium">"{templateName}"</span> ({templateSceneCount} cảnh). Bạn muốn xử lý thế nào?
              </p>
            </div>
            <div className="flex border-t border-white/[0.04]">
              <button
                onClick={onCancel}
                className="flex-1 h-11 text-[11px] font-medium text-slate-400 hover:text-white hover:bg-white/[0.02] transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={onAppend}
                className="flex-1 h-11 text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-white/[0.03] transition-colors border-l border-white/[0.04] cursor-pointer"
              >
                Nối tiếp
              </button>
              <button
                onClick={onReplace}
                className="flex-1 h-11 text-[11px] font-semibold text-red-400 hover:bg-red-500/5 transition-colors border-l border-white/[0.04] cursor-pointer"
              >
                Thay thế
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
