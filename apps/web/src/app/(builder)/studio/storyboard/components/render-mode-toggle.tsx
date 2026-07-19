'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { useRenderMode } from './render-mode-provider';
import { Film, Sparkles, ImageIcon } from 'lucide-react';
import { useCompilePrompt } from '../flow/single-flow/use-compile-prompt';
import { MULTI_SCENE_ENABLED } from '../flow/shared/constants';

export function RenderModeToggle() {
  const { renderMode, setRenderMode } = useRenderMode();
  const { compiledPrompt, compileStatus } = useCompilePrompt();
  const [confirmSwitch, setConfirmSwitch] = useState<'multi_scene' | 'single_flow' | 'storyboard_image' | null>(null);

  const handleToggle = (mode: 'multi_scene' | 'single_flow' | 'storyboard_image') => {
    if (mode === renderMode) return;
    setConfirmSwitch(mode);
  };

  const confirmSwitchMode = () => {
    if (!confirmSwitch) return;
    setRenderMode(confirmSwitch);
    setConfirmSwitch(null);
  };

  const hasCompiled = compiledPrompt && (compileStatus === 'compiled' || compileStatus === 'stale');
  const icon = (mode: string) => {
    if (confirmSwitch === mode) {
      if (mode === 'multi_scene') return <Film className="h-6 w-6 text-[#FF5A1F]" />;
      if (mode === 'storyboard_image') return <ImageIcon className="h-6 w-6 text-[#FF5A1F]" />;
      return <Sparkles className="h-6 w-6 text-[#FF5A1F]" />;
    }
    return null;
  };

  const confirmLabel = (mode: string) => {
    if (mode === 'multi_scene') return 'Chuyển sang Ghép cảnh';
    if (mode === 'storyboard_image') return 'Chuyển sang Multi-Panel';
    return 'Chuyển sang One-Shot';
  };

  return (
    <>
      <div className="flex items-center h-8 bg-white/[0.04] rounded-xl p-0.5 border border-white/12">
        <button
          onClick={() => handleToggle('single_flow')}
          className={cn(
            'flex items-center gap-1.5 h-7 px-3 rounded-lg text-[11px] font-medium transition-all cursor-pointer',
            renderMode === 'single_flow'
              ? 'bg-[#FF5A1F]/15 text-[#FF5A1F]'
              : 'text-slate-500 hover:text-slate-300'
          )}
        >
          <Sparkles className="h-3.5 w-3.5 shrink-0" /> <span className={renderMode === 'single_flow' ? '' : 'hidden lg:inline'}>One-Shot</span>
        </button>
        <button
          onClick={() => handleToggle('storyboard_image')}
          className={cn(
            'flex items-center gap-1.5 h-7 px-3 rounded-lg text-[11px] font-medium transition-all cursor-pointer',
            renderMode === 'storyboard_image'
              ? 'bg-[#FF5A1F]/15 text-[#FF5A1F]'
              : 'text-slate-500 hover:text-slate-300'
          )}
        >
          <ImageIcon className="h-3.5 w-3.5 shrink-0" /> <span className={renderMode === 'storyboard_image' ? '' : 'hidden lg:inline'}>Multi-Panel</span>
        </button>
        <button
          onClick={() => MULTI_SCENE_ENABLED && handleToggle('multi_scene')}
          disabled={!MULTI_SCENE_ENABLED}
          title={MULTI_SCENE_ENABLED ? undefined : 'Ghép cảnh — Sắp ra mắt'}
          className={cn(
            'flex items-center gap-1.5 h-7 px-3 rounded-lg text-[11px] font-medium transition-all',
            MULTI_SCENE_ENABLED ? 'cursor-pointer' : 'cursor-not-allowed',
            renderMode === 'multi_scene'
              ? 'bg-[#FF5A1F]/15 text-[#FF5A1F]'
              : MULTI_SCENE_ENABLED
                ? 'text-slate-500 hover:text-slate-300'
                : 'text-slate-400'
          )}
        >
          <Film className="h-3.5 w-3.5 shrink-0" /> <span className={renderMode === 'multi_scene' ? '' : 'hidden lg:inline'}>Ghép cảnh</span>
          {!MULTI_SCENE_ENABLED && (
            <span className="ml-0.5 text-[8px] leading-none px-1 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20 whitespace-nowrap">
              Sắp ra mắt
            </span>
          )}
        </button>
      </div>

      <AnimatePresence>
        {confirmSwitch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#16141a]/70 backdrop-blur-md z-[60] flex items-center justify-center p-4"
            onClick={() => setConfirmSwitch(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-[#1f1c25] border border-white/12 rounded-2xl shadow-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 text-center">
                <div className="h-12 w-12 rounded-2xl bg-[#FF5A1F]/10 border border-[#FF5A1F]/20 flex items-center justify-center mx-auto mb-4">
                  {icon(confirmSwitch)}
                </div>
                <h3 className="text-sm font-semibold text-white mb-2">
                  {confirmSwitch === 'multi_scene' ? 'Chuyển sang Ghép cảnh?' :
                   confirmSwitch === 'storyboard_image' ? 'Chuyển sang Multi-Panel?' :
                   'Chuyển sang One-Shot?'}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {confirmSwitch === 'multi_scene'
                    ? hasCompiled
                      ? 'Compiled prompt hiện tại sẽ bị ẩn (không mất). Bạn có thể quay lại sau.'
                      : 'Bạn sẽ tự tùy chỉnh từng cảnh riêng lẻ. Mỗi cảnh sẽ render thành video riêng rồi ghép lại.'
                    : confirmSwitch === 'storyboard_image'
                    ? 'Tải lên một bảng phân cảnh nhiều khung. AI sẽ dùng ảnh này làm tham chiếu để sinh video hoàn chỉnh.'
                    : hasCompiled
                    ? 'Compiled prompt hiện tại sẽ được giữ lại. Tiếp tục chỉnh sửa?'
                    : 'AI sẽ đọc flow của bạn và viết thành 1 prompt narrative hoàn chỉnh, liền mạch.'}
                </p>
                <p className="text-[10px] text-slate-500 mt-3">
                  Canvas (cảnh & kết nối) được giữ nguyên — bạn sẽ không mất dữ liệu.
                </p>
              </div>
              <div className="flex border-t border-white/12">
                <button
                  onClick={() => setConfirmSwitch(null)}
                  className="flex-1 h-11 text-[11px] font-medium text-slate-400 hover:text-white hover:bg-white/[0.02] transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  onClick={confirmSwitchMode}
                  className="flex-1 h-11 text-[11px] font-semibold text-[#FF5A1F] hover:bg-[#FF5A1F]/5 transition-colors border-l border-white/12 cursor-pointer"
                >
                  {confirmLabel(confirmSwitch)}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
