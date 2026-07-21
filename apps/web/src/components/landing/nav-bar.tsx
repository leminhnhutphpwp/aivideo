"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { GlowButton } from "@/components/landing/ui/glow-button";
import { useAuth } from "@/hooks/use-auth";

const navItems = [
  { name: "Giới thiệu", target: "intro" },
  { name: "Tính năng", target: "director" },
  { name: "Thư viện", target: "gallery" },
  { name: "Hệ sinh thái", target: "ecosystem" },
  { name: "Thống kê", target: "stats" },
  { name: "Câu hỏi", target: "faq" },
];

export function NavBar() {
  const { isLoggedIn } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleScrollEvent = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handleScrollEvent, { passive: true });

    // Intersection Observer for Active Section Tracking
    const observerOptions = {
      root: null,
      rootMargin: "-30% 0px -50% 0px",
      threshold: 0.1,
    };

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(handleIntersection, observerOptions);
    navItems.forEach((item) => {
      const el = document.getElementById(item.target);
      if (el) observer.observe(el);
    });

    // Prevent body scroll when mobile menu is open
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      window.removeEventListener("scroll", handleScrollEvent);
      document.body.style.overflow = "unset";
      navItems.forEach((item) => {
        const el = document.getElementById(item.target);
        if (el) observer.unobserve(el);
      });
    };
  }, [isOpen]);

  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const element = document.getElementById(targetId);
    if (element) {
      const offset = 80; // fixed header height offset
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-[99] h-16 md:h-20 flex items-center transition-all duration-700 ${scrolled
          ? "bg-zinc-950/70 backdrop-blur-2xl border-b border-white/5"
          : "bg-transparent"
          }`}
      >
        <div className="w-full max-w-[1440px] mx-auto px-6 md:px-12 lg:px-20 flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-3 group z-[101]"
          >
            <img src="/logo-background-white.png" alt="Wavise Studio" className="h-10 md:h-12 w-auto" />
          </Link>

          {/* Central Main Menu (Desktop) */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-6 bg-white/[0.02] backdrop-blur-md rounded-full px-6 py-1.5 shadow-[0_4px_30px_rgba(0,0,0,0.2)]">
            {navItems.map((item) => (
              <a
                key={item.target}
                href={`#${item.target}`}
                onClick={(e) => handleScroll(e, item.target)}
                className={`text-xs md:text-sm font-medium transition-all duration-300 relative py-1 cursor-pointer ${activeSection === item.target
                  ? "text-[#FF5A1F]"
                  : "text-slate-400 hover:text-white"
                  }`}
              >
                {item.name}
                {activeSection === item.target && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#FF5A1F] rounded-full shadow-[0_0_8px_#FF5A1F]" />
                )}
              </a>
            ))}
          </nav>

          {/* Right CTA */}
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-xs font-bold text-slate-400 hover:text-white uppercase tracking-widest transition-colors hidden sm:block">
              Đăng nhập
            </Link>
            <GlowButton href={isLoggedIn ? "/studio" : "/login"} size="sm" className="uppercase tracking-widest text-[10px] z-[101]">
              Studio
            </GlowButton>

            {/* Hamburger Menu Toggle (Mobile/Tablet) */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 md:hidden z-[101] relative cursor-pointer active:scale-95 transition-all flex items-center justify-center hover:bg-white/10 hover:border-white/20"
              aria-label="Toggle Menu"
            >
              <div className="w-4 h-3 relative flex flex-col justify-between">
                <span className={`w-full h-[1.5px] bg-white rounded-full transition-all duration-300 ${isOpen ? "rotate-45 translate-y-[5.25px]" : ""}`} />
                <span className={`w-full h-[1.5px] bg-white rounded-full transition-all duration-300 ${isOpen ? "opacity-0" : ""}`} />
                <span className={`w-full h-[1.5px] bg-white rounded-full transition-all duration-300 ${isOpen ? "-rotate-45 -translate-y-[5.25px]" : ""}`} />
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Drawer Overlay - Floating Sidebar Capsule style */}
      <div
        className={`fixed right-3 top-3 bottom-3 z-[999] w-[260px] rounded-2xl border border-white/10 bg-zinc-950/95 backdrop-blur-3xl shadow-[0_30px_70px_rgba(0,0,0,0.8)] md:hidden transition-all duration-500 ease-out flex flex-col justify-between p-6 ${isOpen
          ? "translate-x-0 opacity-100"
          : "translate-x-[calc(100%+24px)] opacity-0 pointer-events-none"
          }`}
      >
        {/* Ambient glow behind inside capsule */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full blur-[70px] opacity-15 bg-[#FF5A1F] pointer-events-none" />

        {/* Capsule Header */}
        <div className="relative z-10 flex justify-between items-center border-b border-white/5 pb-4">
          <div className="flex items-center gap-2 font-mono text-[9px] text-[#FF5A1F]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A1F] animate-ping" />
            <span className="font-bold tracking-widest">WAVISE_CONSOLE</span>
          </div>

          {/* Close button inside drawer */}
          <button
            onClick={() => setIsOpen(false)}
            className="w-6 h-6 rounded bg-white/5 border border-white/10 flex items-center justify-center cursor-pointer active:scale-90 transition-transform hover:bg-white/10"
          >
            <span className="text-white text-[9px] font-bold">✕</span>
          </button>
        </div>

        {/* Links Navigation (Aligned to Top) */}
        <nav className="relative z-10 flex flex-col gap-4 mt-8 flex-1">
          {navItems.map((item, idx) => (
            <a
              key={item.target}
              href={`#${item.target}`}
              onClick={(e) => {
                setIsOpen(false);
                handleScroll(e, item.target);
              }}
              className={`text-sm font-bold uppercase tracking-[0.15em] transition-all duration-300 py-1.5 cursor-pointer block border-l-2 pl-3 ${activeSection === item.target
                ? "text-[#FF5A1F] border-[#FF5A1F] translate-x-1"
                : "text-slate-400 border-transparent hover:text-white hover:border-white/20"
                }`}
              style={{
                transitionDelay: `${idx * 40}ms`
              }}
            >
              {item.name}
            </a>
          ))}

          {/* Separator */}
          <div className="w-full h-px bg-white/5 my-2" />

          {/* Login option */}
          <Link
            href="/login"
            onClick={() => setIsOpen(false)}
            className="text-xs font-bold text-slate-500 hover:text-white uppercase tracking-widest pl-3 transition-colors"
          >
            Đăng nhập
          </Link>
        </nav>

        {/* Footer info */}
        <div className="relative z-10 border-t border-white/5 pt-4 flex justify-between items-center font-mono text-[8px] text-slate-600 tracking-wider">
          <span>SYS_ACTIVE</span>
          <span>v2.0</span>
        </div>
      </div>

      {/* Backdrop overlay (dimmer for remaining screen area) */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-[998] bg-zinc-950/60 backdrop-blur-sm md:hidden transition-all duration-500"
        />
      )}
    </>
  );
}
