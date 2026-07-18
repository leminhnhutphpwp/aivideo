"use client";

import React, { useState, useEffect } from "react";

interface TextMorphProps {
  texts: string[];
  interval?: number;
  className?: string;
}

export function TextMorph({ texts, interval = 3000, className = "" }: TextMorphProps) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % texts.length);
        setVisible(true);
      }, 500);
    }, interval);
    return () => clearInterval(timer);
  }, [texts.length, interval]);

  return (
    <span
      className={`inline-block transition-all duration-500 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      } ${className}`}
    >
      {texts[index]}
    </span>
  );
}
