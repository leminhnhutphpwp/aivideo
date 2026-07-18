"use client";

import React from "react";

export function LensFlare({ className = "" }: { className?: string }) {
  return (
    <div
      className={`absolute pointer-events-none ${className}`}
      style={{
        width: 300,
        height: 300,
        background:
          "radial-gradient(circle, rgba(255,179,71,0.15) 0%, rgba(255,90,31,0.08) 30%, transparent 70%)",
        filter: "blur(40px)",
        animation: "float 10s ease-in-out infinite",
      }}
    />
  );
}
