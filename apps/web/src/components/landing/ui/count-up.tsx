"use client";

import React from "react";
import { useCountUp } from "@/hooks/use-count-up";
import { useInView } from "@/hooks/use-in-view";

interface CountUpProps {
  target: number;
  suffix?: string;
  label: string;
  duration?: number;
}

export function CountUp({ target, suffix = "", label, duration = 2500 }: CountUpProps) {
  const [ref, isInView] = useInView<HTMLDivElement>({ threshold: 0.5 });
  const count = useCountUp(target, duration, isInView);

  return (
    <div ref={ref} className="text-center">
      <div className="font-[family-name:var(--font-display)] text-5xl md:text-6xl lg:text-7xl font-black text-gradient-ember mb-2">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="text-sm text-slate-500 font-medium tracking-wide">
        {label}
      </div>
    </div>
  );
}
