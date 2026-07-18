'use client';

import { useEffect, useRef, useCallback, ReactNode } from 'react';

interface BgMedia {
  url: string;
  type: 'video' | 'image';
}

interface AuthLayoutProps {
  leftContent: ReactNode;
  rightContent: ReactNode;
  bgMedia?: BgMedia | null;
}

export function AuthLayout({ leftContent, rightContent, bgMedia }: AuthLayoutProps) {
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const mousePos = useRef({ x: 0, y: 0 });
  const rafId = useRef<number>(0);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    mousePos.current = { x: e.clientX, y: e.clientY };
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    const animate = () => {
      const { x, y } = mousePos.current;
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = (x - cx) / cx;
      const dy = (y - cy) / cy;

      if (leftRef.current) {
        const orbs = leftRef.current.querySelectorAll<HTMLElement>('.login-bg-orb');
        orbs.forEach((orb, i) => {
          const factor = (i + 1) * 15;
          orb.style.transform = `translate(${dx * factor}px, ${dy * factor}px)`;
        });
        const spotlight = leftRef.current.querySelector<HTMLElement>('.login-spotlight');
        if (spotlight) {
          const rect = leftRef.current.getBoundingClientRect();
          const lx = x - rect.left;
          const ly = y - rect.top;
          spotlight.style.background = `radial-gradient(600px circle at ${lx}px ${ly}px, rgba(255,90,31,0.07), transparent 60%)`;
        }
      }

      if (rightRef.current) {
        const spotlight = rightRef.current.querySelector<HTMLElement>('.login-spotlight');
        if (spotlight) {
          const rect = rightRef.current.getBoundingClientRect();
          const rx = x - rect.left;
          const ry = y - rect.top;
          spotlight.style.background = `radial-gradient(500px circle at ${rx}px ${ry}px, rgba(255,90,31,0.05), transparent 60%)`;
        }

        const card = rightRef.current.querySelector<HTMLElement>('.login-magnetic-card');
        if (card) {
          const rect = card.getBoundingClientRect();
          const mx = x - rect.left;
          const my = y - rect.top;
          const pctX = mx / rect.width;
          const pctY = my / rect.height;
          if (pctX >= 0 && pctX <= 1 && pctY >= 0 && pctY <= 1) {
            card.style.setProperty('--magnetic-x', `${pctX * 100}%`);
            card.style.setProperty('--magnetic-y', `${pctY * 100}%`);
            card.style.setProperty('--magnetic-pull-x', `${(pctX - 0.5) * 10}px`);
            card.style.setProperty('--magnetic-pull-y', `${(pctY - 0.5) * 8}px`);
          }
        }
      }

      rafId.current = requestAnimationFrame(animate);
    };
    rafId.current = requestAnimationFrame(animate);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rafId.current);
    };
  }, [handleMouseMove]);

  return (
    <div className="min-h-screen bg-[#000000] text-white flex flex-col lg:flex-row font-sans">
      {/* Brand section - hidden on mobile, shown on desktop */}
      <div ref={leftRef} className="hidden lg:flex lg:order-1 lg:w-[45%] relative p-6 flex-col justify-between overflow-hidden isolate min-h-screen gap-6">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div className="login-bg-orb login-bg-orb-1" />
          <div className="login-bg-orb login-bg-orb-2" />
          <div className="login-bg-orb login-bg-orb-3" />
          <div className="login-spotlight absolute inset-0 z-[1] transition-none" />
          <div className="login-bg-grain" />
          <div className="absolute inset-0 bg-gradient-to-tr from-[#000000]/60 via-[#000000]/30 to-transparent" />
          <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-[#000000] to-transparent z-[2]" />
        </div>
        {leftContent}
      </div>

      {/* Form section - on mobile this shows FIRST (at top) */}
      <div ref={rightRef} className="order-1 lg:order-2 lg:w-[55%] flex items-center justify-center px-6 py-8 md:px-16 md:py-12 relative z-10 overflow-y-auto">
        {/* Mobile background effects */}
        <div className="absolute inset-0 z-0 overflow-hidden lg:hidden">
          <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-[#FF5A1F]/10 blur-[120px]" />
          <div className="absolute bottom-0 -right-20 w-[400px] h-[400px] rounded-full bg-[#FF5A1F]/8 blur-[100px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A0505] via-[#000000] to-[#000000]" />
        </div>
        {/* Desktop background blend */}
        <div className="absolute inset-0 z-0 overflow-hidden hidden lg:block">
          {bgMedia ? (
            bgMedia.type === 'video' ? (
              <video autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover opacity-30">
                <source src={bgMedia.url} />
              </video>
            ) : (
              <img src={bgMedia.url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
            )
          ) : (
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#000000_0%,#0A0A0A_10%,#000000_100%)]" />
          )}
        </div>
        {/* Desktop spotlight */}
        <div className="login-spotlight absolute inset-0 z-[1] transition-none hidden lg:block" />
        <div
          className="login-magnetic-card w-full max-w-md rounded-2xl border border-white/5 bg-[#050505]/40 backdrop-blur-sm p-5 md:p-6 relative"
          onPointerLeave={(e) => {
            const card = e.currentTarget;
            card.style.setProperty('--magnetic-x', '50%');
            card.style.setProperty('--magnetic-y', '38%');
            card.style.setProperty('--magnetic-pull-x', '0px');
            card.style.setProperty('--magnetic-pull-y', '0px');
          }}
        >
          <div className="lg:hidden flex justify-center mb-6 pt-1">
            <AuthBrand />
          </div>
          <div className="login-magnetic-content space-y-8 md:space-y-10 relative z-10">
            {rightContent}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthBrand() {
  return (
    <div className="relative z-10">
      <div className="flex items-center gap-3 md:gap-4 group">
        <img src="/logo-background-white.png" alt="Wavise Studio" className="h-14 md:h-16 w-auto" />
      </div>
    </div>
  );
}

export function AuthStats({ usersLabel, framesLabel }: { usersLabel: string; framesLabel: string }) {
  return (
    <div className="relative z-10 flex gap-6 md:gap-12 pt-2">
      <div className="space-y-1">
        <p className="text-2xl md:text-3xl font-semibold">14.2k</p>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{usersLabel}</p>
      </div>
      <div className="space-y-1">
        <p className="text-2xl md:text-3xl font-semibold">2,4M</p>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{framesLabel}</p>
      </div>
    </div>
  );
}
