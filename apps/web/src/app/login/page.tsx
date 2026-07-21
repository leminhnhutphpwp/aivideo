'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { laravel } from '@/lib/api/client';
import { showApiError, showApiResponse } from '@/lib/api/handle-response';
import { useAuthStore } from '@/stores/auth-store';
import { useToastStore } from '@/stores/toast-store';
import { Typewriter } from '@/components/ui/typewriter';
import { t } from '@/lib/i18n';
import { PasswordInput } from '@/components/ui/password-input';
import { AuthLayout, AuthBrand, AuthStats } from '@/components/auth/auth-layout';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore(s => s.setAuth);
  const token = useAuthStore(s => s.token);
  const loading = useAuthStore(s => s.loading);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [bgMedia, setBgMedia] = useState<{ url: string; type: 'video' | 'image' } | null>(null);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const addToast = useToastStore(s => s.addToast);

  useEffect(() => {
    if (token && !loading) router.replace('/dashboard');
  }, [token, loading, router]);

  useEffect(() => {
    (async () => {
      try {
        const res = await laravel.getAuthBg();
        if (res.success && res.data) {
          const url = await laravel.fetchAuthBgBlob(res.data.stream_token);
          setBgMedia({ url, type: res.data.type });
        }
      } catch {}
      try {
        await laravel.getGoogleRedirectUrl();
        setGoogleEnabled(true);
      } catch {}
    })();
  }, []);

  const petRef = useRef<HTMLDivElement>(null);
  const petDrag = useRef({ active: false, startX: 0, offsetX: 0, currentX: 0, velocity: 0, lastX: 0, lastTime: 0 });
  const petState = useRef({ paused: false, timeoutId: undefined as any });

  useEffect(() => {
    const el = petRef.current;
    if (!el) return;
    const sprite = el.querySelector('.login-pet-sprite') as HTMLElement;
    if (!sprite) return;

    const petAnim = petState.current;

    const setPetStill = () => {
      sprite.style.animationPlayState = 'paused';
      sprite.style.backgroundPosition = '0 0';
    };

    const playPetAnim = (name: string, row: number, duration: number) => {
      sprite.style.animationName = name;
      sprite.style.backgroundPosition = `0 ${-row * 208}px`;
      sprite.style.animationPlayState = 'running';
      sprite.style.animationDuration = `${duration}ms`;
      sprite.style.animationIterationCount = '1';
    };

    const scheduleNext = () => {
      const delay = 3000 + Math.random() * 5000;
      petAnim.timeoutId = setTimeout(() => {
        if (petDrag.current.active) { scheduleNext(); return; }
        const actions: { name: string; row: number; dur: number }[] = [
          { name: 'pet-idle', row: 0, dur: 1200 },
          { name: 'pet-wave', row: 1, dur: 1200 },
          { name: 'pet-idle', row: 0, dur: 2400 },
          { name: 'pet-blink', row: 3, dur: 600 },
        ];
        const action = actions[Math.floor(Math.random() * actions.length)];
        playPetAnim(action.name, action.row, action.dur);
        petAnim.timeoutId = setTimeout(() => {
          setPetStill();
          scheduleNext();
        }, action.dur);
      }, delay);
    };

    setPetStill();
    scheduleNext();

    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      petDrag.current.active = true;
      petDrag.current.startX = e.clientX;
      petDrag.current.offsetX = petDrag.current.currentX;
      petDrag.current.velocity = 0;
      petDrag.current.lastX = e.clientX;
      petDrag.current.lastTime = performance.now();
      clearTimeout(petAnim.timeoutId);
      sprite.style.animationIterationCount = 'infinite';
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!petDrag.current.active) return;
      const dx = e.clientX - petDrag.current.startX;
      const now = performance.now();
      const dt = now - petDrag.current.lastTime;
      if (dt > 0) {
        petDrag.current.velocity = (e.clientX - petDrag.current.lastX) / dt;
      }
      petDrag.current.lastX = e.clientX;
      petDrag.current.lastTime = now;
      const maxX = 200;
      const raw = petDrag.current.offsetX + dx;
      const clamped = Math.max(-maxX, Math.min(maxX, raw));
      petDrag.current.currentX = clamped;
      el.style.transform = `translateX(${clamped}px)`;
      el.style.transition = 'none';
      sprite.style.animationName = `pet-${clamped >= 0 ? 'walk-right' : 'walk-left'}`;
      sprite.style.backgroundPosition = '0 -416px';
      sprite.style.animationPlayState = 'running';
      sprite.style.animationDuration = '800ms';
      sprite.style.transform = clamped < 0 ? 'scaleX(-1)' : 'scaleX(1)';
    };

    const onPointerUp = () => {
      if (!petDrag.current.active) return;
      petDrag.current.active = false;
      const v = petDrag.current.velocity;
      const flingX = petDrag.current.currentX + v * 200;
      const bounceX = flingX * 0.15;
      el.style.transition = 'transform 0.6s cubic-bezier(.34, 1.56, .64, 1)';
      el.style.transform = `translateX(${bounceX}px)`;
      petDrag.current.currentX = bounceX;
      setTimeout(() => {
        el.style.transition = 'transform 0.8s cubic-bezier(.16, 1, .3, 1)';
        el.style.transform = 'translateX(0)';
        petDrag.current.currentX = 0;
        sprite.style.transform = 'scaleX(1)';
        setPetStill();
        scheduleNext();
      }, 600);
    };

    const onPointerEnter = () => {
      if (petDrag.current.active) return;
      clearTimeout(petAnim.timeoutId);
      sprite.style.animationIterationCount = '1';
      playPetAnim('pet-wave', 1, 1200);
      petAnim.timeoutId = setTimeout(() => {
        if (!petDrag.current.active) {
          setPetStill();
          scheduleNext();
        }
      }, 1200);
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);
    el.addEventListener('pointerenter', onPointerEnter);

    return () => {
      clearTimeout(petAnim.timeoutId);
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerUp);
      el.removeEventListener('pointerenter', onPointerEnter);
    };
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password) return;
    setError('');
    setLoginLoading(true);
    try {
      const data = await laravel.login(email, password, remember);
      setAuth(data.token, data.user);
      showApiResponse({ success: true, message: t('auth.loginSuccess') });
      router.push('/dashboard');
    } catch (err: any) {
      setError(err?.message || t('auth.loginFailed'));
      showApiError(err, t('auth.loginFailed'));
    } finally {
      setLoginLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoginLoading(true);
    try {
      const url = await laravel.getGoogleRedirectUrl();
      window.location.href = url;
    } catch (err: any) {
      showApiError(err, 'Không thể kết nối Google');
      setLoginLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <AuthLayout
      bgMedia={bgMedia}
      leftContent={
        <>
          <AuthBrand />
          <div className="relative z-10 max-w-3xl space-y-2 md:space-y-3">
            <h1 className="text-5xl md:text-[72px] font-display-heading font-black tracking-[0.06em] leading-[1.1] text-white">
              <Typewriter text={t('hero.produce')} speed={100} delay={300} loop /><br/>
              <Typewriter text={t('hero.future')} speed={80} delay={1500} cursor={false} className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF5A1F] to-[#FF8A5B]" />
            </h1>
            <div ref={petRef} className="login-pet-wrapper relative inline-block cursor-grab active:cursor-grabbing select-none touch-none">
              <div
                className="login-pet-sprite"
                style={{ backgroundImage: `url(https://codex-pets.net/assets/pets/v/1778205722814/striving-engineer-02/spritesheet.webp)` }}
              />
              <div className="login-pet-glow" />
            </div>
            <p className="text-sm md:text-base text-slate-400 font-medium leading-relaxed max-w-2xl">
              {t('metadata.description')}
            </p>
          </div>
          <AuthStats usersLabel={t('hero.users')} framesLabel={t('hero.frames')} />
        </>
      }
      rightContent={
        <>
          <div className="space-y-3 text-center lg:text-left animate-item-rise" style={{ animationDelay: '0ms' }}>
            <h2 className="text-2xl md:text-3xl font-display font-semibold tracking-tight text-white">{t('auth.loginTitle')}</h2>
            <p className="text-sm text-slate-500 font-medium tracking-tight">{t('auth.loginDesc')}</p>
          </div>

          <div className="space-y-8">
            <div className="space-y-5 animate-item-rise" style={{ animationDelay: '80ms' }}>
              <div className="space-y-2.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('auth.email')}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('auth.emailPlaceholder')}
                  className="w-full h-11 bg-[#16141a] border border-white/12 rounded-xl px-4 text-sm text-white outline-none focus:border-[#FF5A1F]/30 focus:bg-white/[0.02] transition-all placeholder:text-slate-500 font-medium"
                />
              </div>
              <div className="space-y-2.5">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{t('auth.password')}</label>
                  <Link href="/forgot-password" tabIndex={-1} className="text-[11px] font-bold text-[#FF5A1F] uppercase tracking-widest hover:brightness-125 transition-all">{t('auth.forgotPassword')}</Link>
                </div>
                <PasswordInput value={password} onChange={setPassword} onKeyDown={handleKeyDown} />
              </div>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer group animate-item-rise" style={{ animationDelay: '160ms' }}>
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="h-4 w-4 rounded-md border border-white/10 bg-white/5 text-[#FF5A1F] focus:ring-[#FF5A1F]/30 focus:ring-offset-0 accent-[#FF5A1F]" />
              <span className="text-[11px] font-bold text-slate-500 group-hover:text-slate-300 transition-colors uppercase tracking-widest">Remember me</span>
            </label>

            {error && (
              <div className="flex items-center gap-2 text-[11px] font-bold text-red-400 bg-red-400/10 px-4 py-3 rounded-xl animate-item-rise" style={{ animationDelay: '200ms' }}>
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="block w-full group animate-item-rise" style={{ animationDelay: '240ms' }}>
              <Button
                onClick={handleLogin}
                disabled={!email.trim() || !password || loginLoading}
                className="w-full h-12 rounded-xl bg-[#FF5A1F] hover:bg-[#FF6A2B] text-white font-bold text-sm tracking-tight shadow-[0_10px_20px_rgba(255,90,31,0.15)] transition-all disabled:opacity-50"
              >
                {loginLoading ? (
                  <><div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin mr-2" />{t('auth.loggingIn')}</>
                ) : (
                  <>{t('auth.loginButton')}<ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" /></>
                )}
              </Button>
            </div>

            {googleEnabled && (
              <>
                <div className="relative py-2 animate-item-rise" style={{ animationDelay: '320ms' }}>
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/12"></div></div>
                  <div className="relative flex justify-center text-[10px] uppercase tracking-[0.2em]"><span className="bg-transparent px-4 font-bold text-slate-400">{t('auth.quickLogin')}</span></div>
                </div>

                <div className="w-full animate-item-rise" style={{ animationDelay: '400ms' }}>
                  <Button variant="outline" onClick={handleGoogleLogin} disabled={loginLoading} className="w-full h-11 rounded-xl border-white/12 bg-[#16141a] text-slate-400 hover:text-white hover:bg-white/5 transition-all text-xs font-bold uppercase tracking-widest">
                    <svg className="mr-3 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Google
                  </Button>
                </div>
              </>
            )}
          </div>

          <p className="text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest animate-item-rise" style={{ animationDelay: '480ms' }}>
            {t('auth.newUser')} <Link href="/register" className="text-[#FF5A1F] hover:underline">{t('auth.createAccount')}</Link>
          </p>
        </>
      }
    />
  );
}
