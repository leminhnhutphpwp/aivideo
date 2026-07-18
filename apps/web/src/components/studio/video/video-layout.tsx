import Link from 'next/link';
import { ArrowLeft, Wand2, Image, UserRound, Film, Smile, Layers } from 'lucide-react';
import { type VideoFeature, FEATURE_LABELS, FEATURE_DESCRIPTIONS, FEATURE_ICONS } from './types';

const ICON_MAP: Record<string, React.ElementType> = { Wand2, Image, UserRound, Film, Smile };

interface VideoLayoutProps {
  feature: VideoFeature;
  children: React.ReactNode;
}

export function VideoLayout({ feature, children }: VideoLayoutProps) {
  return (
    <div className="flex flex-col gap-6 md:gap-6 pb-20 px-2 md:px-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/studio" className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold tracking-tight text-white">{FEATURE_LABELS[feature]}</h1>
            <p className="text-sm text-slate-500 mt-0.5">{FEATURE_DESCRIPTIONS[feature]}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/studio/storyboard/flow"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all text-sm">
            <Layers className="h-4 w-4" />
            <span>Ghép cảnh</span>
          </Link>
        </div>
      </div>

      {children}
    </div>
  );
}
