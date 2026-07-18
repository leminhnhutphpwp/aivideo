'use client';

import { motion } from 'motion/react';
import { Eye, Palette, Sun, Camera, Wind, Image as ImageIcon, X, Film, UserRound, Play } from 'lucide-react';
import { RichSelect, type OptionDef, OptionIcon } from '@/components/studio/rich-select';
import { findOption, buildLiveDescription } from '@/components/studio/options';
import { type VideoScene, type VideoFeature } from './types';
import { EnhancePromptButton } from '@/components/studio/enhance-prompt-button';

interface VideoSceneEditorProps {
  scene: VideoScene;
  filteredStyleOptions: OptionDef[];
  filteredMoodOptions: OptionDef[];
  filteredCameraOptions: OptionDef[];
  filteredLightingOptions: OptionDef[];
  durations: number[];
  feature: VideoFeature;
  /** Selected direction preset id (for AI prompt enhancement context); 'none' if unset. */
  skillId?: string;
  onUpdate: (field: string, value: any) => void;
  onOpenPicker: (sceneId: string, target: 'firstFrame' | 'lastFrame') => void;
  uploadingSceneId: string | null;
}

function ImageUpload({ label, preview, fileName, icon: Icon = ImageIcon, onSelect, onClear }: {
  label: string;
  preview: string;
  fileName?: string;
  icon?: any;
  onSelect: () => void;
  onClear: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-semibold text-slate-500">{label}</label>
      {preview ? (
        <div className="relative rounded-xl border border-white/10 overflow-hidden bg-white/[0.02] group max-w-[200px]">
          <div className="w-full aspect-square relative overflow-hidden bg-zinc-950">
            <img src={preview} alt="" className="w-full h-full object-cover" />
          </div>
          <button onClick={onClear}
            className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-zinc-950/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 text-white/70 hover:text-white cursor-pointer">
            <X className="h-3 w-3" />
          </button>
          <div className="p-2 border-t border-white/5">
            <p className="text-[10px] font-medium text-white truncate">{fileName || label}</p>
          </div>
        </div>
      ) : (
        <button onClick={onSelect}
          className="flex items-center gap-2 h-10 px-4 rounded-xl border border-dashed border-[#FF5A1F]/30 bg-[#FF5A1F]/5 text-xs font-medium text-[#FF5A1F] hover:bg-[#FF5A1F]/10 hover:border-[#FF5A1F]/50 transition-all cursor-pointer">
          <Icon className="h-4 w-4" /> {label}
        </button>
      )}
    </div>
  );
}

