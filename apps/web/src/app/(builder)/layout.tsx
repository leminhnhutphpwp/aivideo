'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { ToastContainer } from '@/components/ui/toast';
import { initTheme } from '@/stores/theme-store';
import { useEffect } from 'react';

export default function BuilderLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => { initTheme(); }, []);

  return (
    <div className="h-screen w-screen overflow-hidden" style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
      <ErrorBoundary>
        <ProtectedRoute>
          {children}
        </ProtectedRoute>
      </ErrorBoundary>
      <ToastContainer />
    </div>
  );
}
