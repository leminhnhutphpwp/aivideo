"use client";

import React, { useState } from "react";
import { SectionLabel } from "@/components/landing/ui/section-label";
import { useInView } from "@/hooks/use-in-view";
import { useLandingSettings } from "@/hooks/use-landing-settings";
import { OptimizedImage } from "@/components/ui/optimized-image";

const STYLES = ["Tất cả", "Cinematic", "Anime", "Cyberpunk", "Fantasy", "Minimalist"];

const galleryItems = [
  { src: "/images/landing/cinematic-dark.webp", title: "Video chuyên nghiệp", style: "Premium", wide: true },
  { src: "/images/landing/anime-scene.webp", title: "MV Anime", style: "Anime", wide: false },
  { src: "/images/landing/cyberpunk-city.webp", title: "Cyberpunk City", style: "Cyberpunk", wide: false },
  { src: "/images/landing/abstract-gradient.webp", title: "Abstract Motion", style: "Minimalist", wide: false },
  { src: "/images/landing/fantasy-realm.webp", title: "Fantasy Realm", style: "Fantasy", wide: false },
  { src: "/images/landing/oil-painting.webp", title: "Oil Painting", style: "Minimalist", wide: false },
  { src: "/images/landing/product-3d.webp", title: "Product Showcase", style: "Premium", wide: true },
  { src: "/images/landing/watercolor-art.webp", title: "Watercolor Dream", style: "Fantasy", wide: false },
  { src: "/images/landing/vintage-film.webp", title: "Vintage Memory", style: "Premium", wide: false },
];

export function GallerySection({ hideText }: { hideText?: boolean }) {
  const ls = useLandingSettings();
  const [ref, isInView] = useInView<HTMLDivElement>({ threshold: 0.05 });
  const [activeStyle, setActiveStyle] = useState("Tất cả");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Filter and limit to exactly 6 items for perfect layout
  const filtered = galleryItems
    .filter(item => activeStyle === "Tất cả" || item.style === activeStyle)
    .slice(0, 6);

  // Always fill 6 slots
  const displayItems = filtered.length >= 6
    ? filtered.slice(0, 6)
    : [...filtered, ...galleryItems.filter(i => !filtered.includes(i))].slice(0, 6);

  return (
    <section
      id="gallery"
      ref={ref}
      className="relative w-full min-h-[100dvh] lg:min-h-screen overflow-hidden flex flex-col pt-20 lg:pt-24 pb-8 lg:pb-12 bg-[#050508]"
    >
      {/* Ambient top glow */}
      <div className="pointer-events-none absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#FF5A1F]/50 to-transparent opacity-50" />
      <div className="pointer-events-none absolute top-0 left-1/3 w-[800px] h-[400px] -translate-x-1/2 opacity-[0.08] blur-[150px] rounded-full bg-[#FF5A1F]" />

      <div className="relative z-10 max-w-[1440px] mx-auto px-6 md:px-12 lg:px-16 w-full flex flex-col flex-1 min-h-0 gap-6 lg:gap-6">
        
        {/* Header Row */}
        <div className={`flex flex-col lg:flex-row lg:items-end justify-between gap-4 transition-all duration-1000 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <div>
            <SectionLabel className="mb-3">{ls.gallery_label}</SectionLabel>
            <h2 className="font-[family-name:var(--font-display)] font-bold text-white leading-[1.05] tracking-tight" style={{ fontSize: "clamp(26px, 3.5vw, 48px)" }}>
              {ls.gallery_title_line1}
              <span className="text-gradient-ember whitespace-nowrap">{ls.gallery_title_line2}</span>
            </h2>
          </div>

          {/* Style Filter Pills */}
          <div className="flex gap-2 flex-wrap">
            {STYLES.map((style) => (
              <button
                key={style}
                onClick={() => setActiveStyle(style)}
                className={`whitespace-nowrap px-5 py-2 rounded-full text-[10px] lg:text-xs font-bold tracking-widest uppercase transition-all duration-300 backdrop-blur-md ${
                  activeStyle === style
                    ? "bg-[#FF5A1F] text-white shadow-[0_0_30px_rgba(255,90,31,0.4)] border border-[#FF5A1F]/50 scale-105"
                    : "bg-white/5 border border-white/10 text-slate-400 hover:border-white/30 hover:bg-white/10 hover:text-white"
                }`}
              >
                {style}
              </button>
            ))}
          </div>
        </div>

        {/* Gallery Grid — 2 columns on mobile, 3 columns on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-3 grid-rows-3 lg:grid-rows-2 gap-3 lg:gap-4 flex-1 min-h-0">
          {displayItems.map((item, i) => (
            <div
              key={`${activeStyle}-${i}`}
              className={`group relative overflow-hidden rounded-2xl border cursor-pointer transition-all duration-500 ${
                isInView ? "opacity-100 scale-100" : "opacity-0 scale-95"
              } ${hoveredIdx === i ? "border-[#FF5A1F]/40 shadow-[0_0_30px_rgba(255,90,31,0.15)]" : "border-white/[0.06]"}`}
              style={{ transitionDelay: `${i * 60}ms` }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Image */}
              <OptimizedImage
                src={item.src}
                alt={item.title}
                className={`w-full h-full object-cover transition-all duration-700 ${hoveredIdx === i ? "scale-110 brightness-50" : "scale-100 brightness-75"}`}
              />

              {/* Style tag - always visible */}
              <div className="absolute top-3 left-3">
                <span className="px-2 py-0.5 rounded-full bg-zinc-950/60 backdrop-blur-md border border-white/10 text-[9px] font-bold text-white/70 uppercase tracking-widest">
                  {item.style}
                </span>
              </div>

              {/* Hover overlay */}
              <div className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent transition-opacity duration-500 ${hoveredIdx === i ? "opacity-100" : "opacity-0"}`}>
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#FF5A1F] animate-pulse" />
                    <span className="text-[#FF5A1F] text-[9px] font-black uppercase tracking-widest">{item.style}</span>
                  </div>
                  <h3 className="text-white font-bold text-sm">{item.title}</h3>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-px flex-1 bg-gradient-to-r from-[#FF5A1F]/50 to-transparent" />
                    <span className="text-[9px] font-mono text-slate-500">AI GENERATED</span>
                  </div>
                </div>
              </div>

              {/* Corner accent on hover */}
              <div className={`absolute top-0 right-0 w-8 h-8 transition-opacity duration-300 ${hoveredIdx === i ? "opacity-100" : "opacity-0"}`}>
                <div className="absolute top-0 right-0 w-full h-[2px] bg-[#FF5A1F]" />
                <div className="absolute top-0 right-0 w-[2px] h-full bg-[#FF5A1F]" />
              </div>
            </div>
          ))}
        </div>

        {/* Bottom count */}
        <div className={`flex items-center justify-between transition-all duration-1000 delay-500 ${isInView ? "opacity-100" : "opacity-0"}`}>
          <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest">
            {activeStyle === "Tất cả" ? `${galleryItems.length} phong cách` : `${galleryItems.filter(i => i.style === activeStyle).length} tác phẩm`} — AI Generated
          </span>
          <div className="flex gap-1">
            {[0,1,2].map(i => (
              <div key={i} className="w-8 h-0.5 rounded-full bg-white/10" />
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
