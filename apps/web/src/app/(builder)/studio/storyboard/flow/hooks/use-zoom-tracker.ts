'use client';

import { useState, useEffect } from 'react';
import type { ReactFlowInstance } from '@xyflow/react';

export function useZoomTracker(rfInstance: React.MutableRefObject<ReactFlowInstance | null>) {
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      if (rfInstance.current) setZoom(rfInstance.current.getZoom());
    }, 300);
    return () => clearInterval(interval);
  }, [rfInstance]);

  return { zoom, setZoom };
}
