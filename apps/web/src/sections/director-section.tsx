"use client";

import React, { useState, useEffect } from "react";
import { SectionLabel } from "@/components/landing/ui/section-label";
import { GlassCard } from "@/components/landing/ui/glass-card";
import { useInView } from "@/hooks/use-in-view";
import { useLandingSettings } from "@/hooks/use-landing-settings";
import { MoveRight, Sunrise, Flame, Video, Sparkles, AlertCircle } from "lucide-react";
import { OptimizedImage } from "@/components/ui/optimized-image";

export function DirectorSection({ hideText }: { hideText?: boolean }) {
  const ls = useLandingSettings();
  const [ref, isInView] = useInView<HTMLDivElement>({ threshold: 0.15 });

  // Interactive state
  const [selectedRatio, setSelectedRatio] = useState("TikTok/Reels (9:16)");
  const [selectedLighting, setSelectedLighting] = useState("Cinematic Dark");
  const [selectedGoal, setSelectedGoal] = useState("Sự Lan Tỏa");
  const [selectedAudio, setSelectedAudio] = useState("Quay tĩnh");
  const [timecode, setTimecode] = useState("01:24:36:12");

  // Dynamic run-time timecode simulation
  useEffect(() => {
    const interval = setInterval(() => {
      const date = new Date();
      const m = String(date.getMinutes()).padStart(2, "0");
      const s = String(date.getSeconds()).padStart(2, "0");
      const ms = String(Math.floor(Math.random() * 100)).padStart(2, "0");
      setTimecode(`01:${m}:${s}:${ms}`);
    }, 45);
    return () => clearInterval(interval);
  }, []);

  const controlsLeft = [
    {
      title: "Khung hình (Ratio)",
      icon: MoveRight,
      state: selectedRatio,
      setState: setSelectedRatio,
      items: ["TikTok/Reels (9:16)", "YouTube (16:9)", "Instagram (1:1)", "Facebook (4:5)", "Shorts"],
    },
    {
      title: "Ánh sáng & Tone",
      icon: Sunrise,
      state: selectedLighting,
      setState: setSelectedLighting,
      items: ["Vibrant Social", "Cinematic Dark", "Studio Glow", "Pastel Soft", "Cyber Neon"],
    },
  ];

  const controlsRight = [
    {
      title: "Mục tiêu (Goal)",
      icon: Flame,
      state: selectedGoal,
      setState: setSelectedGoal,
      items: ["Sự Lan Tỏa", "Tăng Thương Hiệu", "Chiến Dịch Ads", "Kể Chuyện", "Giới Thiệu Sản Phẩm"],
    },
    {
      title: "Chuyển động máy quay",
      icon: Video,
      state: selectedAudio,
      setState: setSelectedAudio,
      items: ["Quay tĩnh", "Lia ngang", "Phóng (Zoom)", "Theo dõi", "Bay Drone"],
    },
  ];

  // Visual simulation mappings
  const lightingImages: Record<string, string> = {
    "Vibrant Social": "/images/landing/social-vibrant.webp",
    "Cinematic Dark": "/images/landing/cinematic-dark.webp",
    "Studio Glow": "/images/landing/studio-glow.webp",
    "Pastel Soft": "/images/landing/pastel-soft.webp",
    "Cyber Neon": "/images/landing/cyber-neon.webp"
  };

  const lightingFilters: Record<string, string> = {
    "Vibrant Social": "contrast-[1.1] saturate-[1.3] brightness-[1.05] sepia-[5%]",
    "Cinematic Dark": "contrast-[1.3] brightness-[0.8] saturate-[0.8] sepia-[15%] hue-rotate-[-8deg]",
    "Studio Glow": "brightness-[1.12] contrast-[0.92] saturate-[1.05]",
    "Pastel Soft": "saturate-[0.75] contrast-[0.88] brightness-[1.08] sepia-[12%]",
    "Cyber Neon": "contrast-[1.15] hue-rotate-[45deg] saturate-[1.6] brightness-[0.95]"
  };

  const ratioAspects: Record<string, string> = {
    "TikTok/Reels (9:16)": "w-[56%] aspect-[9/16] h-full mx-auto",
    "Shorts": "w-[56%] aspect-[9/16] h-full mx-auto",
    "YouTube (16:9)": "w-full aspect-[16/9] h-auto my-auto",
    "Instagram (1:1)": "w-[75%] aspect-[1/1] h-auto mx-auto my-auto",
    "Facebook (4:5)": "w-[68%] aspect-[4/5] h-auto mx-auto my-auto"
  };

  return (
    <section
      id="director"
      ref={ref}
      className="relative min-h-[100dvh] lg:min-h-screen w-full flex items-center py-20 md:py-24 lg:py-0 overflow-hidden bg-[#050508]"
    >
      <div className="relative z-10 max-w-[1440px] mx-auto px-6 md:px-12 lg:px-16 w-full">
        {/* Title — compact inline */}
        <div className={`mb-6 lg:mb-8 transition-all duration-1000 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className="flex flex-col lg:flex-row lg:items-end gap-3">
            <div>
              <SectionLabel className="mb-2">{ls.director_label}</SectionLabel>
              <h2 className="font-[family-name:var(--font-display)] font-bold text-white tracking-tight" style={{ fontSize: "clamp(24px, 3.5vw, 44px)" }}>
                {ls.director_title_line1}
                <span className="text-gradient-ember">{ls.director_title_line2}</span>
              </h2>
            </div>
            <p className="text-slate-500 text-xs leading-relaxed lg:mb-1 lg:ml-4 lg:mr-8 lg:max-w-sm">
              {ls.director_subtitle}
            </p>
          </div>
        </div>

        {/* Director Layout — 3-col compact */}
        <div className="flex flex-col xl:flex-row items-stretch gap-5 xl:gap-6">
          
          {/* Left Controls */}
          <div className="flex-1 flex flex-col gap-3">
            {controlsLeft.map((ctrl, i) => {
              const Icon = ctrl.icon;
              return (
                <div
                  key={ctrl.title}
                  className={`flex-1 transition-all duration-700 ${isInView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-12"}`}
                  style={{ transitionDelay: `${200 + i * 100}ms` }}
                >
                  <GlassCard className="p-5 h-full flex flex-col gap-4 bg-zinc-950/80 border-white/[0.06] backdrop-blur-xl hover:border-white/[0.15] hover:bg-zinc-950 transition-all duration-500 shadow-md relative overflow-hidden group">
                    {/* Subtle hover gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#FF5A1F]/0 via-transparent to-[#FF5A1F]/0 group-hover:from-[#FF5A1F]/5 transition-all duration-700 pointer-events-none" />
                    
                    <div className="flex items-center gap-3 relative z-10">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-zinc-950/50 border border-white/10 group-hover:border-[#FF5A1F]/50 transition-colors">
                        <Icon className="w-4 h-4 text-[#FF5A1F]" />
                      </div>
                      <span className="font-bold text-white text-xs tracking-widest uppercase">{ctrl.title}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {ctrl.items.map((item) => {
                        const isCurrent = ctrl.state === item;
                        return (
                          <button
                            key={item}
                            onClick={() => ctrl.setState(item)}
                            className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all duration-300 cursor-pointer relative z-10 ${
                              isCurrent 
                                ? "border-[#FF5A1F]/50 text-white bg-[#FF5A1F] shadow-[0_0_15px_rgba(255,90,31,0.4)] scale-[1.02]" 
                                : "border-white/[0.08] text-slate-400 bg-white/[0.02] hover:border-white/[0.2] hover:bg-white/[0.05] hover:text-white"
                            }`}
                          >
                            {item}
                          </button>
                        );
                      })}
                    </div>
                  </GlassCard>
                </div>
              );
            })}
          </div>

          {/* Center Monitor (Interactive Focus Viewport) */}
          <div className={`w-full xl:w-[38%] flex-shrink-0 transition-all duration-1000 delay-500 relative ${isInView ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}>
            {/* Massive Ambient Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[80%] bg-[#FF5A1F] opacity-10 blur-[120px] pointer-events-none" />
            
            <div className="relative w-full aspect-[4/5] lg:aspect-auto lg:h-full rounded-[2rem] bg-zinc-950/80 border border-white/10 overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex items-center justify-center p-3 lg:p-4 backdrop-blur-3xl">
              
              {/* Dynamic aspect ratio frame */}
              <div 
                className={`relative rounded-lg overflow-hidden border border-white/[0.06] transition-all duration-700 bg-[#0c0c0f] flex flex-col justify-between`}
                style={{
                  width: selectedRatio.includes("16:9") ? "100%" : selectedRatio.includes("9:16") || selectedRatio.includes("Shorts") ? "56%" : selectedRatio.includes("1:1") ? "75%" : "68%",
                  aspectRatio: selectedRatio.includes("16:9") ? "16/9" : selectedRatio.includes("9:16") || selectedRatio.includes("Shorts") ? "9/16" : selectedRatio.includes("1:1") ? "1/1" : "4/5",
                  maxHeight: "100%"
                }}
              >
                {/* Simulated rendering output background image */}
                <OptimizedImage
                  src={lightingImages[selectedLighting]}
                  alt={selectedLighting}
                  className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ease-in-out ${lightingFilters[selectedLighting]}`}
                />
                
                {/* Cinematic Neon tint for Cyber Neon theme */}
                {selectedLighting === "Cyber Neon" && (
                  <div className="absolute inset-0 bg-gradient-to-tr from-purple-900/30 via-transparent to-pink-500/20 mix-blend-color pointer-events-none" />
                )}

                {/* Grid Overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:12.5%_12.5%] pointer-events-none z-10" />
                
                {/* Center Crosshair */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none z-10">
                  <div className="w-10 h-px bg-white/20"></div>
                  <div className="absolute h-10 w-px bg-white/20"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-[#FF5A1F] absolute shadow-[0_0_8px_rgba(255,90,31,0.5)]"></div>
                </div>

                {/* Top HUD Line */}
                <div className="relative z-20 p-3 flex justify-between items-center text-[8px] font-mono font-bold tracking-widest text-white/50 bg-gradient-to-b from-black/40 to-transparent">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A1F] animate-ping" />
                    <span>REC // SIM_ACTIVE</span>
                  </div>
                  <span>{timecode}</span>
                </div>

                {/* Center Goal Mock Overlay */}
                <div className="relative z-10 flex-1 flex flex-col justify-between p-4">
                  {/* Goal Watermark or Stats */}
                  <div className="text-[8px] font-mono font-bold text-left">
                    {selectedGoal === "Sự Lan Tỏa" && (
                      <span className="px-2 py-0.5 rounded bg-orange-500/20 text-[#FF5A1F] border border-orange-500/30 shadow-[0_0_10px_rgba(255,90,31,0.2)] animate-pulse">
                        +48.6K VIEWS/H
                      </span>
                    )}
                    {selectedGoal === "Tăng Thương Hiệu" && (
                      <span className="text-white/40 uppercase tracking-widest">
                        // WAVISE PRO WATERMARK
                      </span>
                    )}
                  </div>

                  {/* Dynamic Subtitle overlay for Storytelling */}
                  <div className="text-center w-full">
                    {selectedGoal === "Kể Chuyện" ? (
                      <span className="text-[10px] font-medium text-white bg-zinc-950/60 px-2.5 py-1 rounded border border-white/5 backdrop-blur-sm shadow-md inline-block max-w-[90%] mx-auto">
                        "[Wavise Studio] Cuộc sáng tạo bắt đầu từ đây..."
                      </span>
                    ) : selectedGoal === "Chiến Dịch Ads" ? (
                      <button className="text-[9px] font-black tracking-wider text-white bg-[#FF5A1F] hover:bg-[#FF8A5B] px-3 py-1 rounded shadow-md border border-[#FF5A1F]/30 uppercase transition-all duration-300 animate-bounce">
                        Tìm hiểu ngay
                      </button>
                    ) : selectedGoal === "Giới Thiệu Sản Phẩm" ? (
                      <div className="border border-white/20 p-2 bg-zinc-950/40 backdrop-blur-md rounded max-w-[70%] mx-auto flex items-center gap-1.5 text-white/80">
                        <Sparkles className="w-3.5 h-3.5 text-[#FF5A1F] shrink-0" />
                        <span className="text-[8px] font-mono uppercase tracking-widest text-left leading-none block">
                          Focus: Product Spec v1.0
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Bottom HUD Specs */}
                <div className="relative z-20 p-3 flex justify-between items-end text-[8px] font-mono text-white/40 bg-gradient-to-t from-black/40 to-transparent">
                  <div className="flex flex-col gap-0.5 text-left">
                    <span>ISO 800 | F/2.8 | 24FPS</span>
                    <span className="uppercase text-[#FF5A1F]/70">L: {selectedLighting}</span>
                  </div>

                  {/* Selected format badge */}
                  <div className="px-2 py-0.5 rounded border border-[#FF5A1F]/30 bg-[#FF5A1F]/10 text-[8px] font-mono uppercase tracking-widest text-[#FF5A1F]/80">
                    {selectedAudio}
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex-1 flex flex-col gap-3">
            {controlsRight.map((ctrl, i) => {
              const Icon = ctrl.icon;
              return (
                <div
                  key={ctrl.title}
                  className={`flex-1 transition-all duration-700 ${isInView ? "opacity-100 translate-x-0" : "opacity-0 translate-x-12"}`}
                  style={{ transitionDelay: `${200 + i * 100}ms` }}
                >
                  <GlassCard className="p-4 h-full flex flex-col gap-3 bg-white/[0.01] border-white/[0.04] hover:border-white/[0.08] transition-all duration-500">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/[0.02] border border-white/[0.06]">
                        <Icon className="w-3.5 h-3.5 text-[#FF5A1F]" />
                      </div>
                      <span className="font-bold text-white text-xs tracking-widest uppercase">{ctrl.title}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {ctrl.items.map((item) => {
                        const isCurrent = ctrl.state === item;
                        return (
                          <button
                            key={item}
                            onClick={() => ctrl.setState(item)}
                            className={`text-[10px] font-semibold px-2.5 py-1 rounded-md border transition-all duration-300 cursor-pointer ${
                              isCurrent 
                                ? "border-[#FF5A1F]/30 text-white bg-[#FF5A1F]/10" 
                                : "border-white/[0.04] text-slate-500 hover:border-white/[0.15] hover:text-white"
                            }`}
                          >
                            {item}
                          </button>
                        );
                      })}
                    </div>
                  </GlassCard>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </section>
  );
}
