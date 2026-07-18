'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';

const REFRESH_INTERVAL_MS = 50 * 60 * 1000;

export function useTokenRefresh() {
  const { token, refreshToken, logout } = useAuthStore();

  useEffect(() => {
    if (!token) return;

    const interval = setInterval(async () => {
      const ok = await refreshToken();
      if (!ok) logout();
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [token, refreshToken, logout]);
}
