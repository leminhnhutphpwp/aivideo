'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';

export function AuthHydrator({ children }: { children: React.ReactNode }) {
  const hydrate = useAuthStore(s => s.hydrate);

  useEffect(() => {
    const dispose = hydrate();
    return () => { dispose?.(); };
  }, [hydrate]);

  return <>{children}</>;
}
