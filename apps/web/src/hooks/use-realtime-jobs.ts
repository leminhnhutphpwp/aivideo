'use client';

import { useEffect, useRef, useCallback } from 'react';
import { subscribeUserJobs } from '@/lib/echo';
import { useAuthStore } from '@/stores/auth-store';

export interface JobEvent {
  /** RenderJob uuid — backend `.job.progress` sends this as `job_id`. */
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
  /** `.job.cancelled` — reflect the cancellation in the caller's job list. */
  onCancelled?: (e: JobEvent) => void;
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
      onCancelled: (e: JobEvent) => optionsRef.current.onCancelled?.(e),
      // Backend `.credits.updated` → keep the auth store balance fresh without
      // polling. Fires regardless of whether a consumer opts into job events.
      onCredits: ({ balance }: { balance: number }) =>
        useAuthStore.getState().setCredits(balance),
    });

    return () => { unsub?.(); };
  }, [userUuid]);
}
