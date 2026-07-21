'use client';

import { create } from 'zustand';
import { laravel, tryRefreshToken } from '@/lib/api/client';
import { resetEcho } from '@/lib/echo';

interface Plan {
  slug: string;
  name: string;
  description: string | null;
  max_concurrent_jobs: number;
  queue_priority: string;
  monthly_credits: number;
  price_regular: number;
  price_sale: number | null;
  audio_generation: boolean;
  status: string;
  /** Capability keys this plan has a model configured for (from model_mapping). */
  capabilities?: string[];
}

interface User {
  uuid: string;
  name: string;
  email: string;
  avatar_url: string | null;
  credits: number;
  credits_total_used: number;
  phone_number: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  email_verified_at: string | null;
  is_active: boolean;
  auto_renew: boolean;
  trial_ends_at: string | null;
  plan_expires_at: string | null;
  created_at: string;
  updated_at: string;
  plan: Plan | null;
}

interface AuthState {
  token: string | null;
  user: User | null;
  loading: boolean;
  setAuth: (token: string, user: User) => void;
  setUser: (user: User) => void;
  /** Update just the credit balance (e.g. from the `.credits.updated` realtime event). */
  setCredits: (credits: number) => void;
  logout: () => void;
  /** Hydrates auth from storage and wires a cross-tab `storage` listener.
   * Returns a disposer that removes the listener (call in effect cleanup). */
  hydrate: () => (() => void) | void;
  refreshToken: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  loading: true,

  setAuth: (token, user) => {
    localStorage.setItem('auth_token', token);
    set({ token, user, loading: false });
  },

  setUser: (user) => set({ user }),

  setCredits: (credits) =>
    set((s) => (s.user ? { user: { ...s.user, credits } } : {})),

  logout: () => {
    localStorage.removeItem('auth_token');
    // Tear down the realtime socket so the next login builds a fresh one bound
    // to the new user/token (the singleton would otherwise stay on the old user).
    resetEcho();
    set({ token: null, user: null, loading: false });
  },

  refreshToken: async () => {
    // Route through client.ts's single de-duplicated refresh so the 50-min
    // timer refresh and a reactive 401 refresh can never race and blacklist
    // each other's token (which would 401 the loser → spurious logout).
    // `tryRefreshToken()` persists the rotated token to localStorage on success.
    const ok = await tryRefreshToken();
    if (!ok) return false;
    const newToken = localStorage.getItem('auth_token');
    if (!newToken) return false;
    // No resetEcho() needed: the Echo auth header is a getter that reads the
    // current token per /api/broadcasting/auth request, so the live socket
    // keeps its channel subscriptions and picks up the rotated token.
    set({ token: newToken });
    return true;
  },

  hydrate: () => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      (async () => {
        try {
          const user = await laravel.me();
          set({ token, user, loading: false });
        } catch {
          // `me()` may have pruned an expired-but-refreshable token from storage
          // (getToken removes it once past `exp`). Restore the captured raw token
          // so the shared refresh — which reads the raw stored token — can still
          // exchange it within tymon's refresh-TTL instead of forcing a logout.
          localStorage.setItem('auth_token', token);
          try {
            const ok = await tryRefreshToken();
            if (!ok) throw new Error('refresh_failed');
            const newToken = localStorage.getItem('auth_token');
            const user = await laravel.me();
            set({ token: newToken, user, loading: false });
          } catch {
            localStorage.removeItem('auth_token');
            set({ token: null, user: null, loading: false });
          }
        }
      })();
    } else {
      set({ loading: false });
    }

    if (typeof window !== 'undefined') {
      const handler = (e: StorageEvent) => {
        if (e.key !== 'auth_token') return;
        const currentToken = get().token;
        const newToken = e.newValue;

        if (newToken && !currentToken) {
          // Logged in on another tab — hydrate the session here too.
          (async () => {
            try {
              const user = await laravel.me();
              set({ token: newToken, user, loading: false });
            } catch {
              set({ token: null, user: null, loading: false });
            }
          })();
        } else if (!newToken && currentToken) {
          // Logged out on another tab.
          set({ token: null, user: null, loading: false });
        } else if (newToken && newToken !== currentToken) {
          // Token rotated on another tab (refresh) — adopt the new token.
          set({ token: newToken });
        }
      };
      window.addEventListener('storage', handler);
      return () => window.removeEventListener('storage', handler);
    }
  },
}));
