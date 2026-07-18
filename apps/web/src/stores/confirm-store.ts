'use client';

import { create } from 'zustand';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
}

interface ConfirmState {
  open: boolean;
  options: ConfirmOptions;
  resolve?: (value: boolean) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  close: () => void;
}

const defaultOptions: ConfirmOptions = {
  title: '',
  message: '',
  confirmLabel: 'Xác nhận',
  cancelLabel: 'Huỷ',
  variant: 'default',
};

export const useConfirmStore = create<ConfirmState>((set) => ({
  open: false,
  options: { ...defaultOptions },
  resolve: undefined,
  confirm: (options) => {
    return new Promise<boolean>((resolve) => {
      set({ open: true, options: { ...defaultOptions, ...options }, resolve });
    });
  },
  close: () => {
    set({ open: false, resolve: undefined });
  },
}));
