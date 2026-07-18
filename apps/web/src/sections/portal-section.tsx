"use client";

import React, { useState, useEffect, useRef } from "react";
import { GlowButton } from "@/components/landing/ui/glow-button";
import { TextMorph } from "@/components/landing/ui/text-morph";
import { useInView } from "@/hooks/use-in-view";
import { useLandingSettings } from "@/hooks/use-landing-settings";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";
import { OptimizedImage } from "@/components/ui/optimized-image";

export function PortalSection({ hideText }: { hideText?: boolean }) {
  const ls = useLandingSettings();
  const { isLoggedIn } = useAuth();
  const [inViewRef, isInView] = useInView<HTMLDivElement>({ threshold: 0.3 });
  const containerRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLImageElement>(null);
  const beamsRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let rafId: number;

    const handleMouseMove = (e: MouseEvent) => {
      rafId = requestAnimationFrame(() => {
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;

        const dx = x / (rect.width / 2);
        const dy = y / (rect.height / 2);

        if (bgRef.current) {
          bgRef.current.style.transform = `scale(1.05) translate3d(${dx * -20}px, ${dy * -20}px, 0)`;
        }
        if (beamsRef.current) {
          beamsRef.current.style.transform = `translate3d(${dx * 35}px, ${dy * 35}px, 0)`;
        }
        if (textRef.current) {
          textRef.current.style.transform = `translate3d(${dx * 12}px, ${dy * 12}px, 0)`;
        }
      });
    };

    const handleMouseLeave = () => {
      rafId = requestAnimationFrame(() => {
        if (bgRef.current) {
          bgRef.current.style.transform = `scale(1) translate3d(0, 0, 0)`;
        }
        if (beamsRef.current) {
          beamsRef.current.style.transform = `translate3d(0, 0, 0)`;
        }
        if (textRef.current) {
          textRef.current.style.transform = `translate3d(0, 0, 0)`;
        }
      });
    };

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(rafId);
    };
  }, []);

  // Combine refs cleanly
  const setRefs = (node: HTMLDivElement | null) => {
    inViewRef(node);
    (containerRef as any).current = node;
  };

  return (
    <section
      id="portal"
      ref={setRefs}
      className="relative min-h-[100dvh] lg:min-h-screen w-full flex items-center justify-center overflow-hidden lg:py-0 bg-zinc-950"
    >
      {/* Background with cinematic motion interpolation */}
      <div className="absolute inset-0 z-0">
        <OptimizedImage
          ref={bgRef}
          src="/images/landing/portal-bg.webp"
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-1000 ease-out"
          style={{ transform: undefined }}
        />
        <div className="absolute inset-0 bg-zinc-950/60" />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, rgba(255,90,31,0.1) 0%, transparent 50%)" }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.8) 70%, black 100%)" }} />
      </div>

      {/* Converging light beams with faster parallax translation */}
      <div ref={beamsRef} className="absolute inset-0 z-[1] pointer-events-none overflow-hidden transition-transform duration-[1.2s] ease-out">
        <div
          className="absolute top-0 left-1/4 w-[2px] h-full bg-gradient-to-b from-[#FF5A1F]/10 to-transparent rotate-12"
          style={{ filter: "blur(20px)" }}
        />
        <div
          className="absolute top-0 right-1/4 w-[2px] h-full bg-gradient-to-b from-[#00D5FF]/10 to-transparent -rotate-12"
          style={{ filter: "blur(20px)" }}
        />
      </div>

      {/* Content with dynamic foreground float */}
      <div ref={textRef} className="relative z-10 text-center px-6 max-w-4xl mx-auto transition-transform duration-[0.8s] ease-out">
        {/* Morphing label */}
        <div
          className={`mb-8 transition-all duration-1000 ${isInView ? "opacity-100" : "opacity-0"}`}
        >
          <span className="font-[family-name:var(--font-mono)] text-sm text-slate-400 tracking-[0.3em] uppercase">
            <TextMorph
              texts={ls.portal_label_texts.split(" / ")}
              interval={2500}
            />
          </span>
        </div>

        <h2
          className={`font-[family-name:var(--font-display)] font-black text-white leading-[1.1] tracking-[0.03em] mb-6 transition-all duration-1000 delay-200 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
          style={{ fontSize: "clamp(28px, 5vw, 72px)" }}
        >
          {ls.portal_title_line1}{" "}
          <br className="hidden sm:block" />
          <span className="text-gradient-ember">{ls.portal_title_line2}</span>
        </h2>

        <p
          className={`text-base md:text-lg text-slate-300 max-w-xl mx-auto mb-12 leading-relaxed transition-all duration-1000 delay-400 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          {ls.portal_subtitle}
        </p>

        <div
          className={`transition-all duration-1000 delay-500 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          <GlowButton href={isLoggedIn ? "/studio" : "/login"} size="xl" glow>
            {ls.portal_cta_text}
          </GlowButton>
        </div>

        <div
          className={`mt-8 transition-all duration-1000 delay-700 ${isInView ? "opacity-100" : "opacity-0"}`}
        >
          <p className="text-sm text-slate-600">
            {ls.portal_login_text}{" "}
            <Link href="/login" className="text-slate-400 hover:text-white transition-colors">
              {ls.portal_login_label}
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
