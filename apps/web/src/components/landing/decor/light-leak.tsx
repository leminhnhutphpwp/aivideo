"use client";

import React from "react";

export function LightLeak() {
  return (
    <div
      className="fixed inset-0 z-[87] pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      <div
        className="absolute top-0 left-0 w-[200%] h-full opacity-[0.07]"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,90,31,0.4) 20%, rgba(255,179,71,0.3) 40%, rgba(255,90,31,0.4) 60%, transparent 100%)",
          animation: "drift 20s linear infinite",
          filter: "blur(40px)",
        }}
      />
    </div>
  );
}
