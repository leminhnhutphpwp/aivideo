"use client";

import { useState, useEffect, useRef, type RefCallback } from "react";

export function useInView<T extends HTMLElement>(
  options: IntersectionObserverInit = { threshold: 0.2 }
): [RefCallback<T>, boolean] {
  const [isInView, setIsInView] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elRef = useRef<T | null>(null);

  const ref: RefCallback<T> = (node) => {
    if (node) {
      elRef.current = node;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observerRef.current?.disconnect();
        }
      }, options);
      observerRef.current.observe(node);
    }
  };

  useEffect(() => {
    return () => observerRef.current?.disconnect();
  }, []);

  return [ref, isInView];
}
