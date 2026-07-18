"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SectionLabel } from "@/components/landing/ui/section-label";
import { useInView } from "@/hooks/use-in-view";
import { useLandingSettings } from "@/hooks/use-landing-settings";
import { useAuth } from "@/hooks/use-auth";
import { Play, Zap } from "lucide-react";
import gsap from "gsap";

const styles = [
  {
    name: "Điện ảnh",
    tag: "Cinematic",
    img: "/images/landing/styles/forge-cinematic.webp",
    thumb: "/images/landing/styles/forge-cinematic.webp",
    desc: "Độ sâu trường ảnh nông, chuyển động máy quay có chủ đích, ánh sáng kịch tính. Dành cho trailer, phim thương hiệu và kể chuyện.",
    accent: "#FF5A1F",
    filter: "brightness(0.65) contrast(1.1) saturate(0.9)",
    colorLayer: "rgba(180,60,0,0.15)",
  },
  {
    name: "Quảng cáo",
    tag: "Social Ad",
    img: "/images/landing/styles/forge-social-ad.webp",
    thumb: "/images/landing/styles/forge-social-ad.webp",
    desc: "Nội dung dọc nhanh, màu sắc đậm, cắt cảnh nhanh. Tối ưu cho TikTok, Instagram Reels, YouTube Shorts.",
    accent: "#A855F7",
    filter: "brightness(0.65) saturate(1.3)",
    colorLayer: "rgba(100,30,160,0.2)",
  },
  {
    name: "Ẩm thực",
    tag: "Food",
    img: "/images/landing/styles/forge-food.webp",
    thumb: "/images/landing/styles/forge-food.webp",
    desc: "Cận cảnh món ăn hấp dẫn, màu sắc ấm áp, ánh sáng tự nhiên. Dành cho review ẩm thực và content food.",
    accent: "#10B981",
    filter: "brightness(0.65) saturate(1.2) hue-rotate(-15deg)",
    colorLayer: "rgba(10,100,60,0.2)",
  },
  {
    name: "Du lịch",
    tag: "Travel",
    img: "/images/landing/styles/forge-travel.webp",
    thumb: "/images/landing/styles/forge-travel.webp",
    desc: "Không gian rộng, màu sắc rực rỡ, máy quay mượt. Dành cho travel vlog và content khám phá.",
    accent: "#06B6D4",
    filter: "brightness(0.65) saturate(1.5) hue-rotate(10deg)",
    colorLayer: "rgba(6,100,160,0.2)",
  },
  {
    name: "Sản phẩm",
    tag: "Product Reveal",
    img: "/images/landing/styles/forge-product.webp",
    thumb: "/images/landing/styles/forge-product.webp",
    desc: "Trưng bày sản phẩm sạch sẽ, ánh sáng studio, nền tối giản. Dành cho ra mắt sản phẩm và unboxing.",
    accent: "#F59E0B",
    filter: "brightness(0.65) saturate(0.7)",
    colorLayer: "rgba(150,90,0,0.15)",
  },
  {
    name: "Làm đẹp",
    tag: "Beauty",
    img: "/images/landing/styles/forge-beauty.webp",
    thumb: "/images/landing/styles/forge-beauty.webp",
    desc: "Cận cảnh chân dung, ánh sáng studio mềm. Dành cho beauty vlog, review mỹ phẩm và thời trang.",
    accent: "#EC4899",
    filter: "brightness(0.65) saturate(1.1)",
    colorLayer: "rgba(160,20,80,0.15)",
  },
  {
    name: "Sự kiện",
    tag: "Event",
    img: "/images/landing/styles/forge-event.webp",
    thumb: "/images/landing/styles/forge-event.webp",
    desc: "Quay sự kiện ấm áp, sang trọng. Chuyển động máy quay chậm, mượt mà. Dành cho đám cưới, tiệc, sự kiện doanh nghiệp.",
    accent: "#F59E0B",
    filter: "brightness(0.65) saturate(0.8) sepia(0.15)",
    colorLayer: "rgba(180,120,20,0.15)",
  },
  {
    name: "Giải thích",
    tag: "Explainer",
    img: "/images/landing/styles/forge-explainer.webp",
    thumb: "/images/landing/styles/forge-explainer.webp",
    desc: "Nội dung giáo dục rõ ràng, bố cục sạch sẽ. Dành cho hướng dẫn, video how-to, nội dung giáo dục.",
    accent: "#06B6D4",
    filter: "brightness(0.65) saturate(0.8)",
    colorLayer: "rgba(0,100,140,0.15)",
  },
  {
    name: "Đồ hoạ",
    tag: "Motion Graphics",
    img: "/images/landing/styles/forge-motion-graphics.webp",
    thumb: "/images/landing/styles/forge-motion-graphics.webp",
    desc: "Hoạt hình trừu tượng, thiết kế hiện đại. Hình khối hình học, typography động. Dành cho intro thương hiệu, visualizer.",
    accent: "#8B5CF6",
    filter: "brightness(0.65) saturate(1.3)",
    colorLayer: "rgba(80,20,160,0.2)",
  },
  {
    name: "Đánh giá",
    tag: "Review",
    img: "/images/landing/styles/forge-review.webp",
    thumb: "/images/landing/styles/forge-review.webp",
    desc: "Phong cách chân thực, gần gũi. Máy quay handheld nhẹ, ánh sáng tự nhiên. Dành cho review, unboxing, trải nghiệm.",
    accent: "#10B981",
    filter: "brightness(0.65) saturate(0.9)",
    colorLayer: "rgba(10,100,40,0.15)",
  },
  {
    name: "UGC",
    tag: "Testimonial",
    img: "/images/landing/styles/forge-ugc.webp",
    thumb: "/images/landing/styles/forge-ugc.webp",
    desc: "Testimonial chân thực, cảm giác authentic, tạo niềm tin. Người xem tin content thật hơn quảng cáo trau chuốt.",
    accent: "#EC4899",
    filter: "brightness(0.65) saturate(0.85)",
    colorLayer: "rgba(160,20,80,0.12)",
  },
  {
    name: "Video ngắn",
    tag: "Vertical Short",
    img: "/images/landing/styles/forge-vertical-short.webp",
    thumb: "/images/landing/styles/forge-vertical-short.webp",
    desc: "Video dọc ngắn cho TikTok, Reels, Shorts. Tốc độ nhanh, hook 3s đầu, visual trending. Tối ưu cho nội dung viral.",
    accent: "#FF5A1F",
    filter: "brightness(0.65) saturate(1.1)",
    colorLayer: "rgba(180,60,0,0.15)",
  },
];

