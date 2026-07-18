"use client";

import React from "react";

interface FilmCardProps {
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function FilmCard({ children, className = "", size = "md" }: FilmCardProps) {
  const holeSize = size === "lg" ? 14 : size === "sm" ? 8 : 10;
  const gap = size === "lg" ? 10 : size === "sm" ? 6 : 8;

  return (
    <div className={`relative ${className}`}>
      {/* Perforation left */}
      <div
        className="absolute left-0 top-0 bottom-0 w-4 md:w-5 z-10 pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent ${gap}px, rgba(255,255,255,0.04) ${gap}px, rgba(255,255,255,0.04) ${gap + holeSize}px)`,
        }}
      />
      {/* Perforation right */}
      <div
        className="absolute right-0 top-0 bottom-0 w-4 md:w-5 z-10 pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent ${gap}px, rgba(255,255,255,0.04) ${gap}px, rgba(255,255,255,0.04) ${gap + holeSize}px)`,
        }}
      />
      <div className="mx-4 md:mx-5">
        {children}
      </div>
    </div>
  );
}
