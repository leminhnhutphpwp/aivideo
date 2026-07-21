'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';

interface TypewriterProps {
  text: string;
  speed?: number;
  delay?: number;
  className?: string;
  cursor?: boolean;
  loop?: boolean;
  pauseAfter?: number;
}

export function Typewriter({ text, speed = 80, delay = 0, className, cursor = true, loop = false, pauseAfter = 3000 }: TypewriterProps) {
  const [displayed, setDisplayed] = useState('');
  const [started, setStarted] = useState(false);
  const [phase, setPhase] = useState<'typing' | 'waiting' | 'deleting'>('typing');

  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  // Reset when the target text changes so a new (possibly shorter) string doesn't stay
  // frozen showing stale characters from the previous one.
  useEffect(() => {
    setDisplayed('');
    setPhase('typing');
  }, [text]);

  useEffect(() => {
    if (!started) return;

    if (phase === 'typing') {
      if (displayed.length < text.length) {
        const timer = setTimeout(() => {
          setDisplayed(text.slice(0, displayed.length + 1));
        }, speed);
        return () => clearTimeout(timer);
      }
      if (loop) {
        const timer = setTimeout(() => setPhase('waiting'), pauseAfter);
        return () => clearTimeout(timer);
      }
      return;
    }

    if (phase === 'waiting') {
      setPhase('deleting');
      return;
    }

    if (phase === 'deleting') {
      if (displayed.length > 0) {
        const timer = setTimeout(() => {
          setDisplayed(displayed.slice(0, -1));
        }, speed / 2);
        return () => clearTimeout(timer);
      }
      const timer = setTimeout(() => setPhase('typing'), 500);
      return () => clearTimeout(timer);
    }
  }, [displayed, started, text, speed, phase, loop, pauseAfter]);

  return (
    <span className={className}>
      {displayed}
      {cursor && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse' }}
          className="inline-block ml-0.5 -mr-0.5"
        >
          |
        </motion.span>
      )}
    </span>
  );
}
