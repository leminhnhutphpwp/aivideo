'use client';

import { Camera, Palette, Smile, Sun, Hash } from 'lucide-react';
import { RichSelect } from '@/components/studio/rich-select';
import { CAMERA_OPTIONS, STYLE_OPTIONS, MOOD_OPTIONS, LIGHTING_OPTIONS } from '@/components/studio/options';
import { Section } from '../shared/collapsible-section';
import { inputC } from '../shared/style-constants';

interface PropertyPanelCameraProps {
  cameraMovement: string;
  style: string;
  mood: string;
  lighting: string;
  negativePrompt: string;
  seed?: number;
  onUpdateField: (field: string, value: any) => void;
  open: boolean;
  onToggle: () => void;
}

export function PropertyPanelCamera({
  cameraMovement, style, mood, lighting, negativePrompt, seed,
  onUpdateField, open, onToggle,
}: PropertyPanelCameraProps) {
  const active = !!cameraMovement || !!style || !!mood || seed !== undefined;

  return (
    <Section title="Camera & Phong cách" icon={Camera} open={open} onToggle={onToggle} active={active}>
      <RichSelect
        label="Chuyển động Camera"
        value={cameraMovement}
        onChange={v => onUpdateField('camera_movement', v)}
        options={CAMERA_OPTIONS}
        icon={Camera}
        tooltipSide="left"
        compact
      />
      <RichSelect
        label="Phong cách hình ảnh"
        value={style}
        onChange={v => onUpdateField('style', v)}
        options={STYLE_OPTIONS}
        icon={Palette}
        tooltipSide="left"
        compact
      />
      <RichSelect
        label="Tâm trạng / Cảm xúc"
        value={mood}
        onChange={v => onUpdateField('mood', v)}
        options={MOOD_OPTIONS}
        icon={Smile}
        tooltipSide="left"
        compact
      />
      <RichSelect
        label="Hiệu ứng ánh sáng"
        value={lighting}
        onChange={v => onUpdateField('lighting', v)}
        options={LIGHTING_OPTIONS}
        icon={Sun}
        tooltipSide="left"
        compact
      />
      <div className="space-y-1.5 pt-1">
        <label className="text-[10px] font-semibold text-slate-500">Mô tả loại trừ (Negative prompt)</label>
        <input
          value={negativePrompt}
          onChange={e => onUpdateField('negative_prompt', e.target.value)}
          placeholder="Những thứ cần tránh..."
          className={inputC}
        />
      </div>
      <div className="space-y-1.5 pt-1">
        <label className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
          <Hash className="h-3 w-3" /> Seed (tùy chọn)
        </label>
        <input
          type="number"
          value={seed ?? ''}
          onChange={e => onUpdateField('seed', e.target.value ? Number(e.target.value) : undefined)}
          placeholder="Để trống = random"
          className={inputC}
        />
      </div>
    </Section>
  );
}
