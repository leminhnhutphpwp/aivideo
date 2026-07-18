'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { PromptStatusBadge } from './prompt-status-badge';
import type { CompileStatus } from './use-compile-prompt';
import {
  Sparkles, Loader2, Copy, RefreshCw, Clock, Zap,
  Camera, Palette, Smile, Sun, Mic, ChevronDown, Music, Upload, X, ImageIcon, Info,
} from 'lucide-react';
import { RichSelect } from '@/components/studio/rich-select';
import {
  CAMERA_OPTIONS, STYLE_OPTIONS, MOOD_OPTIONS, LIGHTING_OPTIONS,
} from '@/components/studio/options';

interface CompiledPromptPanelProps {
  compiledPrompt: string | null;
  status: CompileStatus;
  onCompile: () => void;
  onEdit: (prompt: string) => void;
  sceneCount: number;
  totalDuration: number;
  sharedCamera: string;
  sharedStyle: string;
  sharedMood: string;
  sharedLighting: string;
  sharedNarration: string;
  onSharedSkillChange: (field: string, value: string) => void;
  drivingAudio: string;
  onDrivingAudioChange: (url: string) => void;
  firstFrameImage: string;
  onFirstFrameImageChange: (url: string) => void;
  lastFrameImage: string;
  onLastFrameImageChange: (url: string) => void;
  onUploadFile?: (file: File) => Promise<string>;
}

