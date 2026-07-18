'use client';

import { useEffect } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { Plus, Copy, Trash2 } from 'lucide-react';

interface CtxMenuProps {
  x: number;
  y: number;
  nodeId: string;
  onClose: () => void;
  onDuplicate: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  onAddChild: (nodeId: string) => void;
}

export function CtxMenu({ x, y, nodeId, onClose, onDuplicate, onDelete, onAddChild }: CtxMenuProps) {
  useEffect(() => {
    const h = () => onClose();
    window.addEventListener('click', h);
    return () => window.removeEventListener('click', h);
  }, [onClose]);

  const items = [
    { icon: Plus, label: 'Thêm cảnh con', action: () => onAddChild(nodeId) },
    { icon: Copy, label: 'Nhân bản', action: () => onDuplicate(nodeId) },
    { icon: Trash2, label: 'Xóa', action: () => onDelete(nodeId), danger: true },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ duration: 0.1 }}
      style={{ position: 'fixed', left: x, top: y, zIndex: 100 }}
      className="bg-[#1C1C20] border border-white/10 rounded-xl shadow-md py-1 w-44 overflow-hidden backdrop-blur-2xl"
    >
      {items.map((it, i) => (
        <button
          key={i}
          onClick={(e) => {
            e.stopPropagation();
            it.action();
            onClose();
          }}
          className={cn(
            'w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[11px] transition-colors hover:bg-white/[0.04] cursor-pointer',
            it.danger ? 'text-red-400' : 'text-slate-300',
          )}
        >
          <it.icon className="h-3.5 w-3.5 opacity-60" />
          {it.label}
        </button>
      ))}
    </motion.div>
  );
}
