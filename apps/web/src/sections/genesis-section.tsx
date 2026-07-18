"use client";

import React, { useState, useEffect } from "react";
import { SectionLabel } from "@/components/landing/ui/section-label";
import { useInView } from "@/hooks/use-in-view";
import { useLandingSettings } from "@/hooks/use-landing-settings";
import gsap from "gsap";
import { Terminal, Cpu, MonitorPlay, ChevronRight } from "lucide-react";

const genesisPhases = [
  {
    num: "01",
    name: "Nắm Bắt Xu Hướng",
    tag: "ANALYSIS PHASE",
    desc: "Thuật toán AI liên tục cập nhật xu hướng mới nhất từ TikTok và Reels. Đề xuất ý tưởng và kịch bản có tỷ lệ giữ chân (retention rate) cao nhất.",
    img: "/images/landing/intro/intro_6_1780074685662.png", // Neural network
    icon: Terminal,
  },
  {
    num: "02",
    name: "Sáng Tạo Video",
    tag: "GENERATION PHASE",
    desc: "Hệ thống điện toán mây xử lý và render nhiều biến thể video cùng lúc. Đóng vai trò như một cỗ máy tạo nội dung 24/7 không bao giờ ngủ.",
    img: "/images/landing/ecosystem/eco_text_video_1780074218241.png", // Computer interface
    icon: Cpu,
  },
  {
    num: "03",
    name: "Tối Ưu Tương Tác",
    tag: "DELIVERY PHASE",
    desc: "Lồng ghép âm thanh thu hút, chèn phụ đề động (dynamic captions) và cắt ghép nhịp điệu nhanh để tối đa hóa tỷ lệ chuyển đổi và tương tác.",
    img: "/images/landing/intro/intro_1_1780074579390.png", // Cinematic portrait
    icon: MonitorPlay,
  },
];

