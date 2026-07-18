"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface CTAButtonProps {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
  size?: "default" | "large" | "xl";
  glow?: boolean;
  className?: string;
  external?: boolean;
}

const sizeClasses: Record<string, string> = {
  default: "h-12 px-8 text-sm",
  large: "h-14 px-10 text-base",
  xl: "h-16 px-12 text-lg",
};

export function CTAButton({
  href,
  onClick,
  children,
  size = "default",
  glow = false,
  className = "",
  external = false,
}: CTAButtonProps) {
  const baseClasses = `btn-creative ${sizeClasses[size]} ${glow ? "btn-creative-glow" : ""} ${className}`;

  const content = (
    <>
      {children}
      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
    </>
  );

  if (href) {
    const linkProps = external
      ? { target: "_blank", rel: "noopener noreferrer" }
      : {};
    return (
      <Link href={href} className={`group inline-flex ${baseClasses}`} {...linkProps}>
        {content}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={`group ${baseClasses}`}>
      {content}
    </button>
  );
}
