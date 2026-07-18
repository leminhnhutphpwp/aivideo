"use client";

import React, { useState, useEffect, useRef } from "react";

export function Preloader() {
  const [progress, setProgress] = useState(0);
  const [complete, setComplete] = useState(false);
  const [active, setActive] = useState(true);
  const [isSubsequent, setIsSubsequent] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Check if user has already visited in this session
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hasVisited = sessionStorage.getItem("wavise-visited");
      if (hasVisited) {
        setIsSubsequent(true);
      }
    }
  }, []);

  // Progressive loading simulation
  useEffect(() => {
    if (typeof window !== "undefined") {
      document.body.style.overflow = "hidden";
    }

    const duration = isSubsequent ? 1000 : 2200; // Snap loading for returning visits
    const intervalTime = 30;
    const steps = duration / intervalTime;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const nextProgress = Math.min(Math.round((currentStep / steps) * 100), 100);
      setProgress(nextProgress);

      if (nextProgress === 100) {
        clearInterval(timer);
        setComplete(true);
      }
    }, intervalTime);

    return () => {
      clearInterval(timer);
    };
  }, [isSubsequent]);

  const handleEnter = () => {
    import("gsap").then(({ gsap }) => {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("wavise-visited", "true");
        (window as any).__wavisePreloaderDone = true;
      }

      // 1. Smoothly fade out current loading UI content
      gsap.to(contentRef.current, {
        opacity: 0,
        y: -40,
        scale: 0.95,
        duration: 0.6,
        ease: "power3.inOut",
        onComplete: () => {
          // 2. Cinematic radial mask contraction / reveal slide
          gsap.to(containerRef.current, {
            clipPath: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)",
            duration: 1.2,
            ease: "power4.inOut",
            onComplete: () => {
              setActive(false);
              document.body.style.overflow = "";
              
              // 3. Dispatch global custom event to trigger Hero stagger entry
              window.dispatchEvent(new CustomEvent("preloader-complete"));
            }
          });
        }
      });
    });
  };

  // Automatically launch if it's a subsequent visit
  useEffect(() => {
    if (complete && isSubsequent) {
      handleEnter();
    }
  }, [complete, isSubsequent]);

  if (!active) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#050508] select-none"
      style={{
        clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
      }}
    >
      {/* Background cinematic overlays */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,90,31,0.06),transparent_60%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:40px_40px] opacity-15 pointer-events-none" />

      {/* Main loading content container */}
      <div ref={contentRef} className="relative z-10 flex flex-col items-center text-center max-w-lg px-6">
        {/* Animated branding logo — decorative splash, not the page <h1> */}
        <div aria-hidden="true" className="font-[family-name:var(--font-display)] font-black text-4xl sm:text-5xl tracking-[0.22em] text-white uppercase mb-2">
          WAVISE<span className="text-gradient-ember font-light">&nbsp;STUDIO</span>
        </div>
        <p className="font-[family-name:var(--font-mono)] text-[9px] tracking-[0.45em] text-slate-500 uppercase mb-20">
          Nền Tảng Tạo Video AI
        </p>

        {/* Dynamic progress / CTA zone */}
        {!complete ? (
          <div className="w-64 flex flex-col items-center">
            {/* Progress percentage */}
            <div className="w-full text-center font-mono text-sm text-[#FF5A1F] font-bold mb-2.5 tracking-widest">
              {progress}%
            </div>
            
            {/* Minimalist progress bar */}
            <div className="w-full h-[2px] bg-white/5 rounded-full overflow-hidden border border-white/10 relative">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-[#FF5A1F] transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          /* Glassmorphic premium interactive action button */
          <button
            onClick={handleEnter}
            className="group relative px-9 py-4 rounded-full bg-white/5 hover:bg-[#FF5A1F]/10 border border-white/10 hover:border-[#FF5A1F]/40 text-xs font-bold text-white tracking-[0.25em] uppercase transition-all duration-500 shadow-[0_0_30px_rgba(255,255,255,0.02)] hover:shadow-[0_0_40px_rgba(255,90,31,0.15)] overflow-hidden cursor-pointer active:scale-95"
          >
            {/* Glow sweep effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-out pointer-events-none" />
            VÀO STUDIO
          </button>
        )}
      </div>


    </div>
  );
}
