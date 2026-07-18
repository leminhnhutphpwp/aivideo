'use client';

import { cn } from '@/lib/utils';
import { inputC, pillBase, pillActive, pillInactive } from '../shared/style-constants';
import { Section } from '../shared/collapsible-section';
import { Eye } from 'lucide-react';
import { CustomSelect } from '@/components/ui/select';

interface PropertyPanelBasicProps {
  prompt: string;
  durationSeconds: number;
  aspectRatio: string;
  resolution: string;
  durations: number[];
  renderMode: 'multi_scene' | 'single_flow';
  onUpdateField: (field: string, value: any) => void;
  open: boolean;
  onToggle: () => void;
}

export function PropertyPanelBasic({
  prompt, durationSeconds, aspectRatio, resolution, durations,
  renderMode, onUpdateField, open, onToggle,
}: PropertyPanelBasicProps) {
  const active = !!prompt;

  return (
    <Section title="Cơ bản" icon={Eye} open={open} onToggle={onToggle} active={active}>
      <textarea
        value={prompt}
        onChange={e => onUpdateField('prompt', e.target.value)}
        placeholder="Mô tả cảnh này..." rows={3} maxLength={2000}
        className={inputC + " h-auto resize-none py-2.5"}
      />
      {renderMode === 'multi_scene' && (<>
        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold text-slate-500 block">Thời lượng cảnh</label>
          <div className="flex gap-1">
            {(durations || []).map(d => (
              <button key={d} onClick={() => onUpdateField('duration_seconds', d)}
                className={cn(pillBase, durationSeconds === d ? pillActive : pillInactive)}>
                {d}s
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold text-slate-500 block">Tỷ lệ khung hình</label>
          <div className="flex gap-1">
            {['16:9', '9:16', '1:1', '4:3'].map(r => (
              <button key={r} onClick={() => onUpdateField('aspect_ratio', r)}
                className={cn(pillBase, aspectRatio === r ? pillActive : pillInactive)}>
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-slate-500 shrink-0">Độ phân giải</label>
          <CustomSelect value={resolution} onChange={v => onUpdateField('resolution', v)}
            options={['720p', '1080p']} className="flex-1" />
        </div>
      </>)}
    </Section>
  );
}
