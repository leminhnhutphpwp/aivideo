"use client";

import React from "react";
import { SectionLabel } from "@/components/landing/ui/section-label";
import { Play } from "lucide-react";
import { useLandingSettings } from "@/hooks/use-landing-settings";
import { OptimizedImage } from "@/components/ui/optimized-image";

const reelItems = [
  { id: 1, title: "Video quảng cáo", style: "Cinematic", img: "/images/landing/cinematic-dark.webp" },
  { id: 2, title: "MV Anime", style: "Anime", img: "/images/landing/anime-scene.webp" },
  { id: 3, title: "Giới thiệu sản phẩm", style: "Realistic", img: "/images/landing/product-3d.webp" },
  { id: 4, title: "Fantasy World", style: "Fantasy", img: "/images/landing/fantasy-realm.webp" },
  { id: 5, title: "Neon Nights", style: "Cyberpunk", img: "/images/landing/cyberpunk-night.webp" },
  { id: 6, title: "Phong cách tối giản", style: "Minimalist", img: "/images/landing/vintage-film.webp" },
  { id: 7, title: "Chân dung", style: "Realistic", img: "/images/landing/portrait-realistic.webp" },
  { id: 8, title: "Abstract Motion", style: "Minimalist", img: "/images/landing/abstract-minimalist.webp" },
  { id: 9, title: "Nghệ thuật số", style: "Fantasy", img: "/images/landing/oil-painting.webp" },
  { id: 10, title: "Concept Art", style: "Anime", img: "/images/landing/watercolor-art.webp" },
  { id: 11, title: "Ẩm thực", style: "Realistic", img: "/images/landing/food-cooking.webp" },
  { id: 12, title: "Du lịch", style: "Cinematic", img: "/images/landing/travel-scene.webp" },
];

export function ReelSection({ hideText }: { hideText?: boolean }) {
  const ls = useLandingSettings();
  // Demote to a div when the SEO shell already renders the canonical <h2>.
  const HeadingTag = hideText ? "div" : "h2";
  return (
    <section id="reel" className="relative w-full min-h-[80vh] lg:min-h-screen py-24 lg:py-0 flex flex-col justify-center overflow-hidden bg-[#050508]">
      <div className="px-6 md:px-12 lg:px-16 mb-10">
        <SectionLabel className="mb-3">{ls.reel_label}</SectionLabel>
        <HeadingTag className="font-[family-name:var(--font-display)] font-bold text-white tracking-tight" style={{ fontSize: "clamp(24px, 3.5vw, 44px)" }}>
          {ls.reel_title_line1}
          <span className="text-gradient-ember"> {ls.reel_title_line2}</span>
        </HeadingTag>
      </div>

      {/* Gallery 2 hàng chạy đổi lập */}
      <div className="relative w-full overflow-hidden">
        {/* Hàng 1 - Chạy sang phải */}
        <div className="flex mb-4 animate-marquee-right">
          {[...reelItems, ...reelItems, ...reelItems].map((item, idx) => (
            <div
              key={`row1-${item.id}-${idx}`}
              className="flex-shrink-0 w-56 md:w-72 mx-3 group cursor-pointer"
            >
              <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/5 transition-all duration-500 hover:scale-105 hover:border-[#FF5A1F]/30">
                <OptimizedImage
                  src={item.img}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                
                {/* Play overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
                    <Play className="w-6 h-6 text-white fill-white ml-1" />
                  </div>
                </div>

                {/* Info */}
                <div className="absolute bottom-4 left-4">
                  <div className="text-[10px] font-bold text-[#FF8A5B] uppercase tracking-widest mb-1">
                    {item.style}
                  </div>
                  <div className="text-base font-bold text-white">{item.title}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Hàng 2 - Chạy sang trái */}
        <div className="flex animate-marquee-left">
          {[...reelItems.slice().reverse(), ...reelItems.slice().reverse(), ...reelItems.slice().reverse()].map((item, idx) => (
            <div
              key={`row2-${item.id}-${idx}`}
              className="flex-shrink-0 w-56 md:w-72 mx-3 group cursor-pointer"
            >
              <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/5 transition-all duration-500 hover:scale-105 hover:border-[#FF5A1F]/30">
                <OptimizedImage
                  src={item.img}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                
                {/* Play overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
                    <Play className="w-6 h-6 text-white fill-white ml-1" />
                  </div>
                </div>

                {/* Info */}
                <div className="absolute bottom-4 left-4">
                  <div className="text-[10px] font-bold text-[#FF8A5B] uppercase tracking-widest mb-1">
                    {item.style}
                  </div>
                  <div className="text-base font-bold text-white">{item.title}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}