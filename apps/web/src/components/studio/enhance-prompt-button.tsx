'use client';

import { useState } from 'react';
import { Sparkles, Loader2, Check, X } from 'lucide-react';
import { useEnhancePrompt } from '@/hooks/use-enhance-prompt';
import type { EnhancePromptContext } from '@/lib/api/client';

interface EnhancePromptButtonProps {
  prompt: string;
  context?: EnhancePromptContext;
  /** Called when the user accepts the suggested prompt. */
  onApply: (enhanced: string) => void;
  /** Button label. Defaults to "AI gợi ý"; override per call site (e.g. "AI gợi ý sửa"). */
  label?: string;
  className?: string;
}

/**
 * Drop-in "AI gợi ý prompt" action: disabled until a prompt is typed, runs the
 * shared enhancer, and shows the suggestion in a preview popover with Dùng/Bỏ
 * (non-destructive). Reusable next to any prompt input — pass its own `context`.
 */
export function EnhancePromptButton({ prompt, context, onApply, label = 'AI gợi ý sửa', className }: EnhancePromptButtonProps) {
  const { enhance, loading, result, reset } = useEnhancePrompt();
  const [open, setOpen] = useState(false);
  const empty = !prompt.trim();

  const run = async () => {
    const r = await enhance(prompt, context);
    if (r) setOpen(true);
  };

  const apply = () => {
    if (result) onApply(result.enhanced_prompt);
    setOpen(false);
    reset();
  };

  const dismiss = () => {
    setOpen(false);
    reset();
  };

  return (
    <div className={`relative ${className ?? ''}`}>
      <button
        type="button"
        onClick={run}
        disabled={empty || loading}
        title={empty ? 'Nhập prompt trước để dùng AI gợi ý' : 'AI gợi ý prompt hoàn thiện hơn dựa trên skill & tuỳ chọn của bạn'}
        className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#FF5A1F]/10 text-[#FF5A1F] text-xs font-semibold hover:bg-[#FF5A1F]/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
        {label}
      </button>

      {open && result && (
        <>
          <div className="fixed inset-0 z-40" onClick={dismiss} />
          <div className="absolute left-0 top-10 z-50 w-[min(420px,90vw)] max-sm:fixed max-sm:inset-x-3 max-sm:left-3 max-sm:right-3 max-sm:top-auto max-sm:bottom-4 max-sm:w-auto max-sm:max-h-[80vh] max-sm:overflow-y-auto rounded-xl border border-white/10 bg-[#1f1c25] shadow-xl p-4 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#FF5A1F]">
              <Sparkles className="h-3.5 w-3.5" /> Prompt gợi ý
            </div>
            <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
              {result.enhanced_prompt}
            </p>
            {result.suggestions?.length > 0 && (
              <ul className="text-[11px] text-slate-400 space-y-1 list-disc pl-4">
                {result.suggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={dismiss}
                className="flex items-center gap-1 h-8 px-3 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                <X className="h-3.5 w-3.5" /> Bỏ
              </button>
              <button
                type="button"
                onClick={apply}
                className="flex items-center gap-1 h-8 px-4 rounded-lg bg-[#FF5A1F] hover:bg-[#FF6A2B] text-white text-xs font-bold transition-all cursor-pointer"
              >
                <Check className="h-3.5 w-3.5" /> Dùng
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
