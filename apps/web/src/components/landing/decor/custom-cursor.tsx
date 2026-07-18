"use client";

import React, { useState, useEffect, useRef } from "react";

export function CustomCursor() {
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(true);

  // High-performance DOM Refs to completely bypass React state updates for position tracking (eliminates 100% of input delay)
  const targetPos = useRef({ x: 0, y: 0 });
  const trailPos = useRef({ x: 0, y: 0 });
  
  const cursorRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // Dynamic style injection to cleanly hide native system pointer on desktops
    const style = document.createElement("style");
    style.id = "custom-cursor-hide-native";
    style.innerHTML = `
      @media (pointer: fine) {
        .custom-cursor-active,
        .custom-cursor-active * {
          cursor: none !important;
        }
      }
    `;
    document.head.appendChild(style);

    const handlePointerMove = (e: PointerEvent) => {
      // Ignore physical touch to prevent cursor glitches on mobile/tablet screens
      if (e.pointerType === "touch") return;
      
      const x = e.clientX;
      const y = e.clientY;

      targetPos.current = { x, y };
      setIsVisible(true);
      setIsTouchDevice(false);
      document.documentElement.classList.add("custom-cursor-active");

      // 1. Direct DOM style update for the Arrow (Zero input latency, instant tracking)
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }

      // 2. Direct DOM style update for the Floating Tech Label
      if (labelRef.current) {
        labelRef.current.style.transform = `translate3d(${x + 32}px, ${y + 12}px, 0)`;
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return; // Only left click triggers shrink animation
      setIsClicked(true);
    };

    const handleMouseUp = () => setIsClicked(false);
    
    const handleMouseLeave = () => {
      setIsVisible(false);
      document.documentElement.classList.remove("custom-cursor-active");
    };
    
    const handleMouseEnter = () => {
      setIsVisible(true);
      document.documentElement.classList.add("custom-cursor-active");
    };

    // Global listener to check if hovering interactive elements
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      try {
        const computedStyle = window.getComputedStyle(target);
        const isInteractive = 
          computedStyle.cursor === "pointer" ||
          target.tagName === "BUTTON" ||
          target.tagName === "A" ||
          target.closest("button") ||
          target.closest("a") ||
          target.closest(".cursor-pointer") ||
          target.closest("[role='button']");

        setIsHovered(!!isInteractive);
      } catch (err) {
        setIsHovered(false);
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseenter", handleMouseEnter);
    window.addEventListener("mouseover", handleMouseOver);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseenter", handleMouseEnter);
      window.removeEventListener("mouseover", handleMouseOver);
      
      document.documentElement.classList.remove("custom-cursor-active");
      const existingStyle = document.getElementById("custom-cursor-hide-native");
      if (existingStyle) existingStyle.remove();
    };
  }, []);

  // Interpolated luxurious liquid lag effect for the outer trail ring
  useEffect(() => {
    if (isTouchDevice) return;
    let animationFrameId: number;

    const updateTrail = () => {
      // Reduced interpolation rate to 0.08 to make the outer ring drag with a premium heavy liquid/spring feel, rather than looking "too fast" or jittery
      trailPos.current.x += (targetPos.current.x - trailPos.current.x) * 0.09;
      trailPos.current.y += (targetPos.current.y - trailPos.current.y) * 0.09;

      if (trailRef.current) {
        trailRef.current.style.transform = `translate3d(${trailPos.current.x}px, ${trailPos.current.y}px, 0)`;
      }
      animationFrameId = requestAnimationFrame(updateTrail);
    };

    animationFrameId = requestAnimationFrame(updateTrail);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isTouchDevice]);

  if (isTouchDevice) return null;

  return (
    <>
      {/* 1. Futuristic Custom Glowing Arrow Pointer (Direct DOM positioned, 0ms input delay) */}
      <div
        ref={cursorRef}
        className="fixed pointer-events-none z-[99999] top-0 left-0 will-change-transform"
        style={{
          transform: "translate3d(0px, 0px, 0)",
          opacity: isVisible ? 1 : 0,
          transition: "opacity 0.25s ease-out",
        }}
      >
        {/* Isolated inner container to animate scaling */}
        <div
          className="transition-transform duration-100 ease-out"
          style={{
            transform: `scale(${isClicked ? 0.82 : 1})`,
          }}
        >
          <svg 
            width="20" 
            height="24" 
            viewBox="0 0 20 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            style={{
              filter: "drop-shadow(0 0 10px rgba(255, 90, 31, 0.85))",
            }}
          >
            <path 
              d="M0 0L16 12L9 14L13 20L10 21L6 15L2 18Z" 
              fill="#FF5A1F" 
              stroke="#FFFFFF" 
              strokeWidth="1.5" 
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* 2. Outer Spinning Viewfinder Ring (Direct DOM lag animation, premium heavy inertia) */}
      <div
        ref={trailRef}
        className="fixed pointer-events-none z-[99998] top-0 left-0 will-change-transform"
        style={{
          transform: "translate3d(0px, 0px, 0)",
          opacity: isVisible ? 1 : 0,
          transition: "opacity 0.35s ease-out",
        }}
      >
        <div
          className="rounded-full border transition-all duration-300 ease-out"
          style={{
            width: isHovered ? "56px" : "36px",
            height: isHovered ? "56px" : "36px",
            borderWidth: "1.5px",
            borderStyle: isHovered ? "dashed" : "solid",
            borderColor: isHovered ? "rgba(255, 90, 31, 0.85)" : "rgba(255, 90, 31, 0.45)",
            backgroundColor: isHovered ? "rgba(255, 90, 31, 0.08)" : "transparent",
            boxShadow: isHovered ? "0 0 25px rgba(255, 90, 31, 0.3)" : "none",
            transform: `translate(-50%, -50%) scale(${isClicked ? 0.75 : 1}) rotate(${isHovered ? "90deg" : "0deg"})`,
          }}
        />
      </div>

      {/* 3. Micro Technical HUD Label (Direct DOM synchronized) */}
      <span
        ref={labelRef}
        className={`fixed pointer-events-none font-mono text-[9px] font-black text-[#FF5A1F] tracking-[0.2em] uppercase z-[99999] transition-all duration-300 ease-out ${
          isHovered && isVisible ? "opacity-100 scale-100" : "opacity-0 scale-75"
        }`}
        style={{
          transform: "translate3d(0px, 0px, 0)",
          textShadow: "0 0 8px rgba(255, 90, 31, 0.7)",
        }}
      >
        SELECT
      </span>
    </>
  );
}
