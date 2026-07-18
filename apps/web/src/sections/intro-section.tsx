"use client";

import React, { useEffect } from "react";
import { useInView } from "@/hooks/use-in-view";
import { useLandingSettings } from "@/hooks/use-landing-settings";
import gsap from "gsap";

export function IntroSection({ hideText }: { hideText?: boolean }) {
  const ls = useLandingSettings();
  const [ref, isInView] = useInView<HTMLDivElement>({ threshold: 0.1 });
  // Demote to a div when the SEO shell already renders the canonical <h2>.
  const HeadingTag = hideText ? "div" : "h2";

  // GSAP rotating circles
  useEffect(() => {
    if (!isInView) return;

    gsap.to("#intro-ring-1", { rotation: 360, duration: 40, repeat: -1, ease: "none" });
    gsap.to("#intro-ring-2", { rotation: -360, duration: 25, repeat: -1, ease: "none" });
    gsap.to("#intro-ring-3", { rotation: 360, duration: 15, repeat: -1, ease: "none" });
    gsap.to(".intro-orb", { rotation: 360, duration: 12, repeat: -1, ease: "none", transformOrigin: "center center" });

    return () => {
      gsap.killTweensOf("#intro-ring-1");
      gsap.killTweensOf("#intro-ring-2");
      gsap.killTweensOf("#intro-ring-3");
      gsap.killTweensOf(".intro-orb");
    };
  }, [isInView]);

  const features = (ls.intro_features || "").split("|").map(s => s.trim());

  return (
    <section
      id="intro"
      ref={ref}
      className="relative w-full lg:min-h-screen overflow-hidden bg-[#030305] flex items-center justify-center py-24 lg:py-0"
    >
      {/* Rotating circles background */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden">
        {/* Ring 1 - largest, slowest */}
        <div
          id="intro-ring-1"
          className="absolute w-[500px] h-[500px] lg:w-[700px] lg:h-[700px] rounded-full border-2 border-white/[0.08] shadow-[0_0_60px_rgba(255,255,255,0.03)]"
        />
        {/* Ring 2 - medium, reverse */}
        <div
          id="intro-ring-2"
          className="absolute w-[350px] h-[350px] lg:w-[500px] lg:h-[500px] rounded-full border border-white/[0.12] shadow-[0_0_40px_rgba(255,255,255,0.04)]"
        />
        {/* Ring 3 - smallest, fastest */}
        <div
          id="intro-ring-3"
          className="absolute w-[200px] h-[200px] lg:w-[300px] lg:h-[300px] rounded-full border-2 border-dashed border-[#FF5A1F]/40 shadow-[0_0_50px_rgba(255,90,31,0.08)]"
        />
        {/* Orbiting dots */}
        <div className="intro-orb absolute w-[180px] h-[180px] lg:w-[260px] lg:h-[260px]">
          <span className="absolute top-0 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-[#FF5A1F]/60 shadow-[0_0_10px_rgba(255,90,31,0.3)]" />
        </div>
        <div className="intro-orb absolute w-[320px] h-[320px] lg:w-[460px] lg:h-[460px]">
          <span className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white/30 shadow-[0_0_10px_rgba(255,255,255,0.15)]" />
        </div>
        <div className="intro-orb absolute w-[450px] h-[450px] lg:w-[640px] lg:h-[640px]">
          <span className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#FF5A1F]/40 shadow-[0_0_8px_rgba(255,90,31,0.2)]" />
        </div>
      </div>

      {/* Dark vignette & Ember Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#030305_70%)] z-10 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] lg:w-[800px] h-[600px] lg:h-[800px] rounded-full bg-[#FF5A1F] blur-[150px] lg:blur-[200px] opacity-[0.12] z-10 pointer-events-none" />

      {/* === CENTER CONTENT === */}
      <div className="relative z-20 px-4 sm:px-10 md:px-12 max-w-5xl mx-auto w-full text-center flex flex-col items-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-md border border-[#FF5A1F]/30 bg-[#FF5A1F]/5 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A1F]"></span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#FF5A1F]">{ls.intro_label}</span>
        </div>

        {/* Heading */}
        <HeadingTag
          className="font-[family-name:var(--font-display)] font-black text-white leading-[1.35] tracking-[-0.03em] mb-6"
          style={{ fontSize: "clamp(48px, 6vw, 96px)" }}
        >
              <span className="block">{ls.intro_title_line1}</span>
              <span className="block text-[#FF5A1F]">{ls.intro_title_line2}</span>
        </HeadingTag>

        {/* Description */}
        <p className="text-white/70 text-lg md:text-2xl max-w-2xl leading-[1.6] mb-12 font-light">
          {ls.intro_subtitle}
        </p>

        {/* Feature Pills - Simple text, no icon */}
        <div className="flex flex-wrap justify-center gap-3">
          {features.map((feature, idx) => (
            <span
              key={idx}
              className="px-5 py-2.5 text-sm font-medium text-white/80 bg-white/[0.03] border border-white/8 rounded-full hover:bg-white/[0.06] hover:border-white/15 transition-all duration-300 cursor-pointer"
            >
              {feature}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}