"use client";

import React from "react";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function GlassCard({ children, className = "", hover = true }: GlassCardProps) {
  return (
    <div
      className={`rounded-2xl glass ${hover ? "glass-hover transition-all duration-500" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
