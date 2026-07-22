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
  const [activeIndex, setActiveIndex] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listboxId = useRef(`select-listbox-${Math.random().toString(36).slice(2)}`).current;
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

  // When opening, highlight the currently-selected option (or the first one).
  useEffect(() => {
    if (open) {
      const idx = items.findIndex(o => o.value === value);
      setActiveIndex(idx >= 0 ? idx : 0);
    } else {
      setActiveIndex(-1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        positionDropdown();
        setOpen(true);
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(i => Math.min(items.length - 1, i + 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(i => Math.max(0, i - 1));
        break;
      case 'Home':
        e.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setActiveIndex(items.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (activeIndex >= 0 && items[activeIndex]) handleSelect(items[activeIndex].value);
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        break;
      case 'Tab':
        setOpen(false);
        break;
    }
  }, [open, items, activeIndex, handleSelect, positionDropdown]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={open && activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined}
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
          id={listboxId}
          role="listbox"
          initial={{ opacity: 0, y: -4, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.12, ease: 'easeOut' }}
          style={dropdownStyle}
          className="z-[999] min-w-[140px] bg-[#1C1C20] border border-white/12 rounded-xl shadow-md py-1 overflow-y-auto max-h-[240px] backdrop-blur-2xl [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 hover:[&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full"
        >
          {items.map((item, idx) => (
            <button
              key={item.value}
              id={`${listboxId}-opt-${idx}`}
              type="button"
              role="option"
              aria-selected={item.value === value}
              onClick={(e) => { e.stopPropagation(); handleSelect(item.value); }}
              onMouseEnter={() => setActiveIndex(idx)}
              className={cn(
                  "w-full text-left px-3 py-2.5 text-[11px] transition-colors cursor-pointer",
                item.value === value
                  ? "bg-[#FF5A1F]/10 text-[#FF5A1F] font-medium"
                  : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200",
                idx === activeIndex && item.value !== value && "bg-white/[0.04] text-slate-200",
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