export function GenesisSection({ hideText }: { hideText?: boolean }) {
  const ls = useLandingSettings();
  const [ref, isInView] = useInView<HTMLElement>({ threshold: 0.1 });
  const [activeIdx, setActiveIdx] = useState(0);

  // Auto cycle (Reverted to original)
  useEffect(() => {
    if (!isInView) return;
    const interval = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % genesisPhases.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isInView]);

  // Entrance animations
  useEffect(() => {
    if (!isInView) return;
    gsap.fromTo("#genesis-left-col", { x: -40, opacity: 0 }, { x: 0, opacity: 1, duration: 1, ease: "power3.out" });
    gsap.fromTo("#genesis-right-col", { scale: 0.95, opacity: 0 }, { scale: 1, opacity: 1, duration: 1, delay: 0.2, ease: "power3.out" });
  }, [isInView]);

  const active = genesisPhases[activeIdx];

  return (
    <section
      id="genesis"
      ref={ref}
      className="relative w-full min-h-[100dvh] lg:min-h-screen overflow-hidden bg-[#030305] flex items-center py-20 lg:py-0"
    >
      {/* === BACKGROUND AMBIENCE === */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Subtle grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,90,31,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,90,31,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
        
        {/* Dynamic glow tracking the active phase */}
        <div 
          className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[200px] opacity-[0.12] transition-all duration-1000"
          style={{ backgroundColor: "#FF5A1F", transform: `translateY(${(activeIdx - 1) * 10}%)` }}
        />
      </div>

      {/* === 2-COLUMN BALANCED LAYOUT === */}
      <div className="relative z-10 px-5 md:px-12 lg:px-16 max-w-[1440px] mx-auto w-full grid lg:grid-cols-12 gap-6 lg:gap-20 items-center">
        
        {/* LEFT: Titles & Accordion */}
        <div id="genesis-left-col" className="lg:col-span-5 flex flex-col justify-center max-h-[80vh]">
          <SectionLabel className="mb-4 opacity-80">{ls.genesis_label}</SectionLabel>
          <h2
            className="font-[family-name:var(--font-display)] font-black text-white leading-[1.05] tracking-tight mb-10"
            style={{ fontSize: "clamp(40px, 5vw, 64px)" }}
          >
            {ls.genesis_title_line1}<br />
            <span className="text-gradient-ember whitespace-nowrap">{ls.genesis_title_line2}</span>
          </h2>

          {/* Interactive Accordion */}
          <div className="flex flex-col gap-3 md:gap-4">
            {genesisPhases.map((phase, idx) => {
              const isActive = activeIdx === idx;
              const Icon = phase.icon;
              return (
                <button
                  key={phase.num}
                  onClick={() => setActiveIdx(idx)}
                  className={`group text-left relative overflow-hidden transition-all duration-500 rounded-2xl border cursor-pointer ${
                    isActive 
                      ? "bg-[#FF5A1F]/[0.05] border-[#FF5A1F]/40 p-4 md:p-6 shadow-[0_0_30px_rgba(255,90,31,0.1)] lg:scale-[1.02]" 
                      : "bg-white/[0.01] border-white/5 p-3.5 md:p-4 hover:bg-white/[0.04] hover:border-white/20 lg:hover:scale-[1.01]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`text-xs font-mono font-bold tracking-widest transition-colors ${isActive ? "text-[#FF5A1F]" : "text-white/30 group-hover:text-[#FF5A1F]/70"}`}>
                        {phase.num}
                      </div>
                      <h3 className={`font-bold text-lg lg:text-xl transition-colors ${isActive ? "text-white" : "text-white/60 group-hover:text-white"}`}>
                        {phase.name}
                      </h3>
                    </div>
                    <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 ${isActive ? "bg-[#FF5A1F] text-black rotate-90 shadow-[0_0_15px_#FF5A1F]" : "bg-white/5 text-white/40 group-hover:bg-white/10 group-hover:text-white"}`}>
                      <ChevronRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </div>
                  </div>

                  {/* Expandable Content */}
                  <div 
                    className={`transition-all duration-500 ease-in-out grid ${isActive ? "grid-rows-[1fr] opacity-100 mt-5" : "grid-rows-[0fr] opacity-0 mt-0"}`}
                  >
                    <div className="overflow-hidden">
                      <div className="flex gap-3 md:gap-4">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-[#FF5A1F]/20 flex items-center justify-center shrink-0 border border-[#FF5A1F]/30 shadow-inner">
                          <Icon className="w-4 h-4 md:w-5 md:h-5 text-[#FF5A1F]" />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1.5 text-[#FF5A1F]">
                            {phase.tag}
                          </div>
                          <p className="text-white/80 text-sm leading-relaxed">
                            {phase.desc}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Active Indicator Line */}
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#FF5A1F] shadow-[0_0_10px_#FF5A1F]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Visualizer Display */}
        <div id="genesis-right-col" className="lg:col-span-7 relative h-[400px] lg:h-[600px] rounded-2xl overflow-hidden border border-white/10 bg-zinc-950 shadow-sm">
          
          {/* Top Window Bar */}
          <div className="absolute top-0 left-0 w-full h-12 bg-zinc-950/40 backdrop-blur-md border-b border-white/5 flex items-center px-6 z-20">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-white/10" />
              <div className="w-3 h-3 rounded-full bg-white/10" />
              <div className="w-3 h-3 rounded-full bg-[#FF5A1F]/80 shadow-[0_0_10px_#FF5A1F]" />
            </div>
            <div className="flex-1 text-center text-[10px] font-mono text-white/30 uppercase tracking-widest">
              G-ENGINE TERMINAL // {active.tag}
            </div>
          </div>

          {/* Crossfading Images */}
          {genesisPhases.map((phase, idx) => (
            <div 
              key={phase.num}
              className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
              style={{ opacity: activeIdx === idx ? 1 : 0, zIndex: activeIdx === idx ? 1 : 0 }}
            >
              <img 
                src={phase.img} 
                alt={phase.name} 
                className="w-full h-full object-cover"
                style={{ filter: "brightness(0.75) contrast(1.15)" }}
              />
              <div className="absolute inset-0 bg-[#FF5A1F] mix-blend-overlay opacity-20" />
            </div>
          ))}

          {/* Holographic scanning effect */}
          <div className="absolute inset-0 z-10 pointer-events-none">
            <div className="w-full h-[2px] bg-[#FF5A1F]/50 shadow-[0_0_20px_#FF5A1F] animate-[scan_4s_ease-in-out_infinite]" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100%_4px]" />
          </div>
          
          {/* Bottom HUD */}
          <div className="absolute bottom-6 left-6 right-6 z-20 flex justify-between items-end">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-mono text-[#FF5A1F] uppercase">System Status</span>
              <span className="text-white font-bold text-sm">OPTIMAL RUNNING</span>
            </div>
            <active.icon className="w-8 h-8 text-white/30" />
          </div>

        </div>
      </div>
    </section>
  );
}