export function VideoSceneEditor({
  scene,
  filteredStyleOptions,
  filteredMoodOptions,
  filteredCameraOptions,
  filteredLightingOptions,
  durations,
  feature,
  skillId,
  onUpdate,
  onOpenPicker,
  uploadingSceneId,
}: VideoSceneEditorProps) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
      className="bg-zinc-950 border border-white/5 rounded-2xl relative"
    >
      <div className="flex items-center justify-between px-3 md:px-5 py-2 md:py-3 bg-white/[0.02] border-b border-white/5 rounded-t-2xl">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-white">Cảnh</span>
          {scene.prompt && <span className="text-xs text-slate-600">{scene.duration}s</span>}
          <div className="hidden md:flex items-center gap-1 ml-2">
            {findOption(filteredStyleOptions, scene.style) && <OptionIcon icon={findOption(filteredStyleOptions, scene.style)!.icon} className="h-3 w-3 text-slate-600" />}
            {findOption(filteredMoodOptions, scene.mood) && <OptionIcon icon={findOption(filteredMoodOptions, scene.mood)!.icon} className="h-3 w-3 text-slate-600" />}
            {findOption(filteredCameraOptions, scene.camera) && <OptionIcon icon={findOption(filteredCameraOptions, scene.camera)!.icon} className="h-3 w-3 text-slate-600" />}
            {findOption(filteredLightingOptions, scene.lighting) && <OptionIcon icon={findOption(filteredLightingOptions, scene.lighting)!.icon} className="h-3 w-3 text-slate-600" />}
          </div>
        </div>
      </div>

      <div className="p-3 md:p-5 space-y-3">
        <textarea value={scene.prompt} onChange={e => onUpdate('prompt', e.target.value)}
          placeholder="Mô tả cảnh quay: chủ thể, hành động, bối cảnh..."
          rows={3} maxLength={feature === 'video-edit' || feature === 'video-editing' ? 5000 : 2000}
          className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-[#FF5A1F]/30 transition-all placeholder:text-slate-700 resize-none font-medium leading-relaxed"
        />
        <div className="flex items-center justify-between">
          <EnhancePromptButton
            prompt={scene.prompt}
            context={{
              surface: 'video',
              skill_id: skillId && skillId !== 'none' ? skillId : undefined,
              style: scene.style,
              mood: scene.mood,
              camera: scene.camera,
              lighting: scene.lighting,
            }}
            onApply={(v) => onUpdate('prompt', v)}
          />
          <span className="text-[10px] text-slate-600">{scene.prompt.length}/{feature === 'video-edit' || feature === 'video-editing' ? 5000 : 2000}</span>
        </div>

        <div className="bg-[#FF5A1F]/5 border border-[#FF5A1F]/10 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Eye className="h-3 w-3 text-[#FF5A1F]" />
            <span className="text-[10px] font-semibold text-[#FF5A1F] uppercase tracking-wider">Xem trước hiệu ứng</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">{buildLiveDescription(scene)}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="space-y-1 min-w-[90px]">
            <label className="text-[10px] font-semibold text-slate-500">Thời lượng</label>
            <div className="flex flex-wrap gap-1">
              {durations.map(d => (
                <button key={d} onClick={() => onUpdate('duration', d)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${scene.duration === d ? 'bg-[#FF5A1F]/15 text-[#FF5A1F]' : 'bg-white/5 text-slate-500 hover:text-white'}`}>{d}s</button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <RichSelect label="Phong cách" value={scene.style} onChange={v => onUpdate('style', v)} options={filteredStyleOptions} icon={Palette} />
          <RichSelect label="Tâm trạng" value={scene.mood} onChange={v => onUpdate('mood', v)} options={filteredMoodOptions} icon={Sun} />
          <RichSelect label="Máy quay" value={scene.camera} onChange={v => onUpdate('camera', v)} options={filteredCameraOptions} icon={Camera} />
          <RichSelect label="Ánh sáng" value={scene.lighting} onChange={v => onUpdate('lighting', v)} options={filteredLightingOptions} icon={Wind} />
        </div>

        {feature === 'image-to-video' && (
          <div className="border-t border-white/5 pt-3 mt-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <ImageUpload label="First frame" preview={scene.referencePreview} fileName={scene.referenceImage}
                onSelect={() => onOpenPicker(scene.id, 'firstFrame')}
                onClear={() => { onUpdate('referenceImage', ''); onUpdate('referencePreview', ''); }}
              />
              <div className="flex items-center gap-2 text-[10px] text-slate-600">
                <div className="h-px w-8 bg-white/[0.06]" />
                <span>or add last frame for frame interpolation</span>
                <div className="h-px w-8 bg-white/[0.06]" />
              </div>
              <ImageUpload label="Last frame (optional)" preview={scene.lastFramePreview} fileName={scene.lastFrameImage}
                onSelect={() => onOpenPicker(scene.id, 'lastFrame')}
                onClear={() => { onUpdate('lastFrameImage', ''); onUpdate('lastFramePreview', ''); }}
              />
            </div>
          </div>
        )}

        {(feature === 'video-edit' || feature === 'video-editing') && (
          <div className="border-t border-white/5 pt-3 mt-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-500">Video tham chiếu</label>
              {scene.referencePreview ? (
                <div className="relative rounded-xl border border-white/10 overflow-hidden bg-white/[0.02] group max-w-[200px]">
                  <div className="w-full aspect-square relative group/preview overflow-hidden bg-zinc-950">
                    <video src={scene.referencePreview} className="w-full h-full object-cover" muted preload="metadata" />
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/40 opacity-0 group-hover/preview:opacity-100 transition-opacity">
                      <div className="h-8 w-8 rounded-full bg-[#FF5A1F] flex items-center justify-center shadow-sm">
                        <Play className="h-3.5 w-3.5 text-white fill-white ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <button onClick={() => { onUpdate('referenceImage', ''); onUpdate('referencePreview', ''); }}
                    className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-zinc-950/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 text-white/70 hover:text-white cursor-pointer">
                    <X className="h-3 w-3" />
                  </button>
                  <div className="p-2 border-t border-white/5">
                    <p className="text-[10px] font-medium text-white truncate">{scene.referenceImage || 'Video tham chiếu'}</p>
                  </div>
                </div>
              ) : (
                <button onClick={() => onOpenPicker(scene.id, 'firstFrame')}
                  className="flex items-center gap-2 h-10 px-4 rounded-xl border border-dashed border-[#FF5A1F]/30 bg-[#FF5A1F]/5 text-xs font-medium text-[#FF5A1F] hover:bg-[#FF5A1F]/10 hover:border-[#FF5A1F]/50 transition-all cursor-pointer">
                  <Film className="h-4 w-4" /> Tải video lên
                </button>
              )}
            </div>
          </div>
        )}

        {feature === 'character-animation' && (
          <div className="border-t border-white/5 pt-3 mt-3">
            <ImageUpload label="Ảnh nhân vật" preview={scene.referencePreview} fileName={scene.referenceImage} icon={UserRound}
              onSelect={() => onOpenPicker(scene.id, 'firstFrame')}
              onClear={() => { onUpdate('referenceImage', ''); onUpdate('referencePreview', ''); }}
            />
          </div>
        )}

        <div className="pt-3 border-t border-white/5">
          <label className="text-[10px] font-semibold text-slate-500">Những thứ không muốn xuất hiện (negative prompt)</label>
          <textarea value={scene.negativePrompt} onChange={e => onUpdate('negativePrompt', e.target.value)}
            placeholder="Ví dụ: người, chữ, biển báo, mờ, nhiễu..."
            rows={2} maxLength={500}
            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-[#FF5A1F]/30 transition-all placeholder:text-slate-700 resize-none font-medium"
          />
          <div className="flex justify-end text-[10px] text-slate-600">{scene.negativePrompt.length}/500</div>
        </div>
      </div>
    </motion.div>
  );
}
