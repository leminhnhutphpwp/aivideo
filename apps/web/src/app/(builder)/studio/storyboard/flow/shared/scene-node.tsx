'use client';

import { motion } from 'motion/react';
import { Handle, Position } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { Camera, Mic, ImageIcon, Plus, Trash2, Copy } from 'lucide-react';
import { COLORS } from './constants';

interface SceneNodeProps {
  data: any;
  selected: boolean;
}

export function SceneNode({ data, selected }: SceneNodeProps) {
  const c = COLORS[(data.sceneNumber - 1) % COLORS.length];
  const hasPrompt = !!data.prompt;
  const hasVoice = data.has_narration;
  const hasRef = data.has_reference || !!data.refPreview;
  const hasLastFrame = !!data.lastFramePreview;
  const hasCamera = !!data.camera_movement;
  const refPreview = data.refPreview;
  const lastFramePreview = data.lastFramePreview;
  const imageCount = (refPreview ? 1 : 0) + (lastFramePreview ? 1 : 0);
  const tag = data.tag; // 'intro' | 'outro' | 'transition' | undefined

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={cn(
        'relative w-[240px] rounded-2xl transition-all duration-200 group/node overflow-hidden',
        'bg-zinc-900 border border-white/[0.06] hover:border-white/[0.10] shadow-sm shadow-black/30',
      )}
      style={
        selected
          ? {
              boxShadow: `0 0 35px ${c}30, 0 0 0 2px ${c}60`,
              backgroundColor: '#1A1A1E',
              zIndex: 10,
            }
          : undefined
      }
    >
      {/* Accent top bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1 opacity-90 rounded-b-sm"
        style={{ backgroundColor: c }}
      />

      <Handle
        type="target"
        position={Position.Left}
        className="!bg-[#FF5A1F]/30 !border-2 !border-white/[0.08] !w-3.5 !h-3.5 !left-[-7px] !shadow-[0_0_6px_rgba(255,90,31,0.2)] transition-all group-hover/node:!bg-[#FF5A1F]/60 group-hover/node:!shadow-[0_0_10px_rgba(255,90,31,0.5)]"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-[#FF5A1F]/30 !border-2 !border-white/[0.08] !w-3.5 !h-3.5 !right-[-7px] !shadow-[0_0_6px_rgba(255,90,31,0.2)] transition-all group-hover/node:!bg-[#FF5A1F]/60 group-hover/node:!shadow-[0_0_10px_rgba(255,90,31,0.5)]"
      />

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0"
          style={{ backgroundColor: c + '22', color: c }}
        >
          {data.sceneNumber}
        </div>
        <span className="text-[11px] font-semibold text-slate-200 truncate flex-1">
          {hasPrompt ? data.prompt : 'Cảnh mới'}
        </span>
        {tag && (
          <span
            className={cn(
              'text-[8px] font-bold px-1.5 h-4 flex items-center justify-center rounded-md border leading-none shrink-0 select-none pointer-events-none',
              tag === 'intro' && 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
              tag === 'outro' && 'bg-amber-500/15 text-amber-400 border-amber-500/20',
              tag === 'transition' && 'bg-slate-500/10 text-slate-500 border-slate-500/15',
            )}
          >
            {tag === 'intro' ? 'Mở đầu' : tag === 'outro' ? 'Kết thúc' : 'Chuyển tiếp'}
          </span>
        )}
        <span className="text-[10px] text-slate-500 font-mono">{data.duration}s</span>
      </div>

      {/* Body */}
      <div className="px-3 pb-2.5">
        {imageCount > 0 ? (
          <div className={cn('flex', imageCount > 1 ? 'h-20 gap-1.5' : 'aspect-[16/9] w-full')}>
            {refPreview && (
              <div
                className={cn(
                  'relative overflow-hidden border border-white/[0.04]',
                  imageCount > 1 ? 'flex-1 rounded-lg' : 'w-full rounded-xl',
                )}
              >
                <img src={refPreview} className="w-full h-full object-cover" alt="" />
                <span className="absolute top-1 left-1 text-[7px] font-extrabold uppercase tracking-widest px-1 h-3.5 flex items-center justify-center rounded-md bg-zinc-950/75 backdrop-blur-md text-white/95 border border-white/[0.08] select-none pointer-events-none leading-none">
                  REF
                </span>
              </div>
            )}
            {lastFramePreview && (
              <div
                className={cn(
                  'relative overflow-hidden border border-white/[0.04]',
                  imageCount > 1 ? 'flex-1 rounded-lg' : 'w-full rounded-xl',
                )}
              >
                <img src={lastFramePreview} className="w-full h-full object-cover" alt="" />
                <span className="absolute top-1 left-1 text-[7px] font-extrabold uppercase tracking-widest px-1 h-3.5 flex items-center justify-center rounded-md bg-zinc-950/75 backdrop-blur-md text-white/95 border border-white/[0.08] select-none pointer-events-none leading-none">
                  END
                </span>
              </div>
            )}
          </div>
        ) : hasPrompt ? (
          <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-3">{data.prompt}</p>
        ) : (
          <div className="flex items-center justify-center h-14 bg-white/[0.02] rounded-xl border border-dashed border-white/[0.06]">
            <span className="text-[10px] text-slate-600">Nhập mô tả cảnh...</span>
          </div>
        )}
      </div>

      {/* Footer indicators */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-white/[0.04] bg-white/[0.01]">
        <div className="flex items-center gap-1.5">
          {hasCamera && <Camera className="h-3 w-3 text-slate-500" />}
          {hasVoice && <Mic className="h-3 w-3 text-slate-500" />}
          {hasRef && <ImageIcon className="h-3 w-3 text-slate-500" />}
          {!hasCamera && !hasVoice && !hasRef && (
            <span className="text-[9px] text-slate-600">{data.aspect_ratio || '16:9'}</span>
          )}
        </div>
        {data.aspect_ratio && (hasCamera || hasVoice || hasRef) && (
          <span className="text-[9px] text-slate-600">{data.aspect_ratio}</span>
        )}
      </div>

      {/* Hover quick actions */}
      <div className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover/node:opacity-100 transition-opacity z-20 pointer-events-auto">
        <button
          onClick={(e) => {
            e.stopPropagation();
            data.onDelete?.(data.nodeId);
          }}
          className="p-1 rounded-lg bg-[#1A1A1E]/90 hover:bg-red-500/20 text-slate-600 hover:text-red-400 transition-colors cursor-pointer"
          title="Xóa"
        >
          <Trash2 className="h-3 w-3" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            data.onDuplicate?.(data.nodeId);
          }}
          className="p-1 rounded-lg bg-[#1A1A1E]/90 hover:bg-white/10 text-slate-600 hover:text-white transition-colors cursor-pointer"
          title="Nhân bản"
        >
          <Copy className="h-3 w-3" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            data.onAddChild?.(data.nodeId);
          }}
          className="p-1 rounded-lg bg-[#1A1A1E]/90 hover:bg-[#FF5A1F]/20 text-slate-600 hover:text-[#FF5A1F] transition-colors cursor-pointer"
          title="Thêm cảnh con"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
    </motion.div>
  );
}
