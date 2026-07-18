"use client";

import React from "react";

export function Vignette() {
  return (
    <div
      className="fixed inset-0 z-[85] pointer-events-none"
      style={{
        background:
          "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.5) 70%, rgba(0,0,0,0.92) 100%)",
      }}
    />
  );
}
