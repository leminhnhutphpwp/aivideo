'use client';

import { useState } from 'react';
import { laravel, type EnhancePromptContext } from '@/lib/api/client';
import { useToastStore } from '@/stores/toast-store';

export interface EnhanceResult {
  enhanced_prompt: string;
  suggestions: string[];
}

/**
 * Reusable AI prompt-enhancement hook. Calls the shared endpoint and exposes the
 * suggested result + loading state so any prompt input can offer "AI gợi ý".
 */
export function useEnhancePrompt() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EnhanceResult | null>(null);
  const addToast = useToastStore((s) => s.addToast);

  const enhance = async (prompt: string, context: EnhancePromptContext = {}): Promise<EnhanceResult | null> => {
    if (!prompt.trim() || loading) return null;
    setLoading(true);
    try {
      const data = await laravel.enhancePrompt(prompt, context);
      if (!data?.enhanced_prompt) {
        addToast('AI chưa trả về gợi ý', 'error');
        return null;
      }
      setResult(data);
      return data;
    } catch (err: any) {
      addToast(err?.message || 'Lỗi gợi ý prompt', 'error');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => setResult(null);

  return { enhance, loading, result, reset };
}
