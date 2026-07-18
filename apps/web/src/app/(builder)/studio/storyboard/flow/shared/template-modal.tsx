'use client';

import { motion, AnimatePresence } from 'motion/react';
import { Film, X } from 'lucide-react';

interface TemplateModalProps {
  open: boolean;
  templates: any[];
  hasExistingNodes: boolean;
  onSelect: (template: any) => void;
  onClose: () => void;
}

export function TemplateModal({ open, templates, hasExistingNodes, onSelect, onClose }: TemplateModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-zinc-950/70 backdrop-blur-md z-[200] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-2xl max-h-[80vh] bg-zinc-900 border border-white/[0.08] rounded-2xl shadow-md flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.04] shrink-0">
              <div className="flex items-center gap-2">
                <Film className="h-4 w-4 text-cyan-400" />
                <span className="text-sm font-semibold text-white">Mẫu có sẵn</span>
                <span className="text-[10px] text-slate-500 ml-1">{templates.length} mẫu</span>
              </div>
              <button onClick={onClose} className="text-slate-500 hover:text-white cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {templates.map((tpl: any, i: number) => (
                <button
                  key={i}
                  onClick={() => onSelect(tpl)}
                  className="text-left p-4 rounded-xl border border-white/[0.06] hover:border-[#FF5A1F]/30 bg-white/[0.01] hover:bg-white/[0.03] transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{tpl.typeLabel}</span>
                      <h4 className="text-sm font-semibold text-white group-hover:text-[#FF5A1F] transition-colors mt-0.5">{tpl.name}</h4>
                    </div>
                    <span className="text-[10px] text-slate-600 bg-white/[0.03] px-2 py-0.5 rounded-full shrink-0">{tpl.scenes?.length || 0} cảnh</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">{tpl.description || ''}</p>
                  <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-600">
                    <span className="text-cyan-400/70">Ấn để thêm</span>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
