'use client';

import { Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PreviewBox } from '@/components/studio/preview-box';
import { PricePreview } from '@/components/studio/price-preview';
import { type VideoFeature } from './types';

interface VideoSidebarProps {
  aspect: string;
  aspects: string[];
  onAspectChange: (a: string) => void;
  resolution: string;
  resolutions: { code: string; name: string; multiplier: number; }[];
  onResolutionChange: (r: string) => void;
  hasPrompt: boolean;
  totalDuration: number;
  generating: boolean;
  daemonOk: boolean | null;
  onGenerate: () => void;
  feature: VideoFeature;
  priceData: any;
  priceLoading: boolean;
  priceError: string | null;
}

const FEATURE_TEXTS: Record<string, string | undefined> = {
  'text-to-video': 'Tạo video từ văn bản thuần túy',
  'image-to-video': 'Hỗ trợ image-to-video — thêm ảnh tham chiếu trong từng cảnh',
  'reference-to-video': 'Hỗ trợ reference-to-video — thêm ảnh tham chiếu nhân vật',
  'video-edit': 'Chỉnh sửa video dựa trên mô tả văn bản',
  'character-animation': 'Tạo hoạt hình chuyển động cho nhân vật',
};

export function VideoSidebar({
  aspect,
  aspects,
  onAspectChange,
  resolution,
  resolutions,
  onResolutionChange,
  hasPrompt,
  totalDuration,
  generating,
  daemonOk,
  onGenerate,
  feature,
  priceData,
  priceLoading,
  priceError,
}: VideoSidebarProps) {
  return (
    <div className="col-span-12 lg:col-span-4 space-y-4">
      <div className="bg-zinc-950 border border-white/5 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white">Cấu hình chung</h3>

        {feature !== 'video-edit' && feature !== 'video-editing' && (
          <div className="space-y-2">
            <label className="text-xs text-slate-500">Tỷ lệ khung hình</label>
            <div className="flex flex-wrap gap-1.5">
              {aspects.map(a => (
                <button key={a} onClick={() => onAspectChange(a)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${aspect === a ? 'bg-[#FF5A1F]/15 text-[#FF5A1F]' : 'bg-white/5 text-slate-500 hover:text-white'}`}>{a}</button>
              ))}
            </div>
            <PreviewBox aspect={aspect} />
          </div>
        )}

        {resolutions.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs text-slate-500">Độ phân giải</label>
            <div className="flex flex-wrap gap-1.5">
              {resolutions.map(r => (
                <button key={r.code} onClick={() => onResolutionChange(r.code)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${resolution === r.code ? 'bg-[#FF5A1F]/15 text-[#FF5A1F]' : 'bg-white/5 text-slate-500 hover:text-white'}`}>
                  {r.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {(feature === 'image-to-video' || feature === 'reference-to-video' || feature === 'video-edit' || feature === 'video-editing') && (
          <div className="text-[10px] text-slate-600 bg-white/[0.02] border border-white/5 rounded-xl p-3 leading-relaxed">
            {FEATURE_TEXTS[feature] || 'Chỉnh sửa video dựa trên mô tả văn bản'}
          </div>
        )}

        {/* Voiceover removed — will be post-generation, like storyboard */}
      </div>

      <div className="sticky top-24 space-y-4 z-10 lg:top-24">
        <div className="bg-gradient-to-b from-[#0c0c0c] to-[#080808] border border-white/5 rounded-2xl overflow-hidden flex flex-col shadow-md shadow-black/50">
          <PricePreview
            priceData={priceData}
            loading={priceLoading}
            error={priceError}
            quantity={hasPrompt ? 1 : 0}
            className="border-0 rounded-none bg-transparent"
          />

          <div className="p-5 space-y-3 border-t border-white/5 bg-zinc-950/20">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Thời lượng</span>
              <span className="text-white font-semibold">{totalDuration}s</span>
            </div>
            <Button onClick={onGenerate} disabled={!hasPrompt || generating || daemonOk === false}
              className="w-full h-12 rounded-xl bg-[#FF5A1F] hover:bg-[#FF6A2B] text-white font-bold text-sm transition-all disabled:opacity-50 shadow-sm shadow-[#FF5A1F]/20 mt-2">
              {generating ? (
                <><div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin mr-2" />Đang tạo video...</>
              ) : (
                <><Wand2 className="mr-2 h-4 w-4" />Tạo video{priceData?.pricing?.total_credits ? ` — ${(priceData.user_plan?.final_total ?? priceData.pricing.total_credits).toLocaleString('vi-VN')} credits` : ''}</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
