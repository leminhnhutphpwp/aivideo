'use client';

import { Loader2, CheckCircle, AlertTriangle, XCircle, FileText, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CompileStatus } from './use-compile-prompt';

interface PromptStatusBadgeProps {
  status: CompileStatus;
}

const statusConfig: Record<CompileStatus, { icon: any; label: string; className: string }> = {
  idle: {
    icon: FileText,
    label: 'Chưa viết prompt',
    className: 'text-slate-500 bg-slate-500/10 border-slate-500/20',
  },
  compiling: {
    icon: Loader2,
    label: 'Đang viết...',
    className: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  },
  compiled: {
    icon: CheckCircle,
    label: 'Đã viết prompt',
    className: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  },
  stale: {
    icon: AlertTriangle,
    label: 'Cần viết lại',
    className: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  },
  error: {
    icon: XCircle,
    label: 'Lỗi',
    className: 'text-red-400 bg-red-500/10 border-red-500/20',
  },
};

export function PromptStatusBadge({ status }: PromptStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-medium',
        config.className,
      )}
    >
      <Icon className={cn('h-3 w-3', status === 'compiling' && 'animate-spin')} />
      {config.label}
    </span>
  );
}
