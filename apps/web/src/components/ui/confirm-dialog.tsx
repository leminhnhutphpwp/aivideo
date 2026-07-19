'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConfirmStore } from '@/stores/confirm-store';

export function ConfirmDialog() {
  const { open, options, resolve, close } = useConfirmStore();
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => confirmRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        resolve?.(false);
        close();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, resolve, close]);

  const handleConfirm = () => {
    resolve?.(true);
    close();
  };

  const handleCancel = () => {
    resolve?.(false);
    close();
  };

  const isDanger = options.variant === 'danger';

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-[#16141a]/60 backdrop-blur-sm"
            onClick={handleCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="relative w-[90vw] max-w-md bg-[#16141a] border border-white/12 rounded-2xl shadow-md p-6"
          >
            <button
              onClick={handleCancel}
              className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-start gap-5">
              {isDanger && (
                <div className="shrink-0 h-12 w-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-400" />
                </div>
              )}
              <div className="flex-1 min-w-0 space-y-2">
                <h2 className="text-lg font-display font-semibold text-white tracking-tight">
                  {options.title}
                </h2>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {options.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-8">
              <Button
                onClick={handleCancel}
                variant="ghost"
                className="h-10 px-6 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm font-semibold"
              >
                {options.cancelLabel}
              </Button>
              <Button
                ref={confirmRef}
                onClick={handleConfirm}
                className={`h-10 px-6 rounded-xl text-white text-sm font-bold tracking-tight transition-all ${
                  isDanger
                    ? 'bg-red-500 hover:bg-red-600 shadow-sm shadow-red-500/20'
                    : 'bg-[#FF5A1F] hover:bg-[#FF6A2B] shadow-sm shadow-[#FF5A1F]/20'
                }`}
              >
                {options.confirmLabel}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
