'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight } from 'lucide-react';

interface SectionProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  open: boolean;
  onToggle: () => void;
  active?: boolean;
  children: React.ReactNode;
}

export function Section({ title, icon: Icon, open, onToggle, active, children }: SectionProps) {
  return (
    <div className="border-b border-white/[0.04] last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors group/section cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-slate-500 group-hover/section:text-slate-400 transition-colors" />
          <span className="text-[11px] font-semibold text-slate-400 group-hover/section:text-slate-300 transition-colors">
            {title}
          </span>
          {active && <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A1F]/60" />}
        </div>
        <motion.div animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.15 }}>
          <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
            animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
            exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 pb-4 space-y-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
