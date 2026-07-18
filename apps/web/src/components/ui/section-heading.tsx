import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Editorial section header used across the in-app shell.
 *
 * Carries the landing page's identity inward: an orange accent bar, an optional
 * uppercase eyebrow, and an optional serif (Playfair) accent word — instead of a
 * plain bold title that reads like a stock admin template.
 */
export function SectionHeading({
  eyebrow,
  title,
  accent,
  subtitle,
  action,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  /** Optional trailing word rendered in italic serif + brand orange. */
  accent?: string;
  subtitle?: ReactNode;
  /** Right-aligned slot (links, chips, buttons). */
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-end justify-between gap-4 mb-5', className)}>
      <div className="flex items-stretch gap-3">
        <div className="w-[3px] shrink-0 rounded-full bg-gradient-to-b from-[#FF5A1F] via-[#FF5A1F]/60 to-transparent" />
        <div className="space-y-1">
          {eyebrow && (
            <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-[#FF5A1F]/80">
              {eyebrow}
            </span>
          )}
          <h2 className="text-xl md:text-2xl font-display font-bold text-white tracking-tight leading-tight">
            {title}
            {accent && (
              <span className="ml-2 font-[family-name:var(--font-display-heading)] font-medium italic text-[#FF5A1F]">
                {accent}
              </span>
            )}
          </h2>
          {subtitle && <p className="text-[11px] text-slate-500 font-medium">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
