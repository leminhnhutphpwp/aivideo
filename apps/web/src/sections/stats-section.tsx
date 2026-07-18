"use client";

import React, { useState, useEffect } from "react";
import { CountUp } from "@/components/landing/ui/count-up";
import { useInView } from "@/hooks/use-in-view";
import { useLandingSettings } from "@/hooks/use-landing-settings";
import { GlassCard } from "@/components/landing/ui/glass-card";
import { TrendingUp, Users, Cpu, Target, Radio, Activity } from "lucide-react";

const statsData = [
  { 
    id: "reach",
    target: 10, 
    suffix: "M+", 
    label: "Lượt xem tiếp cận",
    desc: "Tổng số lượt tiếp cận tự nhiên trên các nền tảng mạng xã hội lớn thông qua video ngắn AI.",
    icon: Users,
    detail: "Khả năng tiếp cận tệp khách hàng mục tiêu tăng trưởng vượt bậc thông qua thuật toán phân phối nội dung thông minh."
  },
  { 
    id: "growth",
    target: 150, 
    suffix: "%+", 
    label: "Tăng trưởng Social",
    desc: "Tỷ lệ tăng trưởng số lượng người theo dõi và tương tác tự nhiên trung bình hàng tháng.",
    icon: TrendingUp,
    detail: "Tối ưu hóa khả năng tương tác (Engagement) thông qua phong cách kịch bản và hiệu ứng thu hút hiện đại."
  },
  {
    id: "models",
    target: 100,
    suffix: "%",
    label: "Tự động hoá",
    desc: "Engine video Qwen/Wan cùng mô hình ảnh & giọng đọc AI — hệ thống tự chọn model tối ưu cho từng tác vụ.",
    icon: Cpu,
    detail: "Bạn không cần chọn thủ công: nền tảng tự động điều phối engine video Qwen/Wan và các mô hình ảnh, giọng nói AI để cho kết quả tốt nhất cho mỗi nhu cầu."
  },
  { 
    id: "conversion",
    target: 98, 
    suffix: "%", 
    label: "Tỷ lệ chuyển đổi Ads",
    desc: "Tỷ lệ giữ chân người xem ở 3 giây đầu và hoàn thành chuyển đổi mục tiêu chiến dịch quảng cáo.",
    icon: Target,
    detail: "Video được thiết kế cấu trúc thu hút (Hook) mạnh mẽ giúp giảm tối đa chi phí quảng cáo (CPM/CAC) và nâng cao ROI."
  },
];

