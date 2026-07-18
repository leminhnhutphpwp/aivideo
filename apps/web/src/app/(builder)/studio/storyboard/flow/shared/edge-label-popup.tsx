'use client';

import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface EdgeLabelPopupProps {
  edge: { id: string; label?: string; x: number; y: number } | null;
  label: string;
  onLabelChange: (v: string) => void;
  onSave: () => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function EdgeLabelPopup({ edge, label, onLabelChange, onSave, onDelete, onClose }: EdgeLabelPopupProps) {
  return (
    <AnimatePresence>
      {edge && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.12 }}
          style={{ position: 'fixed', left: edge.x - 120, top: edge.y - 12, zIndex: 200 }}
          className="bg-[#1C1C20] border border-white/[0.08] rounded-xl shadow-md p-2 flex items-center gap-1.5 backdrop-blur-2xl"
        >
          <input
            value={label}
            onChange={e => onLabelChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onClose(); }}
            placeholder="Nhãn kết nối..."
            autoFocus
            className="h-7 bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 text-[11px] text-slate-200 placeholder:text-slate-600 outline-none focus:border-[#FF5A1F]/40 w-32"
          />
          <button
            onClick={onSave}
            className="h-7 px-2.5 rounded-lg bg-[#FF5A1F]/15 hover:bg-[#FF5A1F]/25 text-[#FF5A1F] text-[10px] font-medium transition-colors cursor-pointer"
          >
            Lưu
          </button>
          <button
            onClick={() => onDelete(edge.id)}
            className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/[0.04] text-slate-600 transition-colors text-[10px] cursor-pointer"
          >
            ✕
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
