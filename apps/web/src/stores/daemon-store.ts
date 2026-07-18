'use client';

import { create } from 'zustand';
import { laravel } from '@/lib/api/client';

interface DaemonState {
  ok: boolean | null;
  check: () => void;
}

export const useDaemonStore = create<DaemonState>((set) => ({
  ok: null,
  check: () => {
    laravel.daemonHealth()
      .then(() => set({ ok: true }))
      .catch(() => set({ ok: false }));
  },
}));

let lastCheck = 0;
const CHECK_INTERVAL_MS = 30_000;

export function initDaemonCheck() {
  const now = Date.now();
  if (now - lastCheck < CHECK_INTERVAL_MS) return;
  lastCheck = now;
  const state = useDaemonStore.getState();
  if (state.ok === true) return;
  state.check();
}