export function CompiledPromptPanel({
  compiledPrompt,
  status,
  onCompile,
  onEdit,
  sceneCount,
  totalDuration,
  sharedCamera,
  sharedStyle,
  sharedMood,
  sharedLighting,
  sharedNarration,
  onSharedSkillChange,
  drivingAudio,
  onDrivingAudioChange,
  firstFrameImage,
  onFirstFrameImageChange,
  lastFrameImage,
  onLastFrameImageChange,
  onUploadFile,
}: CompiledPromptPanelProps) {
  const handleCopy = () => {
    if (compiledPrompt) {
      navigator.clipboard.writeText(compiledPrompt);
    }
  };

  const [skillsOpen, setSkillsOpen] = useState(true);
  const [skillsHelpOpen, setSkillsHelpOpen] = useState(false);
  const blobUrlsRef = useRef<string[]>([]);

  const trackBlob = (url: string) => {
    blobUrlsRef.current.push(url);
  };

  const revokeBlobs = () => {
    blobUrlsRef.current.forEach(u => URL.revokeObjectURL(u));
    blobUrlsRef.current = [];
  };

  useEffect(() => {
    return () => revokeBlobs();
  }, []);

  useEffect(() => {
    const close = () => setSkillsHelpOpen(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  const handleFileSelect = async (accept: string, onChange: (v: string) => void) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      if (onUploadFile) {
        try {
          const url = await onUploadFile(file);
          onChange(url);
        } catch {
          const preview = URL.createObjectURL(file);
          trackBlob(preview);
          onChange(preview);
        }
      } else {
        const preview = URL.createObjectURL(file);
        trackBlob(preview);
        onChange(preview);
      }
    };
    input.click();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="border-l border-white/[0.04] bg-zinc-950/95 backdrop-blur-xl overflow-y-auto z-10
        flex flex-col
        md:w-[240px] lg:w-[300px] shrink-0
        [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 hover:[&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.04]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#FF5A1F]/10 border border-[#FF5A1F]/20 flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-[#FF5A1F]" />
          </div>
          <span className="text-xs font-semibold text-white">Prompt Narrative</span>
        </div>
        <PromptStatusBadge status={status} />
      </div>

      {/* Shared Skills — collapsible section */}
      <div className="flex items-center justify-between w-full px-4 py-2.5 border-b border-white/[0.04]">
        <button onClick={() => setSkillsOpen(!skillsOpen)} className="flex items-center gap-1 hover:bg-white/[0.02] transition-colors cursor-pointer">
          <div className="relative">
            <Info className="h-3 w-3 text-slate-600 hover:text-slate-400 transition-colors cursor-pointer"
              onClick={(e) => { e.stopPropagation(); setSkillsHelpOpen(v => !v); }} />
            {skillsHelpOpen && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-[#1C1C20] border border-white/[0.08] rounded-xl shadow-md p-3 z-50">
                <p className="text-[10px] text-slate-300 leading-relaxed">
                  Các tùy chọn này được áp dụng cho toàn bộ video. Camera, phong cách, tâm trạng, ánh sáng và lời dẫn được chia sẻ giữa tất cả các cảnh.
                </p>
              </div>
            )}
          </div>
          <span className="text-[11px] font-semibold text-slate-400">Kỹ thuật quay dựng</span>
        </button>
        <motion.div animate={{ rotate: skillsOpen ? 180 : 0 }} transition={{ duration: 0.15 }}>
          <ChevronDown className="h-3.5 w-3.5 text-slate-600" />
        </motion.div>
      </div>

      <motion.div
        initial={false}
        animate={skillsOpen ? { height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } } : { height: 0, opacity: 0, overflow: 'hidden' }}
        transition={{ duration: 0.2 }}
      >
        <div className="px-4 py-3 space-y-3 border-b border-white/[0.04]">
          <RichSelect
            label="Chuyển động Camera"
            value={sharedCamera}
            onChange={v => onSharedSkillChange('camera_movement', v)}
            options={CAMERA_OPTIONS}
            icon={Camera}
            tooltipSide="left"
            compact
          />
          <RichSelect
            label="Phong cách hình ảnh"
            value={sharedStyle}
            onChange={v => onSharedSkillChange('style', v)}
            options={STYLE_OPTIONS}
            icon={Palette}
            tooltipSide="left"
            compact
          />
          <RichSelect
            label="Tâm trạng / Cảm xúc"
            value={sharedMood}
            onChange={v => onSharedSkillChange('mood', v)}
            options={MOOD_OPTIONS}
            icon={Smile}
            tooltipSide="left"
            compact
          />
          <RichSelect
            label="Hiệu ứng ánh sáng"
            value={sharedLighting}
            onChange={v => onSharedSkillChange('lighting', v)}
            options={LIGHTING_OPTIONS}
            icon={Sun}
            tooltipSide="left"
            compact
          />
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
              <Mic className="h-3 w-3" />Lời dẫn (Narration)
            </label>
            <textarea
              value={sharedNarration}
              onChange={e => onSharedSkillChange('narration', e.target.value)}
              placeholder="Lời thuyết minh cho toàn bộ video..."
              rows={3}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-[11px] text-slate-200 placeholder:text-slate-600 outline-none focus:border-[#FF5A1F]/50 transition-all resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
              <Music className="h-3 w-3" />Audio dẫn (Driving Audio)
            </label>
            <p className="text-[9px] text-slate-600">WAV/MP3, 2-30s. Dùng cho lip-sync hoặc timing.</p>
            {drivingAudio ? (
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <span className="text-[11px] text-slate-400 truncate flex-1">{drivingAudio}</span>
                <button onClick={() => onDrivingAudioChange('')}
                  className="p-1 rounded hover:bg-red-500/10 text-slate-600 hover:text-red-400 cursor-pointer">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button onClick={() => handleFileSelect('audio/wav,audio/mp3', onDrivingAudioChange)}
                className="w-full h-10 rounded-xl border border-dashed border-white/[0.08] hover:border-[#FF5A1F]/40 flex items-center justify-center gap-2 text-[11px] text-slate-600 hover:text-slate-400 transition-colors bg-white/[0.01] cursor-pointer">
                <Upload className="h-3.5 w-3.5" /> Chọn audio
              </button>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
              <ImageIcon className="h-3 w-3" />Ảnh khung đầu (First Frame)
            </label>
            <p className="text-[9px] text-slate-600">JPEG/PNG/WEBP, max 20MB. Ảnh bắt đầu video.</p>
            {firstFrameImage ? (
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <span className="text-[11px] text-slate-400 truncate flex-1">{firstFrameImage}</span>
                <button onClick={() => onFirstFrameImageChange('')}
                  className="p-1 rounded hover:bg-red-500/10 text-slate-600 hover:text-red-400 cursor-pointer">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button onClick={() => handleFileSelect('image/jpeg,image/png,image/webp', onFirstFrameImageChange)}
                className="w-full h-10 rounded-xl border border-dashed border-white/[0.08] hover:border-[#FF5A1F]/40 flex items-center justify-center gap-2 text-[11px] text-slate-600 hover:text-slate-400 transition-colors bg-white/[0.01] cursor-pointer">
                <Upload className="h-3.5 w-3.5" /> Chọn ảnh khung đầu
              </button>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
              <ImageIcon className="h-3 w-3" />Ảnh khung cuối (Last Frame)
            </label>
            <p className="text-[9px] text-slate-600">JPEG/PNG/WEBP, max 20MB. Ảnh kết thúc video (tùy chọn).</p>
            {lastFrameImage ? (
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <span className="text-[11px] text-slate-400 truncate flex-1">{lastFrameImage}</span>
                <button onClick={() => onLastFrameImageChange('')}
                  className="p-1 rounded hover:bg-red-500/10 text-slate-600 hover:text-red-400 cursor-pointer">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button onClick={() => handleFileSelect('image/jpeg,image/png,image/webp', onLastFrameImageChange)}
                className="w-full h-10 rounded-xl border border-dashed border-white/[0.08] hover:border-[#FF5A1F]/40 flex items-center justify-center gap-2 text-[11px] text-slate-600 hover:text-slate-400 transition-colors bg-white/[0.01] cursor-pointer">
                <Upload className="h-3.5 w-3.5" /> Chọn ảnh khung cuối
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Body */}
      <div className="flex-1 flex flex-col p-4 gap-3">
        {status === 'idle' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-slate-600" />
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed max-w-[200px]">
              Bấm 'Viết prompt' để AI tạo prompt narrative từ flow
            </p>
            <button
              onClick={onCompile}
              disabled={sceneCount < 2}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-semibold transition-all cursor-pointer',
                'bg-gradient-to-r from-[#FF5A1F] to-[#FF6B35] text-white',
                'hover:from-[#FF6B35] hover:to-[#FF7B45] shadow-[0_2px_12px_rgba(255,90,31,0.25)]',
                'disabled:opacity-40 disabled:cursor-not-allowed',
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Viết prompt
            </button>
            {sceneCount < 2 && (
              <p className="text-[10px] text-slate-600">Cần ít nhất 2 cảnh</p>
            )}
          </div>
        )}

        {status === 'compiling' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 text-[#FF5A1F] animate-spin" />
            <p className="text-[11px] text-slate-400">AI đang viết prompt...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <p className="text-[11px] text-red-400">Có lỗi xảy ra khi compile prompt</p>
            <button
              onClick={onCompile}
              className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-medium
                bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              <RefreshCw className="h-3 w-3" /> Thử lại
            </button>
          </div>
        )}

        {(status === 'compiled' || status === 'stale') && (
          <>
            {status === 'stale' && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Clock className="h-3 w-3 text-amber-400" />
                <span className="text-[10px] text-amber-400 font-medium">
                  Cần viết lại — flow đã thay đổi
                </span>
              </div>
            )}

            <textarea
              value={compiledPrompt || ''}
              onChange={(e) => onEdit(e.target.value)}
              className="flex-1 w-full bg-white/[0.03] border border-white/[0.06] rounded-xl p-3
                text-[11px] text-slate-200 placeholder:text-slate-600
                outline-none focus:border-[#FF5A1F]/50 transition-all resize-none
                min-h-48"
              placeholder="Prompt narrative..."
            />

            <div className="flex items-center gap-2">
              <button
                onClick={onCompile}
                className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-medium
                  bg-[#FF5A1F]/10 border border-[#FF5A1F]/20 text-[#FF5A1F]
                  hover:bg-[#FF5A1F]/20 transition-all"
              >
                <RefreshCw className="h-3 w-3" />
                Viết lại
              </button>
              <button
                onClick={handleCopy}
                className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-medium
                  bg-white/[0.04] border border-white/[0.08] text-slate-400
                  hover:text-white hover:bg-white/[0.06] transition-all"
              >
                <Copy className="h-3 w-3" />
                Sao chép
              </button>
            </div>
          </>
        )}
      </div>

      {/* Bottom meta */}
      <div className="px-4 py-3 border-t border-white/[0.04] flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
          <Clock className="h-3 w-3" />
          <span>{totalDuration}s</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
          <Zap className="h-3 w-3" />
          <span>{sceneCount} cảnh</span>
        </div>
      </div>
    </motion.div>
  );
}
