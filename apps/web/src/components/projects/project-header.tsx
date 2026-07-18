'use client';

import { Film, Image, Music, Clock, Timer, LayoutGrid, ScanLine, Mic2, Sparkles, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import type { RenderJobRecord, SurfaceMeta } from './types';

function fmtDate(epochMs: number | undefined | null): string {
  if (epochMs == null) return '—';
  return new Date(epochMs).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function resolveMeta(surface: string | null, job: RenderJobRecord | null): SurfaceMeta {
  const cap = job?.capability || '';
  const isEdit = cap === 'i2i' || cap === 'video-edit' || surface === 'image' && job?.video_type?.includes('image');

  switch (surface) {
    case 'image':
      return {
        icon: Image,
        label: isEdit ? 'Image Editing' : 'Image Generation',
        fields: [
          { label: 'Kiểu', value: isEdit ? 'Chỉnh sửa ảnh' : 'Text-to-Image', icon: Sparkles },
          { label: 'Tỉ lệ', value: job?.aspect_ratio, icon: LayoutGrid },
          { label: 'Style', value: job?.parameters?.style || null, icon: Sparkles },
        ],
      };
    case 'video': {
      const capLabel: Record<string, string> = {
        t2v: 'Text-to-Video', i2v: 'Image-to-Video', r2v: 'Reference-to-Video',
        'video-edit': 'Video Editing', 'character-anim': 'Character Animation',
      };
      return {
        icon: Film,
        label: capLabel[cap] || 'Video',
        fields: [
          { label: 'Thời lượng', value: job?.duration_seconds ? `${job.duration_seconds}s` : null, icon: Timer },
          { label: 'Tỉ lệ', value: job?.aspect_ratio, icon: LayoutGrid },
          { label: 'Độ phân giải', value: job?.resolution, icon: ScanLine },
        ],
      };
    }
    case 'audio':
      return {
        icon: Music,
        label: 'Audio',
        fields: [
          { label: 'Giọng', value: job?.parameters?.voice || null, icon: Mic2 },
          { label: 'Thời lượng', value: job?.duration_seconds ? `${job?.duration_seconds}s` : null, icon: Timer },
        ],
      };
    default:
      return {
        icon: Film,
        label: 'Media',
        fields: [
          { label: 'Thời lượng', value: job?.duration_seconds ? `${job?.duration_seconds}s` : null, icon: Timer },
          { label: 'Tỉ lệ', value: job?.aspect_ratio, icon: LayoutGrid },
        ],
      };
  }
}

const statusConfig = {
  processing: { label: 'Đang xử lý', bg: 'bg-amber-400/10', text: 'text-amber-300', border: 'border-amber-400/20', dot: 'bg-amber-400', pulse: true },
  queued:     { label: 'Đang chờ',   bg: 'bg-sky-400/10',   text: 'text-sky-300',   border: 'border-sky-400/20',   dot: 'bg-sky-400',   pulse: true },
  completed:  { label: 'Hoàn thành', bg: 'bg-emerald-400/10', text: 'text-emerald-300', border: 'border-emerald-400/20', dot: 'bg-emerald-400', pulse: false },
  failed:     { label: 'Thất bại',   bg: 'bg-red-400/10',   text: 'text-red-400',   border: 'border-red-400/20',   dot: 'bg-red-400',   pulse: false },
} as const;
type StatusKey = keyof typeof statusConfig;

function StatPill({ icon: Icon, label, value }: { icon?: React.ComponentType<{ className?: string }>; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06]">
      {Icon && <Icon className="h-3.5 w-3.5 text-slate-500 shrink-0" />}
      <div className="leading-none">
        <p className="text-[8px] text-slate-600 font-semibold uppercase tracking-widest mb-0.5">{label}</p>
        <p className="text-sm font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

export function ProjectHeader({ project, job }: {
  project: { name?: string; surface?: string; createdAt?: number; metadata?: Record<string, unknown> } | null;
  job: RenderJobRecord | null;
}) {
  if (!project) return null;
  const surface = (project?.metadata?.surface as string) || (job?.video_type || '');
  const meta = resolveMeta(surface, job);
  const Icon = meta.icon;
  const sc = job?.status ? statusConfig[job.status as StatusKey] : null;
  const visibleFields = meta.fields.filter(f => f.value != null && f.value !== '' && f.value !== 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="rounded-2xl border border-white/[0.07] bg-[#0D0D10] overflow-hidden"
    >
      {/* Top accent line */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-[#FF5A1F]/40 to-transparent" />

      <div className="p-5">
        {/* Row 1: surface type + status + date */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {/* Surface icon + label */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#FF5A1F]/10 border border-[#FF5A1F]/15">
            <Icon className="h-3 w-3 text-[#FF5A1F]" />
            <span className="text-[10px] font-bold text-[#FF5A1F] uppercase tracking-widest">{meta.label}</span>
          </div>

          {/* Status */}
          {sc && (
            <motion.div
              animate={sc.pulse ? { opacity: [0.7, 1, 0.7] } : {}}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border', sc.bg, sc.border)}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', sc.dot, sc.pulse && 'animate-pulse')} />
              <span className={cn('text-[10px] font-bold uppercase tracking-widest', sc.text)}>{sc.label}</span>
            </motion.div>
          )}

          {/* Date */}
          <div className="flex items-center gap-1 text-[10px] text-slate-600 font-medium ml-auto">
            <Clock className="h-3 w-3" />
            {fmtDate(project.createdAt ?? 0)}
          </div>
        </div>

        {/* Row 2: prompt + stats */}
        <div className="flex items-end gap-4">
          {/* Prompt text */}
          <div className="flex-1 min-w-0">
            {job?.prompt ? (
              <p className="text-sm text-slate-400 leading-relaxed line-clamp-3">{job.prompt}</p>
            ) : (
              <p className="text-sm text-slate-600 italic">Chưa có mô tả</p>
            )}
          </div>

          {/* Stats row */}
          {visibleFields.length > 0 && (
            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
              {visibleFields.map(f => (
                <StatPill key={f.label} icon={f.icon} label={f.label} value={f.value as string} />
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
