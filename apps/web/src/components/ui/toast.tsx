'use client';

import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useToastStore, type ToastVariant } from '@/stores/toast-store';

const iconMap: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle className="h-5 w-5 text-emerald-400" />,
  error: <AlertCircle className="h-5 w-5 text-red-400" />,
  warning: <AlertTriangle className="h-5 w-5 text-amber-400" />,
  info: <Info className="h-5 w-5 text-[#FF8A5B]" />,
};

const borderMap: Record<ToastVariant, string> = {
  success: 'border-emerald-500/20',
  error: 'border-red-500/20',
  warning: 'border-amber-500/20',
  info: 'border-[#FF5A1F]/20',
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed top-5 right-5 z-[300] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`pointer-events-auto flex items-center gap-3 rounded-2xl border ${borderMap[toast.variant]} bg-[#16141a]/90 backdrop-blur-xl px-5 py-4 min-w-[320px] max-w-[420px] shadow-md`}
          >
            {iconMap[toast.variant]}
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-slate-200">{toast.message}</span>
              {toast.action && (
                <button
                  onClick={() => { toast.action!.onClick(); removeToast(toast.id); }}
                  className="ml-2 text-xs font-semibold text-[#FF5A1F] hover:text-[#FF6A2B] transition-colors"
                >
                  {toast.action.label}
                </button>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-white transition-colors shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
