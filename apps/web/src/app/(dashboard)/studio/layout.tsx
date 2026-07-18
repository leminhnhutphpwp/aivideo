'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { capabilityForHref, useCapability } from '@/lib/feature-capabilities';
import { FeatureMaintenance } from '@/components/feature-gate';

/**
 * Gates every studio feature route behind its plan capability. If the current
 * user's plan has no model configured for the feature (per plan.model_mapping),
 * the page shows a maintenance screen instead. Hub/storyboard/audio routes have
 * no single capability and are never gated.
 */
export default function StudioLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const capability = capabilityForHref(pathname);
  const enabled = useCapability(capability);

  if (capability && !enabled) return <FeatureMaintenance />;
  return <>{children}</>;
}
