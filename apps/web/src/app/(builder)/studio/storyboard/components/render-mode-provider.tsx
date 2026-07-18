'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

export type RenderMode = 'multi_scene' | 'single_flow' | 'storyboard_image';

interface RenderModeContextType {
  renderMode: RenderMode;
  setRenderMode: (mode: RenderMode) => void;
}

const RenderModeContext = createContext<RenderModeContextType>({
  renderMode: 'single_flow',
  setRenderMode: () => {},
});

export function RenderModeProvider({ children }: { children: ReactNode }) {
  // New projects default to One-Shot (single_flow). Existing storyboards restore
  // their saved mode via use-load-storyboard.ts.
  const [renderMode, setRenderMode] = useState<RenderMode>('single_flow');
  return (
    <RenderModeContext.Provider value={{ renderMode, setRenderMode }}>
      {children}
    </RenderModeContext.Provider>
  );
}

export function useRenderMode() {
  return useContext(RenderModeContext);
}
