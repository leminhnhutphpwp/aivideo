'use client';

import { useEffect, useRef, useState } from 'react';
import { laravel } from '@/lib/api/client';

interface CreditEstimationParams {
  sceneCount: number;
  totalDuration: number;
  planTier: string;
  renderMode: 'multi_scene' | 'single_flow' | 'storyboard_image';
  durationTiers: number[];
}

export function useCreditEstimation({
  sceneCount, totalDuration, planTier, renderMode, durationTiers,
}: CreditEstimationParams) {
  const [priceData, setPriceData] = useState<any>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (sceneCount === 0 || durationTiers.length === 0) { setPriceData(null); return; }
    // Guard against a slow earlier request resolving after a newer one and clobbering
    // state. Each effect run owns an `active` flag; its cleanup flips it false so any
    // in-flight response from a superseded run is ignored.
    let active = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const clamp = (d: number) => {
        const capped = Math.min(d, durationTiers[durationTiers.length - 1]);
        return durationTiers.reduce((prev, curr) => Math.abs(curr - capped) < Math.abs(prev - capped) ? curr : prev);
      };
      const quality = planTier === 'ultra' ? 'ultra' : planTier === 'premium' ? 'premium' : 'standard';
      setPriceLoading(true);
      try {
        let res: any;
        if (renderMode === 'single_flow' || renderMode === 'storyboard_image') {
          res = await laravel.pricingCalculate({
            video_type: 'storyboard_video', duration: `${clamp(totalDuration)}s`,
            resolution: '720p', quality, quantity: 1,
          });
        } else {
          const avg = sceneCount > 0 ? Math.round(totalDuration / sceneCount) : 5;
          res = await laravel.pricingCalculate({
            video_type: 'storyboard_video', duration: `${clamp(avg)}s`,
            resolution: '720p', quality, quantity: sceneCount,
          });
        }
        if (active) setPriceData(res);
      } catch { if (active) setPriceData(null); }
      finally { if (active) setPriceLoading(false); }
    }, 400);
    return () => { active = false; if (timerRef.current) clearTimeout(timerRef.current); };
  }, [sceneCount, totalDuration, planTier, renderMode, durationTiers]);

  return { priceData, priceLoading };
}
