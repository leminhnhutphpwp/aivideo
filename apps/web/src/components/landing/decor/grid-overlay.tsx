"use client";

import React from "react";

export function GridOverlay() {
  return (
    <div
      className="fixed inset-0 z-[80] pointer-events-none opacity-20 hidden lg:block"
      style={{
        backgroundImage:
          "linear-gradient(rgba(0,213,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,213,255,0.03) 1px, transparent 1px)",
        backgroundSize: "80px 80px",
      }}
    />
  );
}
