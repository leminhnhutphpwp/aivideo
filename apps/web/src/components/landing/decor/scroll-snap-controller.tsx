"use client";

import React, { useEffect, useState, useRef } from "react";

const SECTIONS = [
  { id: "hero-section", label: "HOME" },
  { id: "reel", label: "SHOWCASE" },
  { id: "intro", label: "INTRO" },
  { id: "genesis", label: "GENESIS" },
  { id: "forge", label: "FORGE" },
  { id: "workflow", label: "WORKFLOW" },
  { id: "director", label: "DIRECTOR" },
  { id: "gallery", label: "PORTFOLIO" },
  { id: "ecosystem", label: "ECOSYSTEM" },
  { id: "stats", label: "METRICS" },
  { id: "portal", label: "STUDIO" }
];

// Document-absolute top of an element. `offsetTop` is relative to the nearest
// positioned ancestor, and the shell-wrapped sections (hero/reel/intro) live
// inside a `relative` wrapper — so their offsetTop reported ~0, which made the
// snap land on the wrong section. getBoundingClientRect()+scrollY is correct
// regardless of the offsetParent.
const docTop = (el: HTMLElement) => Math.round(el.getBoundingClientRect().top + window.scrollY);

export function ScrollSnapController() {
  const [activeSection, setActiveSection] = useState(0);
  const [enabled, setEnabled] = useState(false);
  const animatingRef = useRef(false);

  // Enable only on desktop (lg breakpoint, no touch screen, and motion allowed).
  // On touch / small screens we deliberately fall back to native scrolling so
  // mobile stays smooth. Respect prefers-reduced-motion: if the user asked for
  // reduced motion we never hijack the wheel — native scroll only.
  useEffect(() => {
    const reduceMotionMq = window.matchMedia("(prefers-reduced-motion: reduce)");

    const checkDesktop = () => {
      const isLg = window.innerWidth >= 1024;
      const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      setEnabled(isLg && !hasTouch && !reduceMotionMq.matches);
    };

    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    reduceMotionMq.addEventListener("change", checkDesktop);
    return () => {
      window.removeEventListener("resize", checkDesktop);
      reduceMotionMq.removeEventListener("change", checkDesktop);
    };
  }, []);

  // Update active section dot based on scroll position
  useEffect(() => {
    if (!enabled) return;

    const handleScroll = () => {
      if (animatingRef.current) return;

      const scrollPos = window.scrollY + window.innerHeight / 3;
      let currentIdx = 0;

      for (let i = 0; i < SECTIONS.length; i++) {
        const el = document.getElementById(SECTIONS[i].id);
        if (el && scrollPos >= docTop(el)) {
          currentIdx = i;
        }
      }

      setActiveSection(currentIdx);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [enabled]);

  // Handle smooth scroll snap transitions (wheel + keyboard)
  useEffect(() => {
    if (!enabled) return;

    let gsapInstance: any = null;
    let settleTimer: ReturnType<typeof setTimeout> | null = null;

    Promise.all([
      import("gsap"),
      import("gsap/ScrollToPlugin")
    ]).then(([{ gsap }, { ScrollToPlugin }]) => {
      gsap.registerPlugin(ScrollToPlugin);
      gsapInstance = gsap;
    }).catch(() => {
      // Chunk load can be aborted (e.g. during dev HMR) — swallow so it doesn't
      // surface as an unhandled "[object Event]" rejection.
    });

    // Release the lock only after the gesture has *settled* — i.e. no wheel
    // events for SETTLE_MS. Trackpad inertia keeps firing wheel events long
    // after the animation ends; resetting this timer on every one of them is
    // what stops a single fling from snapping through several sections (the
    // "jump to section 3/4" bug).
    const SETTLE_MS = 140;
    const armSettleRelease = () => {
      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = setTimeout(() => {
        animatingRef.current = false;
      }, SETTLE_MS);
    };

    const getTargetScroll = (index: number) => {
      const el = document.getElementById(SECTIONS[index].id);
      return el ? docTop(el) : 0;
    };

    // Section whose top is nearest the current scroll position.
    const currentIndex = () => {
      const scrollPos = window.scrollY;
      let closestIdx = 0;
      let minDiff = Infinity;
      for (let i = 0; i < SECTIONS.length; i++) {
        const el = document.getElementById(SECTIONS[i].id);
        if (el) {
          const diff = Math.abs(scrollPos - docTop(el));
          if (diff < minDiff) {
            minDiff = diff;
            closestIdx = i;
          }
        }
      }
      return closestIdx;
    };

    const scrollToSection = (index: number) => {
      if (!gsapInstance) return;
      const clamped = Math.max(0, Math.min(SECTIONS.length - 1, index));
      animatingRef.current = true;
      setActiveSection(clamped);
      gsapInstance.to(window, {
        scrollTo: { y: getTargetScroll(clamped), autoKill: false },
        duration: 0.9,
        ease: "power3.inOut",
        onComplete: armSettleRelease, // start the settle window after the move
      });
    };

    // For sections taller than the viewport: let the user read them with native
    // scroll until an edge is reached, only then snap to the next/prev section.
    const shouldPassThrough = (dir: 1 | -1, el: HTMLElement) => {
      const vh = window.innerHeight;
      const y = window.scrollY;
      const top = docTop(el);
      const isTall = el.offsetHeight > vh + 40;
      if (!isTall) return false;
      return dir === 1
        ? y + vh < top + el.offsetHeight - 25
        : y > top + 25;
    };

    const handleWheel = (e: WheelEvent) => {
      if (animatingRef.current) {
        // Locked (animating, or inertia still flowing) — swallow the event and
        // keep the lock alive until the fling settles.
        e.preventDefault();
        armSettleRelease();
        return;
      }

      const dir: 1 | -1 = e.deltaY > 0 ? 1 : -1;
      const idx = currentIndex();
      const el = document.getElementById(SECTIONS[idx].id);
      if (!el) return;

      // Tall section not yet at its edge → let the browser scroll it natively.
      if (shouldPassThrough(dir, el)) return;

      const next = idx + dir;
      // At the top of the first section / bottom of the last → allow native
      // scroll so the top of the page and the footer stay reachable.
      if (next < 0 || next > SECTIONS.length - 1) return;

      // Committed to a section snap. preventDefault ALWAYS — including the tiny
      // sub-threshold ticks a trackpad or smooth wheel emits — so the page can
      // NOT drift a few pixels natively before the tween yanks it back. That
      // drift-then-snap-back was the "giật lên/xuống rồi mới chuyển" jerk.
      e.preventDefault();

      // Ignore micro jitter, but native scroll is already blocked above so the
      // page holds perfectly still until a real gesture triggers the snap.
      if (Math.abs(e.deltaY) < 4) return;

      scrollToSection(next);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (animatingRef.current) return;
      const idx = currentIndex();
      const el = document.getElementById(SECTIONS[idx].id);
      if (!el) return;

      if (e.key === "ArrowDown" || e.key === "PageDown") {
        if (shouldPassThrough(1, el)) return;
        if (idx < SECTIONS.length - 1) {
          e.preventDefault();
          scrollToSection(idx + 1);
        }
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        if (shouldPassThrough(-1, el)) return;
        if (idx > 0) {
          e.preventDefault();
          scrollToSection(idx - 1);
        }
      } else if (e.key === "Home") {
        e.preventDefault();
        scrollToSection(0);
      } else if (e.key === "End") {
        e.preventDefault();
        scrollToSection(SECTIONS.length - 1);
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", handleKeyDown);
      if (settleTimer) clearTimeout(settleTimer);
    };
  }, [enabled]);

  const handleDotClick = (index: number) => {
    Promise.all([
      import("gsap"),
      import("gsap/ScrollToPlugin")
    ]).then(([{ gsap }, { ScrollToPlugin }]) => {
      gsap.registerPlugin(ScrollToPlugin);
      animatingRef.current = true;
      setActiveSection(index);

      const el = document.getElementById(SECTIONS[index].id);
      const targetY = el ? docTop(el) : 0;

      gsap.to(window, {
        scrollTo: { y: targetY, autoKill: false },
        duration: 0.9,
        ease: "power3.inOut",
        onComplete: () => {
          // Brief cooldown so the wheel handler doesn't immediately re-snap.
          setTimeout(() => {
            animatingRef.current = false;
          }, 140);
        }
      });
    }).catch(() => {
      animatingRef.current = false;
    });
  };

  if (!enabled) return null;

  return (
    <div className="fixed right-8 top-1/2 -translate-y-1/2 z-[100] hidden lg:flex flex-col items-center gap-5 select-none">
      {/* Vertical Track Line */}
      <div className="absolute top-2.5 bottom-2.5 w-[1px] bg-white/5 pointer-events-none"></div>

      {SECTIONS.map((sec, idx) => {
        const isActive = activeSection === idx;
        return (
          <button
            key={sec.id}
            onClick={() => handleDotClick(idx)}
            className="group relative w-3.5 h-3.5 flex items-center justify-center cursor-pointer focus:outline-none"
            aria-label={`Go to section ${sec.label}`}
          >
            {/* Active pulsing ring */}
            {isActive && (
              <span className="absolute inset-[-4px] rounded-full border border-[#FF5A1F]/30 animate-ping duration-1000"></span>
            )}

            {/* Inner Core Dot */}
            <span
              className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${
                isActive
                  ? "bg-[#FF5A1F] scale-125 shadow-[0_0_10px_#FF5A1F]"
                  : "bg-white/20 group-hover:bg-[#FF5A1F]/50 group-hover:scale-110"
              }`}
            ></span>

            {/* Futuristic floating micro-panel label */}
            <span className="absolute right-7 py-1 px-2.5 rounded-md border border-white/5 bg-zinc-950/85 backdrop-blur-md font-mono text-[9px] font-bold text-slate-400 tracking-widest uppercase opacity-0 translate-x-4 scale-95 pointer-events-none transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 group-hover:scale-100 select-none whitespace-nowrap shadow-sm">
              <span className="text-[#FF5A1F] mr-1.5">{(idx + 1).toString().padStart(2, "0")}</span>
              {sec.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
