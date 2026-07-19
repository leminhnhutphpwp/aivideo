'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { laravel } from '@/lib/api/client';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore(s => s.setAuth);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      setStatus('error');
      setTimeout(() => router.push('/'), 2000);
      return;
    }

    if (!token) {
      setStatus('error');
      setTimeout(() => router.push('/'), 2000);
      return;
    }

    const verifyAndLogin = async () => {
      try {
        localStorage.setItem('auth_token', token);
        const user = await laravel.me();
        setAuth(token, user);
        setStatus('success');
        setTimeout(() => router.push('/dashboard'), 500);
      } catch {
        setStatus('error');
        setTimeout(() => router.push('/'), 2000);
      }
    };

    verifyAndLogin();
  }, [searchParams, router, setAuth]);

  return (
    <div className="text-center space-y-4">
      {status === 'loading' && (
        <>
          <div className="h-8 w-8 rounded-full border-2 border-[#FF5A1F]/30 border-t-[#FF5A1F] animate-spin mx-auto" />
          <p className="text-slate-400 font-medium">Đang đăng nhập...</p>
        </>
      )}
      {status === 'success' && (
        <>
          <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
            <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-emerald-400 font-medium">Đăng nhập thành công!</p>
        </>
      )}
      {status === 'error' && (
        <>
          <div className="h-8 w-8 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
            <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="text-red-400 font-medium">Đăng nhập thất bại. Đang chuyển hướng...</p>
        </>
      )}
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <div className="min-h-screen bg-[#16141a] flex items-center justify-center">
      <Suspense fallback={
        <div className="text-center space-y-4">
          <div className="h-8 w-8 rounded-full border-2 border-[#FF5A1F]/30 border-t-[#FF5A1F] animate-spin mx-auto" />
          <p className="text-slate-400 font-medium">Đang đăng nhập...</p>
        </div>
      }>
        <CallbackContent />
      </Suspense>
    </div>
  );
}
