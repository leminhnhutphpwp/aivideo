'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { token, loading } = useAuthStore();

  useEffect(() => {
    if (!loading && !token) {
      router.replace('/');
    }
  }, [token, loading, router]);

  if (loading || !token) {
    return (
      <div className="min-h-screen bg-[#16141a] flex items-center justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-white/10 border-t-[#FF5A1F] animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
