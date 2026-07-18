"use client";

import React from "react";

export function ScanLines() {
  return (
    <div
      className="fixed inset-0 z-[88] pointer-events-none opacity-40"
      style={{
        backgroundImage:
          "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.015) 2px, rgba(255,255,255,0.015) 4px)",
        backgroundSize: "100% 4px",
      }}
    />
  );
}
