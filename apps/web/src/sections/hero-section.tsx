"use client";

import React, { useState, useEffect } from "react";
import { GlowButton } from "@/components/landing/ui/glow-button";
import { LensFlare } from "@/components/landing/decor/lens-flare";
import { ChevronDown } from "lucide-react";
import { TypewriterText } from "@/components/landing/typewriter-text";
import { useLandingSettings } from "@/hooks/use-landing-settings";
import { useAuth } from "@/hooks/use-auth";

export function HeroSection({ hideText }: { hideText?: boolean }) {
  const ls = useLandingSettings();
  const { isLoggedIn } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [showCue, setShowCue] = useState(false);

  // Typing effect state
  const [text, setText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setLoaded(true), 100);
    const t2 = setTimeout(() => setShowCue(true), 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Typing effect logic
  useEffect(() => {
    if (!loaded) return;

    const words = ls.hero_typewriter_words.split(",").map(s => s.trim());
    const i = loopNum % words.length;
    const fullText = words[i];

    let timer: NodeJS.Timeout;
    if (isDeleting) {
      timer = setTimeout(() => {
        setText(fullText.substring(0, text.length - 1));
      }, 50); // Deleting speed
    } else {
      timer = setTimeout(() => {
        setText(fullText.substring(0, text.length + 1));
      }, 100); // Typing speed
    }

    if (!isDeleting && text === fullText) {
      timer = setTimeout(() => setIsDeleting(true), 2500); // Pause at end of word
    } else if (isDeleting && text === "") {
      setIsDeleting(false);
      setLoopNum(loopNum + 1);
    }

    return () => clearTimeout(timer);
  }, [text, isDeleting, loaded, loopNum]);

  // Elite GSAP cinematic entry and mouse parallax physics (SSR-Safe)
  useEffect(() => {
    if (!loaded) return;

    import("gsap").then(({ gsap }) => {
      // 1. Listen for the Preloader complete event to trigger the stagger entry
      const handlePreloaderComplete = () => {
        gsap.fromTo(
          ".hero-stagger-text",
          { opacity: 0, y: 35, filter: "blur(10px)" },
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 1.4,
            ease: "power4.out",
            stagger: 0.12,
            delay: 0.1
          }
        );

        // Typewriter effect for hero-typewriter-line
        const twEl = document.querySelector<HTMLElement>(".hero-typewriter-line");
        if (twEl) {
          const text = twEl.textContent || "";
          twEl.textContent = "";
          twEl.style.opacity = "1";
          const chars = text.split("").map((ch) => {
            const span = document.createElement("span");
            if (ch === " ") {
              // Keep a real, breakable space (not a non-breaking one) and leave
              // the span inline so the line can wrap between words on narrow
              // screens instead of overflowing and being clipped.
              span.textContent = " ";
            } else {
              span.textContent = ch;
              span.style.display = "inline-block";
            }
            return span;
          });
          chars.forEach((c) => twEl.appendChild(c));
          gsap.timeline({ repeat: -1, repeatDelay: 0.5 })
            .fromTo(chars, { opacity: 0 }, { opacity: 1, duration: 0.04, stagger: 0.035, ease: "none", delay: 0.5 })
            .to(chars, { opacity: 0, duration: 0.03, stagger: { from: "end", each: 0.025 }, ease: "none" }, "+=2");
        }
      };

      window.addEventListener("preloader-complete", handlePreloaderComplete);

      // Failsafe: if preloader was already completed or skipped
      if (typeof window !== "undefined" && (window as any).__wavisePreloaderDone) {
        handlePreloaderComplete();
      }

      // 2. Parallax mouse tracking
      const hero = document.getElementById("hero-section");
      if (!hero) return;

      const handleMouseMove = (e: MouseEvent) => {
        const { clientX, clientY } = e;
        const rect = hero.getBoundingClientRect();
        const x = clientX - rect.left - rect.width / 2;
        const y = clientY - rect.top - rect.height / 2;

        const dx = x / (rect.width / 2);
        const dy = y / (rect.height / 2);

        // 3D Tilt the decorative orb with exact perspective
        gsap.to(".hero-orb-wrap", {
          rotateX: -dy * 20,
          rotateY: dx * 20,
          x: dx * 20,
          y: dy * 20,
          duration: 0.8,
          ease: "power3.out"
        });

        // Drift the background layout slightly in opposite direction for depth
        gsap.to(".hero-bg-parallax", {
          x: -dx * 25,
          y: -dy * 25,
          duration: 1.5,
          ease: "power2.out"
        });
      };

      const handleMouseLeave = () => {
        // Elastic organic return
        gsap.to(".hero-orb-wrap", {
          rotateX: 0,
          rotateY: 0,
          x: 0,
          y: 0,
          duration: 1.5,
          ease: "elastic.out(1, 0.75)"
        });
        gsap.to(".hero-bg-parallax", {
          x: 0,
          y: 0,
          duration: 1.5,
          ease: "power3.out"
        });
      };

      hero.addEventListener("mousemove", handleMouseMove);
      hero.addEventListener("mouseleave", handleMouseLeave);

      return () => {
        window.removeEventListener("preloader-complete", handlePreloaderComplete);
        hero.removeEventListener("mousemove", handleMouseMove);
        hero.removeEventListener("mouseleave", handleMouseLeave);
      };
    });
  }, [loaded]);

  const scrollToReel = () => {
    document.getElementById("reel")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="hero-section"
      className="relative min-h-[80dvh] lg:min-h-screen w-full flex flex-col justify-center lg:justify-end pb-12 pt-24 md:pb-24 md:pt-24 lg:pb-20 overflow-hidden"
    >
      {/* Background Image with Ken Burns and GSAP Parallax */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <img
          src="/images/landing/abstract-gradient.webp"
          alt=""
          className={`hero-bg-parallax absolute inset-[-30px] w-[calc(100%+60px)] h-[calc(100%+60px)] object-cover transition-transform duration-[20s] ease-linear ${loaded ? "scale-105" : "scale-100"}`}
        />
        {/* Overlays */}
        <div className="absolute inset-0 bg-zinc-950/70" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
        <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 50% 50%, transparent 0%, rgba(0,0,0,0.8) 100%)" }} />
      </div>

      {/* Lens Flares */}
      <LensFlare className="top-[10%] right-[15%]" />
      <LensFlare className="bottom-[20%] left-[10%]" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-[1440px] mx-auto px-6 md:px-12 lg:px-20">
        <div className="w-full">
          {/* Label */}
          <div className="hero-stagger-text mb-8 opacity-0">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 font-[family-name:var(--font-mono)] text-xs font-medium text-slate-300 uppercase tracking-widest backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff5a1f]" style={{ boxShadow: "0 0 10px #ff5a1f" }}></span>
              <TypewriterText text={ls.hero_label} speed={60} delay={800} cursor={false} />
            </span>
          </div>

          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            {/* Left Content */}
            <div className="flex-1">
              {/* Title — rendered as a div when the SEO shell already provides
                  the canonical <h1> (hideText), to avoid a duplicate H1. */}
              <div className="mb-6 max-w-4xl flex flex-col gap-3">
                {hideText ? (
                  <div className="font-[family-name:var(--font-display)] font-black text-white tracking-[-0.04em] text-[28px] sm:text-[44px] md:text-[60px] lg:text-[80px] leading-tight">
                    <span className="hero-stagger-text block whitespace-nowrap opacity-0 drop-shadow-md">
                      <span>WAVISE&nbsp;</span><span className="bg-gradient-to-br from-[#FF5A1F] via-[#FF7A3D] to-[#FFB088] bg-clip-text text-transparent">STUDIO</span>
                    </span>
                  </div>
                ) : (
                  <h1 className="font-[family-name:var(--font-display)] font-black text-white tracking-[-0.04em] text-[28px] sm:text-[44px] md:text-[60px] lg:text-[80px] leading-tight">
                    <span className="hero-stagger-text block whitespace-nowrap opacity-0 drop-shadow-md">
                      <span>WAVISE&nbsp;</span><span className="bg-gradient-to-br from-[#FF5A1F] via-[#FF7A3D] to-[#FFB088] bg-clip-text text-transparent">STUDIO</span>
                    </span>
                  </h1>
                )}
                <span className="hero-typewriter-line block text-gradient-ember opacity-0 drop-shadow-md text-[0.85em] sm:text-[0.9em] tracking-[-0.02em] font-semibold text-balance lg:whitespace-nowrap">
                  {ls.hero_title_line2}
                </span>
                <p className="hero-stagger-text text-base md:text-2xl text-slate-300 max-w-2xl leading-[1.6] opacity-0 font-light">
                  {ls.hero_subtitle}
                </p>
              </div>

              {/* CTA */}
              <div className="hero-stagger-text opacity-0 flex flex-wrap items-center gap-4">
                <GlowButton href={isLoggedIn ? "/studio" : "/login"} size="xl" glow>
                  {ls.hero_cta_text}
                </GlowButton>
              </div>
            </div>

            {/* Right Decorative Element (GSAP Perspective Tilt) */}
            <div className={`hidden lg:flex flex-1 justify-center transition-all duration-1000 delay-1000 ${loaded ? "opacity-100 scale-100 blur-0" : "opacity-0 scale-95 blur-md"}`}>
              <div className="hero-orb-wrap relative w-full max-w-md aspect-square rounded-full border border-white/10 flex items-center justify-center animate-[spin-slow_40s_linear_infinite] [transform-style:preserve-3d]">
                <div className="absolute inset-0 rounded-full border-t border-[#ff5a1f]/30"></div>
                <div className="w-[80%] h-[80%] rounded-full border border-white/5 flex items-center justify-center animate-[spin-slow_30s_linear_infinite_reverse]">
                  <div className="absolute inset-0 rounded-full border-b border-[#ff5a1f]/40"></div>
                  <div className="w-[60%] h-[60%] rounded-full bg-gradient-to-br from-black/80 to-black/20 backdrop-blur-md border border-white/10 flex items-center justify-center shadow-[0_0_50px_rgba(255,90,31,0.15)] overflow-hidden">
                    {/* Inner core */}
                    <div className="w-1/2 h-1/2 rounded-full bg-[#ff5a1f]/20 blur-2xl animate-pulse"></div>
                    <div className="absolute inset-0 bg-[url(/images/landing/abstract-gradient.webp)] bg-cover opacity-20 mix-blend-overlay"></div>
                  </div>
                </div>
                {/* Floating particles */}
                <div className="absolute top-1/4 left-0 w-2 h-2 rounded-full bg-[#ff5a1f] shadow-[0_0_10px_#ff5a1f] animate-pulse"></div>
                <div className="absolute bottom-1/4 right-0 w-1.5 h-1.5 rounded-full bg-[#00D5FF] shadow-[0_0_10px_#00D5FF] animate-pulse delay-300"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Film strip thumbnails at bottom */}
      <div className={`absolute bottom-8 right-6 md:right-12 lg:right-20 z-10 hidden lg:flex gap-2 transition-all duration-1000 delay-[1400ms] ${loaded ? "opacity-100" : "opacity-0"}`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="w-16 h-10 rounded overflow-hidden border border-white/10 opacity-40 hover:opacity-100 transition-opacity">
            <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900" />
          </div>
        ))}
      </div>

      {/* Scroll cue */}
      {showCue && (
        <button
          onClick={scrollToReel}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 text-slate-500 hover:text-[#FF8A5B] transition-colors animate-bounce-subtle"
          aria-label="Cuộn xuống"
        >
          <ChevronDown className="w-6 h-6" />
        </button>
      )}
    </section>
  );
}
