'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: (string | SelectOption)[];
  placeholder?: string;
  className?: string;
  pill?: boolean;
}

export function CustomSelect({ value, onChange, options, placeholder, className, pill }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const items: SelectOption[] = options.map(o =>
    typeof o === 'string' ? { value: o, label: o } : o
  );

  const selected = items.find(o => o.value === value);
  const display = selected?.label || placeholder || 'Chọn...';

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        ref.current && !ref.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const positionDropdown = useCallback(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setDropdownStyle({
      position: 'fixed',
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  const handleToggle = useCallback(() => {
    if (!open) positionDropdown();
    setOpen(!open);
  }, [open, positionDropdown]);

  // The dropdown is portaled to <body> with fixed positioning, so it won't follow the
  // trigger when the page or an ancestor scrolls / the window resizes. Recompute while open.
  useEffect(() => {
    if (!open) return;
    const onReflow = () => positionDropdown();
    window.addEventListener('scroll', onReflow, true);
    window.addEventListener('resize', onReflow);
    return () => {
      window.removeEventListener('scroll', onReflow, true);
      window.removeEventListener('resize', onReflow);
    };
  }, [open, positionDropdown]);

  const handleSelect = useCallback((val: string) => {
    onChange(val);
    setOpen(false);
  }, [onChange]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          "w-full flex items-center justify-between gap-1.5 rounded-xl transition-all duration-200 cursor-pointer outline-none",
          pill
            ? "h-8 px-3 text-[11px] bg-white/[0.04] border border-white/12 hover:border-white/[0.14] focus:border-[#FF5A1F]/50"
            : "h-9 px-3 text-[11px] bg-white/[0.04] border border-white/12 hover:border-white/[0.14] focus:border-[#FF5A1F]/50",
          open && "border-[#FF5A1F]/50",
        )}
      >
        <span className={cn("truncate text-left flex-1", value ? "text-slate-300" : "text-slate-400")}>
          {display}
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.15 }}>
          <ChevronDown className="h-3.5 w-3.5 text-slate-500 shrink-0" />
        </motion.span>
      </button>

      {open && createPortal(
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: -4, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.12, ease: 'easeOut' }}
          style={dropdownStyle}
          className="z-[999] min-w-[140px] bg-[#1C1C20] border border-white/12 rounded-xl shadow-md py-1 overflow-y-auto max-h-[240px] backdrop-blur-2xl [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 hover:[&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full"
        >
          {items.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={(e) => { e.stopPropagation(); handleSelect(item.value); }}
              className={cn(
                  "w-full text-left px-3 py-2.5 text-[11px] transition-colors cursor-pointer",
                item.value === value
                  ? "bg-[#FF5A1F]/10 text-[#FF5A1F] font-medium"
                  : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200",
              )}
            >
              {item.label}
            </button>
          ))}
        </motion.div>,
        document.body
      )}
    </div>
  );
}
