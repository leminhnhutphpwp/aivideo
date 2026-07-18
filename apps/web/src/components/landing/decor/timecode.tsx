"use client";

import React, { useState, useEffect } from "react";

export function Timecode() {
  const [time, setTime] = useState("00:00:00:00");

  useEffect(() => {
    let frame = 0;
    const interval = setInterval(() => {
      frame++;
      const totalSeconds = Math.floor(frame / 24);
      const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
      const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
      const seconds = String(totalSeconds % 60).padStart(2, "0");
      const frames = String(frame % 24).padStart(2, "0");
      setTime(`${hours}:${minutes}:${seconds}:${frames}`);
    }, 1000 / 24);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed top-4 left-4 z-[95] font-[family-name:var(--font-mono)] text-[10px] text-white/20 tracking-wider pointer-events-none hidden md:block">
      {time}
    </div>
  );
}
