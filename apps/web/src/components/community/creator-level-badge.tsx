import React from 'react';
import { Crown, Sparkles, Wand2, Palette, Trophy, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CreatorLevel = 'newbie' | 'creator' | 'artist' | 'director' | 'producer' | 'legend';

interface CreatorLevelBadgeProps {
  level: CreatorLevel;
  className?: string;
  showIcon?: boolean;
}

export function CreatorLevelBadge({ level, className, showIcon = true }: CreatorLevelBadgeProps) {
  const config: Record<CreatorLevel, { label: string; bg: string; text: string; border: string; icon: React.ElementType; glow?: string }> = {
    newbie: {
      label: 'Newbie',
      bg: 'bg-slate-500/10',
      text: 'text-slate-400',
      border: 'border-slate-500/20',
      icon: Sparkles
    },
    creator: {
      label: 'Creator',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/20',
      icon: Wand2
    },
    artist: {
      label: 'Artist',
      bg: 'bg-indigo-500/10',
      text: 'text-indigo-400',
      border: 'border-indigo-500/20',
      icon: Palette
    },
    director: {
      label: 'Director',
      bg: 'bg-[#FF5A1F]/10',
      text: 'text-[#FF5A1F]',
      border: 'border-[#FF5A1F]/20',
      icon: Trophy,
      glow: 'shadow-[0_0_10px_rgba(255,90,31,0.2)]'
    },
    producer: {
      label: 'Producer',
      bg: 'bg-purple-500/15',
      text: 'text-purple-400',
      border: 'border-purple-500/30',
      icon: ShieldAlert,
      glow: 'shadow-[0_0_12px_rgba(168,85,247,0.25)]'
    },
    legend: {
      label: 'Legend',
      bg: 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20',
      text: 'text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300 font-bold',
      border: 'border-amber-500/40',
      icon: Crown,
      glow: 'shadow-[0_0_15px_rgba(245,158,11,0.3)] animate-pulse'
    }
  };

  const current = config[level] || config.newbie;
  const Icon = current.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider backdrop-blur-md select-none",
        current.bg,
        current.border,
        current.glow,
        className
      )}
    >
      {showIcon && <Icon className={cn("h-3 w-3", level === 'legend' ? 'text-amber-400' : current.text)} />}
      <span className={cn(level !== 'legend' && current.text)}>{current.label}</span>
    </span>
  );
}