export function ForgeSection({ hideText }: { hideText?: boolean }) {
  const ls = useLandingSettings();
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const [ref, isInView] = useInView<HTMLDivElement>({ threshold: 0.05 });
  const [activeIdx, setActiveIdx] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  const active = styles[activeIdx];

  const switchStyle = (idx: number) => {
    if (idx === activeIdx || transitioning) return;
    setTransitioning(true);
    gsap.to("#forge-bg-img", { opacity: 0, scale: 1.04, duration: 0.35, ease: "power2.in", onComplete: () => {
      setActiveIdx(idx);
      setTransitioning(false);
    }});
  };

  useEffect(() => {
    if (!transitioning) {
      gsap.fromTo("#forge-bg-img", { opacity: 0, scale: 1.04 }, { opacity: 1, scale: 1, duration: 0.6, ease: "power2.out" });
    }
  }, [activeIdx, transitioning]);

  // GSAP entrance animation on entering view
  useEffect(() => {
    if (!isInView) return;
    gsap.fromTo("#forge-title", { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" });
    gsap.fromTo("#forge-desc", { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, delay: 0.15, ease: "power3.out" });
    gsap.fromTo(".forge-thumb", { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.07, delay: 0.2, ease: "power2.out" });
  }, [isInView]);

  return (
    <section
      id="forge"
      ref={ref}
      className="relative w-full lg:min-h-screen overflow-hidden bg-zinc-950"
    >
      {/* === FULLSCREEN BACKGROUND === */}
      <img
        id="forge-bg-img"
        src={active.img}
        alt={active.name}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ filter: active.filter }}
      />
      {/* Color tint layer */}
      <div className="absolute inset-0 transition-colors duration-700" style={{ backgroundColor: active.colorLayer }} />
      {/* Gradient layers */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />

      {/* === CONTENT OVERLAY === */}
      <div className="relative z-10 lg:min-h-screen flex flex-col justify-between px-5 md:px-12 lg:px-16 py-24 lg:py-0 lg:pt-16 lg:pb-10 max-w-[1440px] mx-auto w-full">

        {/* TOP: Label + Title + Description */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pt-4 lg:pt-8">
          <div>
            <SectionLabel className="mb-3 opacity-80">{ls.forge_label}</SectionLabel>
            <h2
              id="forge-title"
              className="font-[family-name:var(--font-display)] font-black text-white leading-[1.0] tracking-tight"
              style={{ fontSize: "clamp(32px, 5.5vw, 72px)" }}
            >
              {active.name}
            </h2>
          </div>

          {/* Active style info */}
          <div id="forge-desc" className="text-left lg:text-right lg:max-w-sm mt-2 lg:mt-0">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2 transition-colors duration-500" style={{ color: active.accent }}>
              {active.tag}
            </div>
            <p className="text-white/70 text-sm leading-relaxed">
              {active.desc}
            </p>
            <button
              onClick={() => router.push(isLoggedIn ? "/studio" : "/login")}
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs border transition-all duration-300 hover:scale-105 hover:shadow-sm cursor-pointer"
              style={{ borderColor: `${active.accent}60`, color: active.accent, backgroundColor: `${active.accent}15`, boxShadow: `0 0 20px ${active.accent}20` }}
            >
              <Zap className="w-3.5 h-3.5" />
              {ls.forge_cta_text}
            </button>
          </div>
        </div>

        {/* CENTER SPACER — desktop only */}
        <div className="hidden lg:block flex-1" />

        {/* BOTTOM: Thumbnail strip */}
        <div className="flex flex-col gap-4">
          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <span className="text-white/30 text-[10px] font-mono tracking-widest">
              {String(activeIdx + 1).padStart(2, "0")} / {String(styles.length).padStart(2, "0")}
            </span>
            <div className="flex-1 h-px bg-white/10 relative">
              <div
                className="absolute left-0 top-0 h-full transition-all duration-500"
                style={{ width: `${((activeIdx + 1) / styles.length) * 100}%`, backgroundColor: active.accent }}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: active.accent }} />
              <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest">AI STYLE</span>
            </div>
          </div>

          {/* Thumbnail cards */}
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {styles.map((style, idx) => {
              const isActive = activeIdx === idx;
              return (
                <button
                  key={style.name}
                  onClick={() => switchStyle(idx)}
                  className={`forge-thumb flex-shrink-0 relative rounded-xl overflow-hidden transition-all duration-400 group ${
                    isActive ? "ring-2 scale-[1.03]" : "opacity-50 hover:opacity-80 hover:scale-[1.01]"
                  }`}
                  style={{
                    width: isActive ? "160px" : "130px",
                    height: "90px",
                    outline: isActive ? `2px solid ${style.accent}` : "2px solid transparent",
                    outlineOffset: "2px",
                  }}
                >
                  <img
                    src={style.thumb}
                    alt={style.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    style={{ filter: isActive ? "brightness(0.8)" : "brightness(0.55)" }}
                  />
                  {/* Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />

                  {/* Label */}
                  <div className="absolute bottom-2 left-3 right-2">
                    {isActive && (
                      <div className="text-[8px] font-bold uppercase tracking-widest mb-0.5 transition-colors" style={{ color: style.accent }}>
                        {style.tag}
                      </div>
                    )}
                    <div className={`font-bold text-xs transition-colors ${isActive ? "text-white" : "text-white/60"}`}>
                      {style.name}
                    </div>
                  </div>

                  {/* Active play icon */}
                  {isActive && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: style.accent }}>
                      <Play className="w-2.5 h-2.5 text-white fill-white ml-0.5" />
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
