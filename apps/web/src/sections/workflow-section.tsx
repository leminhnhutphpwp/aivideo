"use client";

import React, { useState, useEffect } from "react";
import { SectionLabel } from "@/components/landing/ui/section-label";
import { useInView } from "@/hooks/use-in-view";
import { useLandingSettings } from "@/hooks/use-landing-settings";
import gsap from "gsap";
import { Pencil, Sparkles, Clapperboard, Cpu, Film } from "lucide-react";

const steps = [
  { 
    num: "01", 
    title: "Phân Tích Xu Hướng", 
    desc: "Chỉ cần nhập từ khóa hoặc link tham khảo. Thuật toán AI lập tức phân tích và dệt nên một kịch bản chuẩn cấu trúc thu hút.",
    img: "/images/landing/ecosystem/eco_storyboard_1780074263088.png",
    icon: Pencil
  },
  { 
    num: "02", 
    title: "Sáng Tạo Nội Dung", 
    desc: "Khớp nối thông tin với hàng triệu dữ liệu trending realtime. Đảm bảo nội dung của bạn luôn dẫn đầu làn sóng trên mọi nền tảng.",
    img: "/images/landing/intro/intro_2_1780074594379.png",
    icon: Sparkles
  },
  { 
    num: "03", 
    title: "Biên Tập Nội Dung", 
    desc: "Phân chia khung hình theo nhịp độ nhanh, ghép nhạc trending và chèn hiệu ứng chuyển cảnh bắt mắt giữ chân người xem.",
    img: "/images/landing/intro/intro_3_1780074610559.png",
    icon: Clapperboard
  },
  { 
    num: "04", 
    title: "Render Đa Định Dạng", 
    desc: "Động cơ media xử lý song song, xuất video sắc nét với định dạng dọc (9:16) và ngang (16:9) chỉ trong chớp mắt.",
    img: "/images/landing/intro/intro_4_1780074625638.png",
    icon: Cpu
  },
  { 
    num: "05", 
    title: "Phân Phối Đa Kênh", 
    desc: "Lên lịch và phân phối nội dung lên TikTok, Reels, YouTube Shorts. Một cú click, tiếp cận khán giả mục tiêu trên nhiều nền tảng.",
    img: "/images/landing/ecosystem/eco_avatar_1780074278506.png",
    icon: Film
  },
];

export function WorkflowSection({ hideText }: { hideText?: boolean }) {
  const ls = useLandingSettings();
  const [ref, isInView] = useInView<HTMLDivElement>({ threshold: 0.05 });
  const [activeIdx, setActiveIdx] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  const active = steps[activeIdx];

  const switchStep = (idx: number) => {
    if (idx === activeIdx || transitioning) return;
    setTransitioning(true);
    gsap.to("#wf-bg-img", { opacity: 0, scale: 1.04, duration: 0.35, ease: "power2.in", onComplete: () => {
      setActiveIdx(idx);
      setTransitioning(false);
    }});
  };

  useEffect(() => {
    if (!transitioning) {
      gsap.fromTo("#wf-bg-img", { opacity: 0, scale: 1.04 }, { opacity: 1, scale: 1, duration: 0.6, ease: "power2.out" });
    }
  }, [activeIdx, transitioning]);

  // Entrance animations
  useEffect(() => {
    if (!isInView) return;
    gsap.fromTo("#wf-title", { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" });
    gsap.fromTo("#wf-desc", { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, delay: 0.15, ease: "power3.out" });
    gsap.fromTo(".wf-thumb", { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.05, delay: 0.2, ease: "power2.out" });
  }, [isInView]);

  // Auto cycle
  useEffect(() => {
    if (!isInView) return;
    const interval = setInterval(() => {
      switchStep((activeIdx + 1) % steps.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isInView, activeIdx]);

  return (
    <section
      id="workflow"
      ref={ref}
      className="relative w-full lg:min-h-screen overflow-hidden bg-zinc-950"
    >
      {/* === FULLSCREEN BACKGROUND === */}
      <img
        id="wf-bg-img"
        src={active.img}
        alt={active.title}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ filter: "brightness(0.6) contrast(1.05)" }}
      />
      {/* Ember Color tint layer */}
      <div className="absolute inset-0 transition-colors duration-700 bg-[#FF5A1F] mix-blend-overlay opacity-20" />
      
      {/* Gradient layers */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-transparent" />

      {/* === CONTENT OVERLAY === */}
      <div className="relative z-10 lg:min-h-screen flex flex-col justify-between px-5 md:px-12 lg:px-16 py-24 lg:py-0 lg:pt-16 lg:pb-10 max-w-[1440px] mx-auto w-full">

        {/* TOP: Label + Title + Description */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pt-4 lg:pt-8">
          <div>
            <SectionLabel className="mb-3 opacity-80">{ls.workflow_label}</SectionLabel>
            <h2
              id="wf-title"
              className="font-[family-name:var(--font-display)] font-black text-white leading-[1.0] tracking-tight"
              style={{ fontSize: "clamp(32px, 5.5vw, 72px)" }}
            >
              {active.title}
            </h2>
          </div>

          {/* Active info */}
          <div id="wf-desc" className="text-left lg:text-right lg:max-w-sm mt-2 lg:mt-0">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2 text-[#FF5A1F]">
              BƯỚC {active.num}
            </div>
            <p className="text-white/70 text-sm leading-relaxed">
              {active.desc}
            </p>
          </div>
        </div>

        {/* CENTER SPACER — desktop only */}
        <div className="hidden lg:block flex-1" />

        {/* BOTTOM: Thumbnail strip */}
        <div className="flex flex-col gap-4">
          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <span className="text-white/30 text-[10px] font-mono tracking-widest">
              STEP {active.num} / 05
            </span>
            <div className="flex-1 h-px bg-white/10 relative">
              <div
                className="absolute left-0 top-0 h-full transition-all duration-500 bg-[#FF5A1F]"
                style={{ width: `${((activeIdx + 1) / steps.length) * 100}%` }}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full animate-pulse bg-[#FF5A1F]" />
              <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest">PIPELINE</span>
            </div>
          </div>

          {/* Buttons strip */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {steps.map((step, idx) => {
              const isActive = activeIdx === idx;
              const Icon = step.icon;
              return (
                <button
                  key={step.num}
                  onClick={() => switchStep(idx)}
                  className={`wf-thumb flex-1 min-w-[160px] md:min-w-[200px] flex items-center gap-2.5 md:gap-3 relative rounded-xl overflow-hidden transition-all duration-400 group p-2.5 md:p-3 border ${
                    isActive ? "border-[#FF5A1F] bg-[#FF5A1F]/10 lg:scale-[1.02]" : "border-white/5 bg-zinc-950/40 hover:bg-white/5 lg:hover:scale-[1.01]"
                  }`}
                >
                  <div className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${isActive ? "bg-[#FF5A1F] text-black" : "bg-white/5 text-white/50"}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-[9px] font-bold uppercase tracking-widest mb-0.5 text-white/40">
                      BƯỚC {step.num}
                    </div>
                    <div className={`font-bold text-xs transition-colors ${isActive ? "text-white" : "text-white/60"}`}>
                      {step.title}
                    </div>
                  </div>
                  
                  {/* Progress bar line for active step */}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 h-0.5 bg-white/10 w-full">
                      <div className="h-full bg-[#FF5A1F] animate-[progress_4.5s_linear]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
