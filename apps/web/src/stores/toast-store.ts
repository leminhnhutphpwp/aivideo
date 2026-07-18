'use client';

import { create } from 'zustand';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

interface ToastState {
  toasts: Toast[];
  addToast: (message: string, variant?: ToastVariant, options?: number | { duration?: number; action?: { label: string; onClick: () => void } }) => void;
  removeToast: (id: string) => void;
}

let counter = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message, variant = 'info', options = 4000) => {
    const id = `toast-${++counter}`;
    const duration = typeof options === 'number' ? options : (options.duration ?? 4000);
    const action = typeof options === 'number' ? undefined : options.action;
    set((s) => ({ toasts: [...s.toasts, { id, message, variant, duration, action }] }));
    if (duration > 0) {
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
      }, duration);
    }
  },
  removeToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));
