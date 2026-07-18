'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { laravel } from '@/lib/api/client';

export type CompileStatus = 'idle' | 'compiling' | 'compiled' | 'stale' | 'error';

export function useCompilePrompt() {
  const [compiledPrompt, setCompiledPrompt] = useState<string | null>(null);
  const [compileStatus, setCompileStatus] = useState<CompileStatus>('idle');
  const staleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (staleTimerRef.current) clearTimeout(staleTimerRef.current);
    };
  }, []);

  const compilePrompt = useCallback(async (uuid: string) => {
    if (staleTimerRef.current) {
      clearTimeout(staleTimerRef.current);
      staleTimerRef.current = null;
    }
    setCompileStatus('compiling');
    try {
      const result = await laravel.compilePrompt(uuid);
      const prompt = result?.compiled_prompt;
      setCompiledPrompt(prompt);
      setCompileStatus('compiled');
    } catch {
      setCompileStatus('error');
      staleTimerRef.current = setTimeout(() => setCompileStatus('stale'), 3000);
    }
  }, []);

  const markStale = useCallback(() => {
    if (compileStatus === 'compiled') {
      setCompileStatus('stale');
    }
  }, [compileStatus]);

  return { compiledPrompt, compileStatus, compilePrompt, markStale, setCompiledPrompt, setCompileStatus };
}
