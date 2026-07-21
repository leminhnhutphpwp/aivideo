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

const CHECK_INTERVAL_MS = 30_000;
// Module-level guard so repeated mounts share ONE polling interval.
let pollTimer: ReturnType<typeof setInterval> | null = null;

export function initDaemonCheck() {
  // Kick an immediate check so callers get a fresh status on first mount.
  useDaemonStore.getState().check();
  if (pollTimer) return;
  // Poll regardless of current `ok` so an online→offline transition (or the
  // reverse) is always detected — never short-circuit once online.
  pollTimer = setInterval(() => {
    useDaemonStore.getState().check();
  }, CHECK_INTERVAL_MS);
}
