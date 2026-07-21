'use client';

import { useState, useEffect, Suspense } from 'react';
import { ArrowRight, Key, AlertCircle, ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { laravel } from '@/lib/api/client';
import { showApiError, showApiResponse } from '@/lib/api/handle-response';
import { Typewriter } from '@/components/ui/typewriter';
import { t } from '@/lib/i18n';
import { AuthLayout, AuthBrand } from '@/components/auth/auth-layout';
import { PasswordInput } from '@/components/ui/password-input';

export default function ResetPasswordPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#16141a]" />}>
      <ResetPasswordPage />
    </Suspense>
  );
}

function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromUrl = searchParams.get('email') || '';
  const [email, setEmail] = useState(emailFromUrl);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [step, setStep] = useState<'code' | 'reset'>('code');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (emailFromUrl) setEmail(emailFromUrl);
  }, [emailFromUrl]);

  const handleVerifyCode = async () => {
    if (!email.trim() || !code.trim()) return;
    setError('');
    setLoading(true);
    try {
      await laravel.verifyResetCode(email, code);
      setStep('reset');
    } catch (err: any) {
      showApiError(err, t('auth.resetCodeInvalid'));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!password || password.length < 8) return;
    if (password !== passwordConfirmation) return;
    setLoading(true);
    try {
      await laravel.resetPassword(email, code, password, passwordConfirmation);
      showApiResponse({ success: true, message: t('auth.resetSuccess') });
      router.push('/');
    } catch (err: any) {
      showApiError(err, t('auth.resetFailed'));
    } finally {
      setLoading(false);
    }
  };

  const heroLine1 = step === 'code' ? t('hero.enter') : t('hero.reset');
  const heroLine2 = step === 'code' ? t('hero.confirmationCode') : t('hero.newPassword');
  const descText = step === 'code' ? t('auth.resetDesc') : t('auth.resetPasswordDesc');

  if (step === 'code') {
    return (
      <AuthLayout
        leftContent={
          <>
            <AuthBrand />
            <div className="relative z-10 max-w-lg space-y-2 md:space-y-3">
              <h1 className="text-5xl md:text-[72px] font-display-heading font-black tracking-[0.06em] leading-[1.1] text-white">
                <Typewriter text={heroLine1} speed={100} delay={300} /><br/>
                <Typewriter text={heroLine2} speed={80} delay={1500} cursor={false}
                  className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF5A1F] to-[#FF8A5B]" />
              </h1>
              <p className="text-sm md:text-base text-slate-400 font-medium leading-relaxed max-w-sm">{descText}</p>
            </div>
          </>
        }
        rightContent={
          <>
            <div className="space-y-3 text-center lg:text-left animate-item-rise" style={{ animationDelay: '0ms' }}>
              <h2 className="text-2xl md:text-3xl font-display font-semibold tracking-tight text-white">{t('auth.resetTitle')}</h2>
              <p className="text-sm text-slate-500 font-medium tracking-tight">{t('auth.resetDesc')}</p>
            </div>
            <div className="space-y-8">
              <div className="space-y-5 animate-item-rise" style={{ animationDelay: '80ms' }}>
                <div className="space-y-2.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('auth.email')}</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full h-11 bg-[#16141a] border border-white/12 rounded-xl px-4 text-sm text-white outline-none focus:border-[#FF5A1F]/30 focus:bg-white/[0.02] transition-all placeholder:text-slate-500 font-medium" />
                </div>
                <div className="space-y-2.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('auth.resetCode')}</label>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input type="text" value={code} onChange={e => setCode(e.target.value)}
                      placeholder="000000"
                      className="w-full h-11 bg-[#16141a] border border-white/12 rounded-xl pl-11 pr-4 text-sm text-white outline-none focus:border-[#FF5A1F]/30 focus:bg-white/[0.02] transition-all placeholder:text-slate-500 font-medium tracking-widest text-center text-lg" />
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-[11px] font-bold text-red-400 bg-red-400/10 px-4 py-3 rounded-xl animate-item-rise" style={{ animationDelay: '120ms' }}>
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="block w-full animate-item-rise" style={{ animationDelay: '160ms' }}>
                <Button onClick={handleVerifyCode}
                  disabled={!email.trim() || !code.trim() || loading}
                  className="w-full h-12 rounded-xl bg-[#FF5A1F] hover:bg-[#FF6A2B] text-white font-bold text-sm tracking-tight shadow-[0_10px_20px_rgba(255,90,31,0.15)] transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <><div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin mr-2" />{t('auth.resetVerifying')}</>
                  ) : (
                    <>{t('auth.resetVerifyButton')} <ArrowRight className="ml-2 h-4 w-4" /></>
                  )}
                </Button>
              </div>
            </div>
            <p className="text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest animate-item-rise" style={{ animationDelay: '240ms' }}>
              <Link href="/forgot-password" className="text-[#FF5A1F] hover:underline inline-flex items-center gap-1">
                <ArrowLeft className="h-3 w-3" /> {t('auth.resetBack')}
              </Link>
            </p>
          </>
        }
      />
    );
  }

  return (
    <AuthLayout
      leftContent={
        <>
          <AuthBrand />
          <div className="relative z-10 max-w-lg space-y-2 md:space-y-3">
            <h1 className="text-5xl md:text-[72px] font-display-heading font-black tracking-[0.06em] leading-[1.1] text-white">
              <Typewriter text={heroLine1} speed={100} delay={300} /><br/>
              <Typewriter text={heroLine2} speed={80} delay={1500} cursor={false}
                className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF5A1F] to-[#FF8A5B]" />
            </h1>
            <p className="text-sm md:text-base text-slate-400 font-medium leading-relaxed max-w-sm">{descText}</p>
          </div>
        </>
      }
      rightContent={
        <>
          <div className="space-y-3 text-center lg:text-left animate-item-rise" style={{ animationDelay: '0ms' }}>
            <h2 className="text-2xl md:text-3xl font-display font-semibold tracking-tight text-white">{t('auth.resetPasswordTitle')}</h2>
            <p className="text-sm text-slate-500 font-medium tracking-tight">{t('auth.resetPasswordDesc')}</p>
          </div>
          <div className="space-y-8">
            <div className="space-y-5 animate-item-rise" style={{ animationDelay: '80ms' }}>
              <div className="space-y-2.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('auth.resetNewPassword')}</label>
                <PasswordInput value={password} onChange={setPassword} />
              </div>
              <div className="space-y-2.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('auth.resetConfirmPassword')}</label>
                <PasswordInput value={passwordConfirmation} onChange={setPasswordConfirmation} />
              </div>
            </div>
            <div className="block w-full animate-item-rise" style={{ animationDelay: '160ms' }}>
              <Button onClick={handleResetPassword}
                disabled={!password || password.length < 8 || password !== passwordConfirmation || loading}
                className="w-full h-12 rounded-xl bg-[#FF5A1F] hover:bg-[#FF6A2B] text-white font-bold text-sm tracking-tight shadow-[0_10px_20px_rgba(255,90,31,0.15)] transition-all disabled:opacity-50"
              >
                {loading ? (
                  <><div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin mr-2" />{t('auth.resetResetting')}</>
                ) : (
                  <><Check className="mr-2 h-4 w-4" />{t('auth.resetButton')} <ArrowRight className="ml-2 h-4 w-4" /></>
                )}
              </Button>
            </div>
          </div>
          <p className="text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest animate-item-rise" style={{ animationDelay: '240ms' }}>
            <Link href="/forgot-password" className="text-[#FF5A1F] hover:underline inline-flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" /> {t('auth.resetBack')}
            </Link>
          </p>
        </>
      }
    />
  );
}
