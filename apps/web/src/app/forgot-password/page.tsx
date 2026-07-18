'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowRight, AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { laravel } from '@/lib/api/client';
import { showApiError } from '@/lib/api/handle-response';
import { Typewriter } from '@/components/ui/typewriter';
import { t } from '@/lib/i18n';
import { AuthLayout, AuthBrand } from '@/components/auth/auth-layout';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [bgMedia, setBgMedia] = useState<{ url: string; type: 'video' | 'image' } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await laravel.getAuthBg();
        if (res.success && res.data) {
          const url = await laravel.fetchAuthBgBlob(res.data.stream_token);
          setBgMedia({ url, type: res.data.type });
        }
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

  const handleSubmit = async () => {
    if (!email.trim()) return;
    setError('');
    setLoading(true);
    try {
      await laravel.forgotPassword(email);
      router.push(`/reset-password?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      showApiError(err, t('auth.forgotSendFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      bgMedia={bgMedia}
      leftContent={
        <>
          <AuthBrand />
          <div className="relative z-10 max-w-3xl space-y-2 md:space-y-3">
            <h1 className="text-5xl md:text-[72px] font-display-heading font-black tracking-[0.06em] leading-[1.1] text-white">
              <Typewriter text={t('hero.forgotten')} speed={100} delay={300} loop /><br/>
              <Typewriter text={t('hero.password')} speed={80} delay={1500} cursor={false} className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF5A1F] to-[#FF8A5B]" />
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
        </>
      }
      rightContent={
        <>
          <div className="space-y-3 text-center lg:text-left animate-item-rise" style={{ animationDelay: '0ms' }}>
            <h2 className="text-2xl md:text-3xl font-display font-semibold tracking-tight text-white">{t('auth.forgotTitle')}</h2>
            <p className="text-sm text-slate-500 font-medium tracking-tight">{t('auth.forgotDesc')}</p>
          </div>

          <div className="space-y-8">
            <div className="space-y-5 animate-item-rise" style={{ animationDelay: '80ms' }}>
              <div className="space-y-2.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('auth.email')}</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="user@horizon.studio"
                  className="w-full h-11 bg-zinc-950 border border-white/5 rounded-xl px-4 text-sm text-white outline-none focus:border-[#FF5A1F]/30 focus:bg-white/[0.02] transition-all placeholder:text-slate-500 font-medium" />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-[11px] font-bold text-red-400 bg-red-400/10 px-4 py-3 rounded-xl animate-item-rise" style={{ animationDelay: '120ms' }}>
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="block w-full group animate-item-rise" style={{ animationDelay: '160ms' }}>
              <Button
                onClick={handleSubmit}
                disabled={!email.trim() || loading}
                className="w-full h-12 rounded-xl bg-[#FF5A1F] hover:bg-[#FF6A2B] text-white font-bold text-sm tracking-tight shadow-[0_10px_20px_rgba(255,90,31,0.15)] transition-all disabled:opacity-50"
              >
                {loading ? (
                  <><div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin mr-2" />{t('auth.forgotSending')}</>
                ) : (
                  <>{t('auth.forgotSendButton')}<ArrowRight className="ml-2 h-4 w-4" /></>
                )}
              </Button>
            </div>
          </div>

          <p className="text-center text-[11px] font-bold text-slate-600 uppercase tracking-widest animate-item-rise" style={{ animationDelay: '240ms' }}>
            <Link href="/login" className="text-[#FF5A1F] hover:underline inline-flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" /> {t('auth.forgotBackToLogin')}
            </Link>
          </p>
        </>
      }
    />
  );
}
