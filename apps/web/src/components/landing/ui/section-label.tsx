"use client";

import React from "react";

interface SectionLabelProps {
  children: React.ReactNode;
  className?: string;
  accent?: boolean;
  hideText?: boolean;
}

export function SectionLabel({ children, className = "", accent = true }: SectionLabelProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {accent && (
        <div className="w-8 h-[2px] bg-gradient-to-r from-[#FF5A1F] to-[#FF8A5B]" />
      )}
      <span className="font-[family-name:var(--font-mono)] text-[11px] font-bold text-slate-500 uppercase tracking-[0.25em] whitespace-nowrap">
        {children}
      </span>
    </div>
  );
}
