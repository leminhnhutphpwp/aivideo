"use client";

import React, { useState, useEffect } from "react";
import { useInView } from "@/hooks/use-in-view";

interface ImageRevealProps {
  src: string;
  alt: string;
  className?: string;
  aspectRatio?: string;
}

export function ImageReveal({ src, alt, className = "", aspectRatio = "16/9" }: ImageRevealProps) {
  const [ref, isInView] = useInView<HTMLDivElement>({ threshold: 0.15 });
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      ref={ref}
      className={`overflow-hidden rounded-xl ${className}`}
      style={{ aspectRatio }}
    >
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        className={`w-full h-full object-cover transition-all duration-1000 ${
          isInView && loaded
            ? "scale-100 grayscale-0"
            : "scale-110 grayscale-[0.4]"
        }`}
      />
    </div>
  );
}
