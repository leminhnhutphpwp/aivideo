'use client';

import { useEffect, useRef, useCallback } from 'react';
import { subscribeUserJobs } from '@/lib/echo';
import { useAuthStore } from '@/stores/auth-store';

export interface JobEvent {
  job_id: string;
  status: string;
  stage?: string;
  progress?: string;
  output_path?: string;
  error?: string;
}

interface UseRealtimeJobsOptions {
  onQueued?: (e: JobEvent) => void;
  onProgress?: (e: JobEvent) => void;
  onCompleted?: (e: JobEvent) => void;
  onFailed?: (e: JobEvent) => void;
}

export function useRealtimeJobs(options: UseRealtimeJobsOptions) {
  const userUuid = useAuthStore(s => s.user?.uuid);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!userUuid) return;

    const unsub = subscribeUserJobs(userUuid, {
      onQueued: (e: JobEvent) => optionsRef.current.onQueued?.(e),
      onProgress: (e: JobEvent) => optionsRef.current.onProgress?.(e),
      onCompleted: (e: JobEvent) => optionsRef.current.onCompleted?.(e),
      onFailed: (e: JobEvent) => optionsRef.current.onFailed?.(e),
    });

    return () => { unsub?.(); };
  }, [userUuid]);
}

let lastCheck = 0;
const CHECK_INTERVAL_MS = 30_000;

export function initRealtimeCheck() {
  const now = Date.now();
  if (now - lastCheck < CHECK_INTERVAL_MS) return;
  lastCheck = now;
}
