'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { MobileSidebar } from '@/components/layout/mobile-sidebar';
import { Topbar } from '@/components/layout/topbar';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { ToastContainer } from '@/components/ui/toast';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useTokenRefresh } from '@/hooks/use-token-refresh';
import { initTheme } from '@/stores/theme-store';
import { useAuthStore } from '@/stores/auth-store';
import Link from 'next/link';
import { Mail, X, ArrowRight } from 'lucide-react';

function EmailVerifyAlert() {
  const user = useAuthStore(s => s.user);
  const [dismissed, setDismissed] = useState(false);

  if (user?.email_verified_at || dismissed) return null;

  return (
    <div className="mb-6 animate-item-rise">
      <div className="relative rounded-2xl bg-gradient-to-r from-[#FF5A1F]/[0.08] to-[#FF8A5B]/[0.04] border border-[#FF5A1F]/20 p-4 md:p-5 overflow-hidden">
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-[#FF5A1F]/10 blur-[60px] pointer-events-none" />

        <div className="relative flex items-start gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-[#FF5A1F]/10 flex items-center justify-center shrink-0">
            <Mail className="h-5 w-5 text-[#FF5A1F]" />
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-white tracking-tight">Xác thực email</p>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Email của bạn chưa được xác thực. Hãy xác thực để bảo mật tài khoản và mở khóa đầy đủ tính năng.
            </p>
            <Link
              href="/verify-email"
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#FF5A1F] hover:text-[#FF8A5B] uppercase tracking-wider transition-colors mt-1"
            >
              Xác thực ngay <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <button
            onClick={() => setDismissed(true)}
            className="shrink-0 h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function DashboardInner({ children }: { children: React.ReactNode }) {
  useTokenRefresh();

  useEffect(() => {
    initTheme();
  }, []);

  return (
    <>
      <Sidebar />
      <MobileSidebar />
      <div className="flex flex-col transition-all duration-500 lg:pl-[88px] min-w-0 w-full" style={{ backgroundColor: 'var(--surface)', color: 'var(--foreground)' }}>
        <Topbar />
        <main className="p-4 md:p-6 lg:p-6 max-w-[1600px] mx-auto w-full min-w-0">
          <EmailVerifyAlert />
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
      <ToastContainer />
      <ConfirmDialog />
    </>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen" style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
        <DashboardInner>{children}</DashboardInner>
      </div>
    </ProtectedRoute>
  );
}
