"use client";

import React, { useEffect } from "react";
import { SectionLabel } from "@/components/landing/ui/section-label";
import { useInView } from "@/hooks/use-in-view";
import { useLandingSettings } from "@/hooks/use-landing-settings";
import gsap from "gsap";
import { Video, Image, Smile, Clapperboard, Sparkles } from "lucide-react";

const bentoFeatures = [
  {
    id: "text-video",
    icon: Video,
    label: "Text-to-Video Engine",
    tagline: "CORE ARCHITECTURE",
    desc: "Biến ý tưởng văn bản thành video Cinematic 4K hoàn chỉnh với các phân cảnh giật gân, ánh sáng chuẩn phòng thu.",
    img: "/images/landing/ecosystem/eco_text_video_1780074218241.png",
    className: "lg:col-span-2 lg:row-span-2",
  },
  {
    id: "image-video",
    icon: Image,
    label: "Image Animation",
    tagline: "MOTION AI",
    desc: "Thổi hồn vào ảnh tĩnh với chuyển động camera Parallax và hoạt ảnh vật lý cực kỳ chân thực.",
    img: "/images/landing/ecosystem/eco_image_video_1780074244516.png",
    className: "lg:col-span-2 lg:row-span-1",
  },
  {
    id: "storyboard",
    icon: Clapperboard,
    label: "Auto Scripting",
    tagline: "DIRECTOR",
    desc: "Tự động phân chia khung hình và viết kịch bản.",
    img: "/images/landing/ecosystem/eco_storyboard_1780074263088.png",
    className: "lg:col-span-1 lg:row-span-1",
  },
  {
    id: "avatar",
    icon: Smile,
    label: "Virtual Avatars",
    tagline: "LIP-SYNC",
    desc: "Nhân vật AI với biểu cảm vi tế và khớp khẩu hình.",
    img: "/images/landing/ecosystem/eco_avatar_1780074278506.png",
    className: "lg:col-span-1 lg:row-span-1",
  },
];

export function EcosystemSection({ hideText }: { hideText?: boolean }) {
  const ls = useLandingSettings();
  const [ref, isInView] = useInView<HTMLElement>({ threshold: 0.1 });

  useEffect(() => {
    if (!isInView) return;
    
    gsap.fromTo("#eco-header", { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: "power3.out" });
    gsap.fromTo(".eco-bento-card", 
      { y: 40, opacity: 0, scale: 0.95 }, 
      { y: 0, opacity: 1, scale: 1, duration: 0.8, stagger: 0.1, delay: 0.2, ease: "back.out(1.2)" }
    );
  }, [isInView]);

  return (
    <section
      id="ecosystem"
      ref={ref}
      className="relative w-full lg:min-h-screen overflow-hidden bg-[#030305] flex flex-col pt-20 lg:pt-24 pb-10"
    >
      {/* Ambient Background Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-[#FF5A1F] blur-[200px] opacity-[0.08] rounded-full" />
      </div>

      <div className="relative z-10 px-6 md:px-12 lg:px-16 max-w-[1440px] mx-auto w-full flex flex-col lg:min-h-screen">
        
        {/* Header */}
        <div id="eco-header" className="mb-6 lg:mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <SectionLabel className="mb-3 opacity-80">{ls.ecosystem_label}</SectionLabel>
            <h2
              className="font-[family-name:var(--font-display)] font-black text-white leading-[1.0] tracking-tight"
              style={{ fontSize: "clamp(32px, 5vw, 64px)" }}
            >
              {ls.ecosystem_title_line1}<br />
              <span className="text-gradient-ember">{ls.ecosystem_title_line2}</span>
            </h2>
          </div>
          
          <div className="md:max-w-xs md:text-right">
            <p className="text-white/60 text-xs md:text-sm leading-relaxed">
              {ls.ecosystem_subtitle}
            </p>
          </div>
        </div>

        {/* Cinematic Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2 gap-4 lg:flex-1 lg:min-h-0">
          {bentoFeatures.map((feat) => {
            const Icon = feat.icon;
            
            return (
              <div 
                key={feat.id}
                className={`eco-bento-card group relative rounded-2xl overflow-hidden border border-white/5 bg-zinc-950 hover:border-[#FF5A1F]/30 transition-all duration-500 cursor-default min-h-[200px] ${feat.className}`}
              >
                {/* Background Image */}
                <img 
                  src={feat.img} 
                  alt={feat.label}
                  className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-75 group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105"
                  style={{ filter: "brightness(0.85) contrast(1.1)" }}
                />
                
                {/* Gradients & Ember Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#030305] via-[#030305]/60 to-transparent opacity-90 group-hover:opacity-70 transition-opacity duration-500" />
                <div className="absolute inset-0 bg-[#FF5A1F] mix-blend-overlay opacity-0 group-hover:opacity-20 transition-opacity duration-500" />
                
                {/* Holographic line */}
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#FF5A1F]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Content */}
                <div className="absolute inset-0 p-6 lg:p-6 flex flex-col justify-between">
                  {/* Top Bar */}
                  <div className="flex justify-between items-start">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-2xl bg-zinc-950/40 backdrop-blur-md border border-white/10 flex items-center justify-center group-hover:bg-[#FF5A1F]/20 group-hover:border-[#FF5A1F]/50 transition-all duration-500">
                      <Icon className="w-5 h-5 lg:w-6 lg:h-6 text-white/50 group-hover:text-[#FF5A1F] transition-colors duration-500" />
                    </div>
                    
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform translate-y-2 group-hover:translate-y-0">
                      <Sparkles className="w-3 h-3 text-[#FF5A1F]" />
                      <span className="hidden lg:block text-[9px] font-mono font-bold uppercase tracking-widest text-[#FF5A1F]">AI POWERED</span>
                    </div>
                  </div>

                  {/* Bottom Text */}
                  <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                    <div className="text-[9px] lg:text-[10px] font-bold uppercase tracking-[0.2em] text-[#FF5A1F] mb-1 lg:mb-2 opacity-80">
                      {feat.tagline}
                    </div>
                    <h3 className="font-[family-name:var(--font-display)] font-bold text-xl lg:text-3xl text-white mb-2">
                      {feat.label}
                    </h3>
                    <p className="text-white/60 text-xs lg:text-sm leading-relaxed max-w-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                      {feat.desc}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
