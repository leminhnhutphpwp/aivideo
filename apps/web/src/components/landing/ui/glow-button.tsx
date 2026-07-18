"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface GlowButtonProps {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  glow?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "h-10 px-6 text-xs",
  md: "h-11 sm:h-12 px-6 sm:px-8 text-xs sm:text-sm",
  lg: "h-12 sm:h-14 px-8 sm:px-10 text-sm sm:text-base",
  xl: "h-14 sm:h-16 px-8 sm:px-12 text-base sm:text-lg",
};

export function GlowButton({ href, onClick, children, size = "md", glow = false, className = "" }: GlowButtonProps) {
  const classes = `glow-button ${sizeClasses[size]} ${glow ? "glow-button-glow" : ""} ${className}`;

  if (href) {
    return (
      <Link href={href} className={`group inline-flex ${classes}`}>
        {children}
        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={`group ${classes}`}>
      {children}
      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
    </button>
  );
}
