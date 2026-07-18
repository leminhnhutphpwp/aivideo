'use client';

import { RenderModeProvider } from './components/render-mode-provider';
import { useCapability } from '@/lib/feature-capabilities';
import { FeatureMaintenance } from '@/components/feature-gate';

export default function StoryboardLayout({ children }: { children: React.ReactNode }) {
  // Gate the whole storyboard builder (create + editor) behind a maintenance
  // screen when the plan has no `storyboard_video` capability configured.
  const enabled = useCapability('storyboard_video');
  if (!enabled) return <FeatureMaintenance />;
  return <RenderModeProvider>{children}</RenderModeProvider>;
}
