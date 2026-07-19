'use client';

import { useState, useEffect, useRef } from 'react';
import { Mail, ArrowRight, RotateCcw, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { laravel } from '@/lib/api/client';
import { showApiError, showApiResponse } from '@/lib/api/handle-response';
import { useAuthStore } from '@/stores/auth-store';
import { useToastStore } from '@/stores/toast-store';
import { t } from '@/lib/i18n';
import { AuthLayout, AuthBrand } from '@/components/auth/auth-layout';

export default function VerifyEmailPage() {
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const token = useAuthStore(s => s.token);
  const setAuth = useAuthStore(s => s.setAuth);
  const setUser = useAuthStore(s => s.setUser);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const addToast = useToastStore(s => s.addToast);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token) {
      router.replace('/register');
      return;
    }
    if (user?.email_verified_at) {
      router.replace('/dashboard');
      return;
    }
  }, [token, user, router]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleVerify = async () => {
    if (!code.trim() || code.length !== 6) {
      setError('Vui lòng nhập mã 6 chữ số');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await laravel.verifyEmail(code);
      showApiResponse({ success: true, message: 'Xác thực email thành công!' });

      // Refresh user data (email_verified_at, và credits nếu có mã chào mừng)
      const refreshedUser = await laravel.me();
      setUser(refreshedUser);

      router.push('/dashboard');
    } catch (err: any) {
      showApiError(err, 'Xác thực thất bại');
      setError(err.message || 'Mã xác thực không chính xác hoặc đã hết hạn');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setResendLoading(true);
    try {
      await laravel.sendVerification();
      showApiResponse({ success: true, message: 'Mã xác thực đã được gửi lại' });
      setCountdown(60);
    } catch (err: any) {
      showApiError(err, 'Không thể gửi lại mã');
    } finally {
      setResendLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleVerify();
  };

  if (!token) return null;

  return (
    <AuthLayout
      leftContent={
        <>
          <AuthBrand />
          <div className="relative z-10 max-w-lg space-y-4">
            <h1 className="text-4xl md:text-5xl font-display-heading font-black tracking-[0.06em] leading-[1.1] text-white">
              Xác thực<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF5A1F] to-[#FF8A5B]">Email</span>
            </h1>
            <p className="text-sm md:text-base text-slate-400 font-medium leading-relaxed max-w-sm">
              Vui lòng kiểm tra hộp thư đến của bạn và nhập mã xác thực 6 chữ số để kích hoạt tài khoản.
            </p>
          </div>
        </>
      }
      rightContent={
        <>
          <div className="space-y-3 text-center lg:text-left animate-item-rise" style={{ animationDelay: '0ms' }}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#FF5A1F]/10 flex items-center justify-center">
                <Mail className="h-5 w-5 text-[#FF5A1F]" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-display font-semibold tracking-tight text-white">Xác thực email</h2>
                <p className="text-sm text-slate-500 font-medium tracking-tight">{user?.email || 'Email của bạn'}</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-[#FF5A1F]/5 border border-[#FF5A1F]/10 space-y-2">
              <div className="flex items-center gap-2 text-[#FF5A1F]">
                <CheckCircle className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Vì sao cần xác thực?</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Xác thực email giúp bảo mật tài khoản và kích hoạt đầy đủ tính năng của nền tảng. Đây là bước bắt buộc để bắt đầu sử dụng.
              </p>
            </div>

            <div className="space-y-2.5 animate-item-rise" style={{ animationDelay: '80ms' }}>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Mã xác thực 6 chữ số</label>
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '');
                  setCode(val);
                  if (val.length === 6) setError('');
                }}
                onKeyDown={handleKeyDown}
                placeholder="000000"
                className="w-full h-11 bg-[#16141a] border border-white/12 rounded-xl px-4 text-sm text-white outline-none focus:border-[#FF5A1F]/30 focus:bg-white/[0.02] transition-all placeholder:text-slate-500 font-medium text-center tracking-[0.5em] text-lg"
              />
              <p className="text-[10px] text-slate-400 ml-1">Mã có hiệu lực trong 10 phút</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-[11px] font-bold text-red-400 bg-red-400/10 px-4 py-3 rounded-xl animate-item-rise" style={{ animationDelay: '120ms' }}>
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-3 animate-item-rise" style={{ animationDelay: '160ms' }}>
              <Button
                onClick={handleVerify}
                disabled={code.length !== 6 || loading}
                className="w-full h-12 rounded-xl bg-[#FF5A1F] hover:bg-[#FF6A2B] text-white font-bold text-sm tracking-tight shadow-[0_10px_20px_rgba(255,90,31,0.15)] transition-all disabled:opacity-50"
              >
                {loading ? (
                  <><div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin mr-2" />Đang xác thực...</>
                ) : (
                  <><CheckCircle className="mr-2 h-4 w-4" />Xác thực email<ArrowRight className="ml-2 h-4 w-4" /></>
                )}
              </Button>

              <button
                onClick={handleResend}
                disabled={resendLoading || countdown > 0}
                className="w-full flex items-center justify-center gap-2 h-10 text-xs font-bold text-slate-500 hover:text-[#FF5A1F] uppercase tracking-widest transition-all disabled:opacity-50 disabled:hover:text-slate-500"
              >
                <RotateCcw className={`h-3.5 w-3.5 ${resendLoading ? 'animate-spin' : ''}`} />
                {countdown > 0 ? `Gửi lại sau ${countdown}s` : resendLoading ? 'Đang gửi...' : 'Gửi lại mã'}
              </button>
            </div>
          </div>
        </>
      }
    />
  );
}
