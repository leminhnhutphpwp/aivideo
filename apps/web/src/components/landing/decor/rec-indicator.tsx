"use client";

import React from "react";

export function RecIndicator() {
  return (
    <div className="fixed top-4 right-4 z-[95] flex items-center gap-2 pointer-events-none hidden md:flex">
      <div className="relative w-2.5 h-2.5">
        <div className="absolute inset-0 rounded-full bg-red-500 animate-[flicker_3s_infinite]" />
        <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-40" />
      </div>
      <span className="font-[family-name:var(--font-mono)] text-[10px] text-red-500/70 tracking-widest font-bold">
        REC
      </span>
    </div>
  );
}
