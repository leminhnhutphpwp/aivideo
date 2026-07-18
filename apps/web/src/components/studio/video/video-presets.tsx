'use client';

import { type DirectionPreset } from '@/components/studio/options';
import { Zap, Info, Copy, X, Search, ChevronDown } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useToastStore } from '@/stores/toast-store';

interface VideoPresetsProps {
  directionPresets: DirectionPreset[];
  selectedPresetId: string | null;
  targetSceneId: string;
  onApplyPreset: (sceneId: string, preset: DirectionPreset) => void;
  isActivePreset: (preset: DirectionPreset) => boolean;
}

export function VideoPresets({
  directionPresets,
  selectedPresetId,
  targetSceneId,
  onApplyPreset,
  isActivePreset,
}: VideoPresetsProps) {
  const addToast = useToastStore(s => s.addToast);
  const [examplePreset, setExamplePreset] = useState<DirectionPreset | null>(null);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);

  // Keep the grid compact: show a search box + only the first rows once there are
  // many presets; "Xem thêm" reveals the rest, and searching shows all matches.
  const COLLAPSED_COUNT = 8;
  const searchable = directionPresets.length > 8;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return directionPresets;
    return directionPresets.filter(p => `${p.label} ${p.desc} ${p.id}`.toLowerCase().includes(q));
  }, [directionPresets, query]);
  const isFiltering = query.trim() !== '';
  const visible = (isFiltering || expanded) ? filtered : filtered.slice(0, COLLAPSED_COUNT);
  const hiddenCount = filtered.length - visible.length;

  // Lock body scroll while the example popup is open. Tied to state so it's
  // always released on close — every path (X, backdrop, copy, unmount) — not
  // just the ones that remembered to reset it manually.
  useEffect(() => {
    if (!examplePreset) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [examplePreset]);

  return (
    <div className="bg-zinc-950 border border-white/5 rounded-2xl p-3 md:p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-600 uppercase tracking-widest">
          <Zap className="h-3 w-3" /> Mẫu có sẵn — chọn nhanh
        </div>
        {searchable && <span className="text-[9px] text-slate-600">{filtered.length}/{directionPresets.length}</span>}
      </div>

      {searchable && (
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-2.5 h-8 focus-within:border-[#FF5A1F]/40">
          <Search className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm mẫu..."
            className="w-full bg-transparent text-[11px] text-white placeholder:text-slate-600 outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-slate-500 hover:text-white shrink-0"><X className="h-3 w-3" /></button>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="py-5 text-center text-[10px] text-slate-500">Không tìm thấy mẫu phù hợp</div>
      ) : (
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-1.5 md:gap-2">
        {visible.map((preset) => (
          <button key={preset.id} onClick={() => onApplyPreset(targetSceneId, preset)}
            className={`rounded-xl p-2 md:p-3 text-left transition-all cursor-pointer group relative ${isActivePreset(preset) ? 'border-[#FF5A1F] bg-[#FF5A1F]/5' : 'border-white/5 bg-white/[0.03] hover:border-[#FF5A1F]/30 hover:bg-white/[0.05]'} border`}>
            <preset.icon className={`h-5 w-5 transition-colors mb-1.5 ${isActivePreset(preset) ? 'text-[#FF5A1F]' : 'text-slate-400 group-hover:text-[#FF5A1F]'}`} />
            <div className={`text-[10px] font-bold transition-colors ${isActivePreset(preset) ? 'text-[#FF5A1F]' : 'text-white group-hover:text-[#FF5A1F]'}`}>{preset.label}</div>
            <div className="text-[9px] text-slate-600 mt-0.5 leading-relaxed line-clamp-3">{preset.desc}</div>
            {preset.examplePrompt && (
              <span
                onClick={(e) => { e.stopPropagation(); setExamplePreset(preset); }}
                className="flex items-center gap-1 mt-2 text-[9px] text-slate-500 hover:text-cyan-400 transition-colors cursor-pointer"
              >
                <Info className="h-3 w-3" />
                Xem prompt mẫu
              </span>
            )}
          </button>
        ))}
      </div>
      )}

      {searchable && !isFiltering && (hiddenCount > 0 || expanded) && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-semibold text-slate-400 hover:text-[#FF5A1F] hover:bg-white/[0.03] transition-colors"
        >
          {expanded ? 'Thu gọn' : `Xem thêm ${hiddenCount} mẫu`}
          <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      )}

      {/* Example prompt popup */}
      <AnimatePresence>
        {examplePreset && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
            onClick={() => { setExamplePreset(null); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="w-full max-w-lg bg-zinc-900 border border-white/[0.08] rounded-2xl shadow-md overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.04]">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-cyan-400" />
                  <span className="text-xs font-semibold text-white">Prompt mẫu · {examplePreset.label}</span>
                </div>
                <button onClick={() => setExamplePreset(null)} className="text-slate-500 hover:text-white cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Tiếng Anh</span>
                  <p className="text-sm text-slate-300 leading-relaxed italic mt-1">
                    &ldquo;{examplePreset.examplePrompt}&rdquo;
                  </p>
                </div>
                {examplePreset.examplePromptVi && (
                  <div>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Tiếng Việt</span>
                    <p className="text-sm text-slate-300 leading-relaxed italic mt-1">
                      &ldquo;{examplePreset.examplePromptVi}&rdquo;
                    </p>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-white/[0.04] bg-white/[0.01]">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(examplePreset.examplePrompt || '');
                    addToast('Đã sao chép (Tiếng Anh)', 'success');
                    setExamplePreset(null);
                  }}
                  className="h-9 px-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 text-xs font-medium border border-white/[0.08] transition-colors cursor-pointer"
                >
                  Copy EN
                </button>
                {examplePreset.examplePromptVi && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(examplePreset.examplePromptVi || '');
                      addToast('Đã sao chép (Tiếng Việt)', 'success');
                      setExamplePreset(null);
                    }}
                    className="h-9 px-3 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-medium border border-cyan-500/20 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Copy className="h-3 w-3" />
                    Sao chép VI
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
