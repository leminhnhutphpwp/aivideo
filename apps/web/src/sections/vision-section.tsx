"use client";

import React, { useEffect, useRef, useState } from "react";
import { Crosshair, Sun, Flame } from "lucide-react";
import { useLandingSettings } from "@/hooks/use-landing-settings";

export function VisionSection({ hideText }: { hideText?: boolean }) {
  const ls = useLandingSettings();
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [parallaxY, setParallaxY] = useState(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const progress = 1 - rect.top / window.innerHeight;
      setParallaxY(progress * 40);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section
      id="vision"
      ref={sectionRef}
      className="relative min-h-[100dvh] w-full flex items-center overflow-hidden py-24 md:py-32"
    >
      {/* Parallax Background Image */}
      <div
        className="absolute inset-0 z-0"
        style={{ transform: `translateY(${parallaxY}px)` }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a0a05] via-[#0a0505] to-[#000000]" />
        {/* Simulated cinematic light rays */}
        <div
          className="absolute top-0 right-0 w-[600px] h-[600px] opacity-20"
          style={{
            background:
              "conic-gradient(from 180deg at 50% 50%, transparent 0deg, rgba(255,90,31,0.15) 60deg, transparent 120deg, rgba(255,138,91,0.1) 180deg, transparent 240deg, rgba(255,90,31,0.1) 300deg, transparent 360deg)",
            filter: "blur(60px)",
          }}
        />
      </div>

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent z-[1]" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 lg:px-20 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Text Content */}
          <div className="order-2 lg:order-1">
            <div
              className={`mb-6 transition-all duration-700 ${
                visible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-6"
              }`}
            >
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                {ls.vision_label}
              </span>
            </div>

            <h2
              className={`font-[family-name:var(--font-display-heading)] font-black text-white leading-[1.1] tracking-[0.04em] mb-8 transition-all duration-700 delay-100 ${
                visible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-6"
              }`}
              style={{ fontSize: "clamp(40px, 5vw, 64px)" }}
            >
              {ls.vision_title_line1}
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF5A1F] to-[#FF8A5B]">
                {ls.vision_title_line2}
              </span>
            </h2>

            <div
              className={`space-y-5 transition-all duration-700 delay-200 ${
                visible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-6"
              }`}
            >
              <p className="text-base md:text-lg text-slate-400 leading-[1.8]">
                {ls.vision_description_p1}
              </p>
              <p className="text-base md:text-lg text-slate-400 leading-[1.8]">
                {ls.vision_description_p2}
              </p>
            </div>
          </div>

          {/* Floating UI Mockup */}
          <div className="order-1 lg:order-2 flex justify-center lg:justify-end">
            <div
              className={`relative w-full max-w-md transition-all duration-700 delay-300 ${
                visible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8"
              }`}
            >
              <div className="cinematic-card p-6 md:p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#FF5A1F] animate-pulse" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                      Studio Control
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-600 font-medium">
                    LIVE
                  </span>
                </div>

                {/* Controls */}
                <div className="space-y-4">
                  <ControlRow
                    icon={Crosshair}
                    label="Camera"
                    value="Dolly"
                    delay={visible ? 400 : 0}
                  />
                  <ControlRow
                    icon={Sun}
                    label="Lighting"
                    value="Golden Hour"
                    delay={visible ? 500 : 0}
                  />
                  <ControlRow
                    icon={Flame}
                    label="Mood"
                    value="Dramatic"
                    delay={visible ? 600 : 0}
                  />
                </div>

                {/* Progress bar */}
                <div className="mt-6 pt-6 border-t border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                      Render Progress
                    </span>
                    <span className="text-[10px] text-[#FF5A1F] font-bold">
                      73%
                    </span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#FF5A1F] to-[#FF8A5B] rounded-full transition-all duration-1000"
                      style={{
                        width: visible ? "73%" : "0%",
                        transitionDelay: "800ms",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Decorative orb behind card */}
              <div
                className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-[80px] opacity-30 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(circle, rgba(255,90,31,0.4) 0%, transparent 70%)",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ControlRow({
  icon: Icon,
  label,
  value,
  delay,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  delay: number;
}) {
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.02] transition-all duration-500 ${
        show ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon className="w-4 h-4 text-slate-500" />
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          {label}
        </span>
      </div>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  );
}
