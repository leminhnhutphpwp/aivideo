"use client";

import React, { useState, useEffect, useCallback } from "react";

interface TypewriterTextProps {
  text: string;
  speed?: number;
  delay?: number;
  loop?: boolean;
  loopDelay?: number;
  cursor?: boolean;
  className?: string;
  onComplete?: () => void;
}

export function TypewriterText({
  text,
  speed = 80,
  delay = 0,
  loop = false,
  loopDelay = 3000,
  cursor = true,
  className = "",
  onComplete,
}: TypewriterTextProps) {
  const [displayed, setDisplayed] = useState("");
  const [showCursor, setShowCursor] = useState(cursor);
  const [isComplete, setIsComplete] = useState(false);

  const typeNext = useCallback(
    (index: number) => {
      if (index >= text.length) {
        setIsComplete(true);
        setShowCursor(false);
        onComplete?.();
        if (loop) {
          setTimeout(() => {
            setDisplayed("");
            setIsComplete(false);
            setShowCursor(true);
            typeNext(0);
          }, loopDelay);
        }
        return;
      }
      setDisplayed(text.slice(0, index + 1));
      setTimeout(() => typeNext(index + 1), speed);
    },
    [text, speed, loop, loopDelay, onComplete]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      typeNext(0);
    }, delay);
    return () => clearTimeout(timer);
  }, [delay, typeNext]);

  return (
    <span className={`inline ${className}`}>
      {displayed}
      {showCursor && (
        <span className="inline-block w-[2px] h-[1em] bg-current ml-0.5 animate-pulse align-middle" />
      )}
    </span>
  );
}
