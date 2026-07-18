'use client';

import { useState, useRef, useEffect, useMemo, type ComponentType } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Film, ChevronRight, Search } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { cn } from '@/lib/utils';

export interface OptionDef {
  value: string;
  label: string;
  desc: string;
  suitableFor: string;
  icon: ComponentType<{ className?: string }>;
  examplePrompt?: string;
  examplePromptVi?: string;
}

export function findOption(list: OptionDef[], value: string) { return list.find(o => o.value === value); }

export function OptionIcon({ icon: Icon, className }: { icon: ComponentType<{ className?: string }>; className?: string }) {
  return <Icon className={className || 'h-4 w-4'} />;
}

export function RichSelect({ label, value, onChange, options, icon: LabelIcon, tooltipSide, noTooltip, compact }: { label: string; value: string; onChange: (v: string) => void; options: OptionDef[]; icon: ComponentType<{ className?: string }>; tooltipSide?: 'left' | 'right'; noTooltip?: boolean; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [dynamicSide, setDynamicSide] = useState<'left' | 'right'>(tooltipSide || 'right');
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = findOption(options, value);
  const hoveredDef = hovered ? findOption(options, hovered) : null;

  // Show an inline filter once the list is long enough to be a scroll chore
  // (covers the full Mood/Lighting/Camera/Style lists; short, skill-filtered ones stay clean).
  const searchable = options.length > 7;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(o =>
      `${o.label} ${o.desc} ${o.suitableFor}`.toLowerCase().includes(q));
  }, [options, query]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) { setHovered(null); setQuery(''); }
  };

  // Move focus to the filter input on open (Radix DropdownMenu auto-focuses the
  // first item; this overrides it shortly after so users can type immediately).
  useEffect(() => {
    if (open && searchable) {
      const id = setTimeout(() => inputRef.current?.focus(), 40);
      return () => clearTimeout(id);
    }
  }, [open, searchable]);

  useEffect(() => {
    if (hovered && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const spaceRight = window.innerWidth - rect.right;
      const spaceLeft = rect.left;
      let side: 'left' | 'right' = tooltipSide || 'right';
      if (side === 'right' && spaceRight < 260) side = spaceLeft > spaceRight ? 'left' : 'right';
      else if (side === 'left' && spaceLeft < 260) side = spaceRight > spaceLeft ? 'right' : 'left';
      setDynamicSide(side);
      setTooltipStyle({
        position: 'fixed',
        top: rect.top + rect.height / 2,
        transform: 'translateY(-50%)',
        [side === 'left' ? 'right' : 'left']: side === 'left' ? window.innerWidth - rect.left + 8 : rect.right + 8,
      });
    }
  }, [hovered, tooltipSide]);

  return (
    <div className="space-y-1.5 relative" ref={ref}>
      <label className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
        <LabelIcon className="h-3 w-3" />{label}
      </label>

      <DropdownMenu.Root open={open} onOpenChange={handleOpenChange}>
        <DropdownMenu.Trigger asChild>
          <button
            className={cn(
              "w-full flex items-center gap-2 text-left transition-all cursor-pointer group outline-none",
              compact
                ? "h-9 px-3 bg-white/[0.04] border border-white/[0.08] rounded-xl hover:border-white/[0.14] focus:border-[#FF5A1F]/50"
                : "bg-white/5 border border-white/10 rounded-lg px-3 py-2 hover:border-white/20"
            )}
          >
            {selected ? (
              <OptionIcon icon={selected.icon} className={cn("text-[#FF5A1F] shrink-0", compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
            ) : (
              <Film className={cn("text-slate-600 shrink-0", compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
            )}
            <div className="flex-1 min-w-0">
              <div className={cn("font-medium text-white truncate", compact ? "text-[11px]" : "text-xs")}>
                {selected?.label || value || 'Không'}
              </div>
              {!compact && (
                <div className="text-[10px] text-slate-500 truncate">{selected?.desc || ''}</div>
              )}
            </div>
            <ChevronRight className={`h-3.5 w-3.5 text-slate-500 transition-transform shrink-0 ${open ? 'rotate-90' : ''}`} />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            sideOffset={4}
            collisionPadding={16}
            onCloseAutoFocus={() => setQuery('')}
            className="z-[999] bg-zinc-900 border border-[#FF5A1F]/30 rounded-xl shadow-md overflow-y-auto max-h-[300px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 hover:[&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full"
            style={{
              width: 'var(--radix-dropdown-menu-trigger-width)'
            }}
          >
            <>
            {searchable && (
              <div className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-sm p-2 border-b border-white/10">
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-2.5 h-8 focus-within:border-[#FF5A1F]/40">
                  <Search className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    // Stop Radix's typeahead/keyboard-nav from hijacking the keystrokes.
                    onKeyDown={(e) => { if (e.key !== 'Escape') e.stopPropagation(); }}
                    placeholder={`Tìm ${label.toLowerCase()}...`}
                    className="w-full bg-transparent text-xs text-white placeholder:text-slate-600 outline-none"
                  />
                  <span className="text-[9px] text-slate-600 shrink-0">{filtered.length}</span>
                </div>
              </div>
            )}
            {filtered.length === 0 && (
              <div className="px-3 py-5 text-center text-[10px] text-slate-500">Không tìm thấy phù hợp</div>
            )}
            {filtered.map((opt) => (
              <DropdownMenu.Item key={opt.value} asChild onSelect={() => onChange(opt.value)}>
                <button
                  onMouseEnter={() => setHovered(opt.value)}
                  onMouseLeave={() => setHovered(null)}
                  className={`w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors outline-none cursor-pointer ${value === opt.value ? 'bg-[#FF5A1F]/10' : 'hover:bg-white/5 data-[highlighted]:bg-white/5'}`}
                >
                  <OptionIcon icon={opt.icon} className={`h-4 w-4 mt-0.5 shrink-0 ${value === opt.value ? 'text-[#FF5A1F]' : 'text-slate-500'}`} />
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-semibold ${value === opt.value ? 'text-[#FF5A1F]' : 'text-white'}`}>{opt.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 truncate">{opt.desc}</div>
                  </div>
                </button>
              </DropdownMenu.Item>
            ))}
            </>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {!noTooltip && hoveredDef && createPortal(
        <motion.div key={hoveredDef.value} initial={{ opacity: 0, x: dynamicSide === 'left' ? 8 : -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dynamicSide === 'left' ? 8 : -8 }}
          className="z-[9999] w-56 bg-zinc-900 border border-white/10 rounded-xl p-3 shadow-md pointer-events-none fixed"
          style={tooltipStyle}
        >
          <div className="flex items-center gap-2 mb-1">
            <OptionIcon icon={hoveredDef.icon} className="h-4 w-4 text-[#FF5A1F]" />
            <span className="text-[11px] font-semibold text-white">{hoveredDef.label}</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed">{hoveredDef.desc}</p>
          <p className="text-[9px] text-slate-600 mt-1.5">
            <span className="text-[#FF5A1F]/70">Phù hợp: </span>
            {hoveredDef.suitableFor}
          </p>
        </motion.div>,
        document.body
      )}
    </div>
  );
}
