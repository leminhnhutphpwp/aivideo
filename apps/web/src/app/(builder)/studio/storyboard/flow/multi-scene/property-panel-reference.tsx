'use client';

import { ImageIcon, Upload, X, Trash2 } from 'lucide-react';
import { Section } from '../shared/collapsible-section';

interface PropertyPanelReferenceProps {
  referenceImage: string;
  lastFrameImage: string;
  refPreviewUrl?: string;
  onUpdateField: (field: string, value: any) => void;
  onOpenRefPicker: (field: 'reference_image' | 'last_frame_image') => void;
  hasRefImage: boolean;
  open: boolean;
  onToggle: () => void;
}

export function PropertyPanelReference({
  referenceImage, lastFrameImage, refPreviewUrl,
  onUpdateField, onOpenRefPicker, hasRefImage, open, onToggle,
}: PropertyPanelReferenceProps) {
  return (
    <Section title="Ảnh tham chiếu" icon={ImageIcon} open={open} onToggle={onToggle} active={hasRefImage}>
      <div className="space-y-2.5">
        <label className="text-[10px] font-medium text-slate-500">Ảnh tham chiếu</label>
        {referenceImage ? (
          <div className="relative rounded-xl overflow-hidden border border-white/[0.08] group/ref">
            {refPreviewUrl && <img src={refPreviewUrl} className="w-full h-24 object-cover" alt="" />}
            <button onClick={() => onUpdateField('reference_image', '')}
              className="absolute top-2 right-2 p-1 rounded-lg bg-zinc-950/70 text-white/60 hover:text-white opacity-0 group-hover/ref:opacity-100 transition-all cursor-pointer">
              <X className="h-3.5 w-3.5" />
            </button>
            <span className="absolute bottom-2 left-2 text-[9px] text-white/40 bg-zinc-950/60 rounded-md px-1.5 py-0.5">
              {referenceImage.substring(0, 20)}
            </span>
          </div>
        ) : (
          <button onClick={() => onOpenRefPicker('reference_image')}
            className="w-full h-20 rounded-xl border border-dashed border-white/[0.08] hover:border-[#FF5A1F]/40 flex flex-col items-center justify-center gap-1.5 text-slate-600 hover:text-slate-400 transition-colors group/upload bg-white/[0.01] cursor-pointer">
            <Upload className="h-5 w-5 group-hover/upload:text-[#FF5A1F] transition-colors" />
            <span className="text-[11px]">Chọn từ thư viện</span>
          </button>
        )}
        <label className="text-[10px] font-medium text-slate-500">Ảnh khung cuối</label>
        {lastFrameImage ? (
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <span className="text-[11px] text-slate-400 truncate">{lastFrameImage}</span>
            <button onClick={() => onUpdateField('last_frame_image', '')}
              className="p-1 rounded hover:bg-red-500/10 text-slate-600 hover:text-red-400 cursor-pointer">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <button onClick={() => onOpenRefPicker('last_frame_image')}
            className="w-full h-10 rounded-xl border border-dashed border-white/[0.08] hover:border-[#FF5A1F]/40 flex items-center justify-center gap-2 text-[11px] text-slate-600 hover:text-slate-400 transition-colors bg-white/[0.01] cursor-pointer">
            <Upload className="h-3.5 w-3.5" /> Chọn ảnh khung cuối
          </button>
        )}
      </div>
    </Section>
  );
}
