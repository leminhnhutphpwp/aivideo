'use client';

import { cn } from '@/lib/utils';
import { Grid3X3, Maximize2, Presentation } from 'lucide-react';

interface BottomBarProps {
  showGrid: boolean;
  onToggleGrid: () => void;
  onAutoLayout: () => void;
  playbackActive: boolean;
  onPlayback: () => void;
  nodeCount: number;
}

export function BottomBar({
  showGrid, onToggleGrid, onAutoLayout, playbackActive, onPlayback, nodeCount,
}: BottomBarProps) {
  return (
    <div className="h-8 md:flex items-center justify-between px-4 border-t border-white/[0.06] bg-[#18181B] shrink-0 z-20 hidden">
      <div className="flex items-center gap-3">
        <button onClick={onToggleGrid} className={cn("flex items-center gap-1 text-[10px] transition-colors cursor-pointer", showGrid ? "text-slate-500" : "text-slate-700")}><Grid3X3 className="h-3 w-3" /> Lưới</button>
        <button onClick={onAutoLayout} className="flex items-center gap-1 text-[10px] text-slate-600 hover:text-slate-400 transition-colors cursor-pointer"><Maximize2 className="h-3 w-3" /> Sắp xếp</button>
        <div className="h-3 w-px bg-white/[0.08]" />
        <button onClick={onPlayback} disabled={playbackActive}
          className={cn("cursor-pointer flex items-center gap-1 text-[10px] transition-colors", playbackActive ? "text-[#FF5A1F]" : "text-slate-600 hover:text-slate-400")}>
          <Presentation className="h-3 w-3" /> {playbackActive ? 'Đang trình chiếu...' : 'Trình chiếu'}
        </button>
      </div>
      <div className="flex items-center gap-3 text-[10px] text-slate-600">
        <span>{nodeCount} cảnh</span>
        <div className="w-px h-3 bg-white/[0.08]" />
        <span>Kéo chấm tròn giữa các cảnh để kết nối</span>
      </div>
    </div>
  );
}
