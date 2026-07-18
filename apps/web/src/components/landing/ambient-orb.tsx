"use client";

import React from "react";

interface AmbientOrbProps {
  className?: string;
  variant?: 1 | 2 | 3;
}

const variantStyles: Record<number, React.CSSProperties> = {
  1: {
    width: 600,
    height: 600,
    background:
      "radial-gradient(circle, rgba(255,90,31,0.45) 0%, transparent 70%)",
  },
  2: {
    width: 500,
    height: 500,
    background:
      "radial-gradient(circle, rgba(107,36,21,0.5) 0%, transparent 70%)",
  },
  3: {
    width: 400,
    height: 400,
    background:
      "radial-gradient(circle, rgba(255,138,91,0.3) 0%, transparent 70%)",
  },
};

const animationClasses: Record<number, string> = {
  1: "animate-orb-drift-1",
  2: "animate-orb-drift-2",
  3: "animate-orb-drift-3",
};

export function AmbientOrb({ className = "", variant = 1 }: AmbientOrbProps) {
  return (
    <div
      className={`absolute rounded-full blur-[120px] will-change-transform pointer-events-none ${animationClasses[variant]} ${className}`}
      style={variantStyles[variant]}
      aria-hidden="true"
    />
  );
}