export function StatsSection({ hideText }: { hideText?: boolean }) {
  const ls = useLandingSettings();
  const [ref, isInView] = useInView<HTMLDivElement>({ threshold: 0.15 });
  const [activeStat, setActiveStat] = useState("reach");
  const [livePulse, setLivePulse] = useState(0);

  // Simulated live computing pulse signal
  useEffect(() => {
    const interval = setInterval(() => {
      setLivePulse((prev) => (prev + 1) % 100);
    }, 150);
    return () => clearInterval(interval);
  }, []);

  return (
    <section
      ref={ref}
      id="stats"
      className="relative w-full min-h-[100dvh] lg:min-h-screen overflow-hidden flex flex-col pt-20 lg:pt-24 pb-8 lg:pb-12 bg-[#050508]"
    >
      {/* Top/bottom gradient fades */}
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black to-transparent pointer-events-none z-10" />
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black to-transparent pointer-events-none z-10" />

      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full blur-[130px] opacity-15 bg-[#FF5A1F] pointer-events-none" />

      <div className="relative max-w-[1440px] mx-auto px-6 md:px-12 lg:px-20 z-10 flex flex-col flex-1 w-full">
        
        {/* Section Title — compact */}
        <div className={`mb-8 lg:mb-6 transition-all duration-1000 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF5A1F]/10 border border-[#FF5A1F]/20 text-[#FF5A1F] text-xs font-mono tracking-widest uppercase mb-3">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            {ls.stats_label}
          </div>
          <h2 className="font-[family-name:var(--font-display)] font-bold text-white tracking-tight" style={{ fontSize: "clamp(24px, 3.5vw, 44px)" }}>
            {ls.stats_title_line1}
            <span className="text-gradient-ember"> {ls.stats_title_line2}</span>
          </h2>
        </div>

        {/* Layout */}
        <div className="grid lg:grid-cols-12 gap-6 lg:gap-6 flex-1 pb-6 lg:pb-8">
          
          {/* Left Side: Stats Grid (Selectable Modules) */}
          <div className="lg:col-span-6 grid grid-cols-2 md:grid-cols-2 gap-3 lg:gap-4 min-h-0">
            {statsData.map((stat, i) => {
              const Icon = stat.icon;
              const isActive = activeStat === stat.id;
              return (
                <div
                  key={stat.id}
                  onClick={() => setActiveStat(stat.id)}
                  className={`cursor-pointer transition-all duration-500 h-full ${
                    isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                  }`}
                  style={{ transitionDelay: `${i * 100}ms` }}
                >
                  <GlassCard 
                    className={`p-4 h-full flex flex-col justify-between transition-all duration-500 border ${
                      isActive 
                        ? "bg-[#FF5A1F]/[0.02] border-[#FF5A1F]/30 shadow-[0_0_20px_rgba(255,90,31,0.1)]" 
                        : "bg-white/[0.01] border-white/[0.04] hover:border-white/[0.1] hover:bg-white/[0.02]"
                    }`}
                  >
                    <div>
                      {/* Icon & Label */}
                      <div className="flex items-center justify-between mb-2 lg:mb-4">
                        <div className={`w-7 h-7 lg:w-9 lg:h-9 rounded-lg flex items-center justify-center transition-all ${
                          isActive ? "bg-[#FF5A1F]/15 text-[#FF5A1F]" : "bg-white/5 text-slate-400"
                        }`}>
                          <Icon className="w-3.5 h-3.5 lg:w-4.5 lg:h-4.5" />
                        </div>
                        <span className={`hidden lg:block text-[9px] font-mono font-bold tracking-widest ${
                          isActive ? "text-[#FF5A1F]" : "text-white/20"
                        }`}>
                          {isActive ? "ACTIVE" : "STANDBY"}
                        </span>
                      </div>

                      {/* Animated Stat Value */}
                      <div className="mb-1 lg:mb-2 text-xl lg:text-3xl">
                        <CountUp
                          target={stat.target}
                          suffix={stat.suffix}
                          label=""
                          duration={2000}
                        />
                      </div>

                      {/* Stat Label */}
                      <h3 className={`text-xs lg:text-sm font-bold transition-colors mb-1 lg:mb-2 ${
                        isActive ? "text-white" : "text-slate-300"
                      }`}>
                        {stat.label}
                      </h3>

                      {/* Description */}
                      <p className="hidden md:block text-[10px] lg:text-xs text-slate-500 leading-relaxed font-normal">
                        {stat.desc}
                      </p>
                    </div>

                    {/* Active highlight bar */}
                    <div className="mt-4 pt-4 border-t border-white/[0.04] flex items-center justify-between">
                      <span className="text-[9px] font-mono text-white/30">MODULE_0{i+1}</span>
                      {isActive && (
                        <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#FF5A1F] animate-ping" />
                          <div className="w-1.5 h-1.5 rounded-full bg-[#FF5A1F]" />
                        </div>
                      )}
                    </div>
                  </GlassCard>
                </div>
              );
            })}
          </div>

          {/* Right Side: Telemetry Live Monitor Screen */}
          <div className={`lg:col-span-6 transition-all duration-1000 delay-300 h-full min-h-0 ${
            isInView ? "opacity-100 scale-100" : "opacity-0 scale-95"
          }`}>
            <div className="relative h-full rounded-2xl border border-white/10 bg-zinc-950 overflow-hidden shadow-md p-4 lg:p-5 flex flex-col justify-between">
              
              {/* Grid Background Overlay */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:24px_24px] opacity-30 pointer-events-none" />

              {/* Monitor Top Line */}
              <div className="relative z-10 flex justify-between items-center border-b border-white/5 pb-4 font-mono text-[9px] text-white/40">
                <div className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-[#FF5A1F] animate-pulse" />
                  <span className="font-bold uppercase tracking-widest text-[#FF5A1F]">SYSTEM DIAGNOSTIC</span>
                </div>
                <div className="flex items-center gap-3">
                  <span>SIG_STRENGTH: 99.4%</span>
                  <span>TIME: LIVE_SYS</span>
                </div>
              </div>

              {/* Monitor Main Visualizer Area */}
              <div className="relative z-10 flex-1 my-6 flex flex-col justify-center items-center">
                
                {/* 1. Reach graph visualizer */}
                {activeStat === "reach" && (
                  <div className="w-full h-full flex flex-col justify-between">
                    <div className="flex-1 w-full flex items-end justify-between px-4 relative">
                      {/* Grid lines inside visualization */}
                      <div className="absolute inset-0 flex flex-col justify-between opacity-10 pointer-events-none">
                        <div className="w-full h-px bg-white" />
                        <div className="w-full h-px bg-white" />
                        <div className="w-full h-px bg-white" />
                      </div>

                      {/* SVG Line Graph */}
                      <svg className="absolute inset-0 w-full h-full p-2" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="reachGlow" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#FF5A1F" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#FF5A1F" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        {/* Area */}
                        <path d="M 0,100 Q 15,90 30,75 T 60,35 T 90,5 T 100,5 L 100,100 Z" fill="url(#reachGlow)" />
                        {/* Stroke */}
                        <path d="M 0,100 Q 15,90 30,75 T 60,35 T 90,5 T 100,5" fill="none" stroke="#FF5A1F" strokeWidth="2.5" strokeDasharray="300" strokeDashoffset="0" className="animate-[dash_3s_ease-out_infinite]" />
                      </svg>

                      {/* Floating Indicator Node */}
                      <div className="absolute top-[5%] right-[10%] flex flex-col items-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#FF5A1F] animate-ping" />
                        <div className="w-1.5 h-1.5 rounded-full bg-[#FF5A1F]" />
                      </div>
                    </div>

                    <div className="mt-4 flex justify-between text-[8px] font-mono text-slate-500 border-t border-white/5 pt-2">
                      <span>MON</span>
                      <span>WED</span>
                      <span>FRI</span>
                      <span>SUN (PEAK: 10M+)</span>
                    </div>
                  </div>
                )}

                {/* 2. Growth nested circles visualizer */}
                {activeStat === "growth" && (
                  <div className="relative w-44 h-44 flex items-center justify-center">
                    {/* Ring 1 */}
                    <div className="absolute inset-0 rounded-full border border-dashed border-[#FF5A1F]/30 animate-[spin-slow_12s_linear_infinite]" />
                    {/* Ring 2 */}
                    <div className="absolute inset-4 rounded-full border border-[#FF5A1F]/15 animate-[spin-slow_8s_linear_infinite_reverse]" />
                    {/* Ring 3 (Progress Fill) */}
                    <svg className="absolute inset-2 w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="4" />
                      <circle cx="50" cy="50" r="42" fill="none" stroke="#FF5A1F" strokeWidth="4" strokeDasharray="263" strokeDashoffset="65" strokeLinecap="round" className="animate-pulse" />
                    </svg>

                    <div className="absolute flex flex-col items-center">
                      <TrendingUp className="w-8 h-8 text-[#FF5A1F] mb-1 animate-bounce" />
                      <span className="font-mono text-lg font-bold text-white tracking-tighter">+150%</span>
                      <span className="text-[7px] font-mono text-slate-500">MOM_GROWTH</span>
                    </div>
                  </div>
                )}

                {/* 3. Model throughput visualizer */}
                {activeStat === "models" && (
                  <div className="w-full flex flex-col items-center gap-6">
                    {/* Throughput graphic */}
                    <div className="flex items-end justify-center gap-1.5 h-16 w-full max-w-sm px-6">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((idx) => {
                        const heights = [35, 65, 80, 50, 20, 45, 90, 75, 55, 30, 85, 60, 40, 70, 25];
                        return (
                          <div 
                            key={idx}
                            className="w-[3px] bg-[#FF5A1F] rounded-t transition-all duration-300"
                            style={{
                              height: `${heights[(idx + livePulse) % heights.length]}%`,
                              opacity: 0.3 + (idx % 3) * 0.25
                            }}
                          />
                        );
                      })}
                    </div>
                    
                    {/* Model Spec Card */}
                    <div className="border border-white/5 bg-zinc-950/40 backdrop-blur-md p-3.5 rounded-xl max-w-xs w-full flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-[#FF5A1F]/10 flex items-center justify-center shrink-0">
                        <Cpu className="w-4 h-4 text-[#FF5A1F]" />
                      </div>
                      <div className="text-left">
                        <span className="block text-[8px] font-mono text-slate-500 uppercase leading-none mb-0.5">Active Model</span>
                        <span className="block text-[10px] font-bold text-white">WAN_2.6 / QWEN_T2V</span>
                        <span className="block text-[8px] font-mono text-[#FF5A1F]/80">QUALITY_SCORE: 99.2%</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Target Ads Conversion Funnel */}
                {activeStat === "conversion" && (
                  <div className="w-full max-w-xs space-y-3">
                    {/* Funnel rows */}
                    <div className="w-full">
                      <div className="flex justify-between text-[8px] font-mono text-slate-500 mb-1">
                        <span>Lướt qua (Hook 3s)</span>
                        <span className="text-white/60">98% Retention</span>
                      </div>
                      <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <div className="h-full bg-gradient-to-r from-orange-600 to-[#FF5A1F] rounded-full w-[98%] shadow-[0_0_10px_rgba(255,90,31,0.3)] animate-pulse" />
                      </div>
                    </div>

                    <div className="w-full">
                      <div className="flex justify-between text-[8px] font-mono text-slate-500 mb-1">
                        <span>Click Link (CTR)</span>
                        <span className="text-[#FF5A1F]">18.4% (x3 Avg)</span>
                      </div>
                      <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <div className="h-full bg-[#FF5A1F] rounded-full w-[70%]" />
                      </div>
                    </div>

                    <div className="w-full">
                      <div className="flex justify-between text-[8px] font-mono text-slate-500 mb-1">
                        <span>Hoàn thành Purchase</span>
                        <span className="text-white/60">12.5% Conversion</span>
                      </div>
                      <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <div className="h-full bg-white/20 rounded-full w-[45%]" />
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Monitor Bottom Info Box */}
              <div className="relative z-10 border-t border-white/5 pt-4 text-left">
                <span className="block text-[8px] font-mono text-slate-500 uppercase leading-none mb-1">Detailed Telemetry Diagnostic</span>
                <p className="text-[10px] text-slate-400 leading-relaxed font-normal">
                  {statsData.find((s) => s.id === activeStat)?.detail}
                </p>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
