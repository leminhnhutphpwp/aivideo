'use client';

import { useState, useEffect } from 'react';
import { Play, Film, Sparkles, Clock, Loader2, Clapperboard } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { fetchRawFile } from '@/lib/api/client';
import type { UnifiedProject } from '@/lib/api/unified-project-types';
import { STATUS_CONFIG, TYPE_CONFIG } from '@/lib/api/unified-project-types';
import { cn } from '@/lib/utils';
import { noDownloadImg, noDownloadVideo } from '@/lib/media-protection';

const IS_ACTIVE = new Set(['analyzing', 'processing']);

export function UnifiedProjectCard({ project }: { project: UnifiedProject }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewMime, setPreviewMime] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    // Storyboards serve their final video via an auth-gated Laravel route, not the daemon file
    // proxy — fetch it with the Bearer token so the real thumbnail shows on the Projects grid.
    if (project.source === 'storyboard' && project.storyboard?.uuid && project.storyboard?.outputPath) {
      const base = process.env.NEXT_PUBLIC_LARAVEL_URL || 'http://localhost:8000';
      const url = `${base}/api/storyboards/${project.storyboard.uuid}/download`;
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      let created: string | null = null;
      let cancelled = false;
      setPreviewLoading(true);
      fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
        .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.blob(); })
        .then(blob => {
          if (cancelled) return;
          created = URL.createObjectURL(blob);
          setPreviewUrl(created);
          setPreviewMime(blob.type || 'video/mp4');
        })
        .catch(() => {})
        .finally(() => { if (!cancelled) setPreviewLoading(false); });
      return () => { cancelled = true; if (created) URL.revokeObjectURL(created); };
    }

    const pid = project.source === 'daemon' ? project.daemon?.projectId : null;
    const file = project.source === 'daemon' ? project.daemon?.lastTaskFile : null;

    if (pid && file) {
      setPreviewLoading(true);
      fetchRawFile(pid, file)
        .then(({ blobUrl, blob }) => {
          setPreviewUrl(blobUrl);
          setPreviewMime(blob.type);
        })
        .catch(() => {})
        .finally(() => setPreviewLoading(false));
      return () => {
        setPreviewUrl(prev => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
      };
    }
  }, [project.source, project.daemon?.projectId, project.daemon?.lastTaskFile, project.storyboard?.uuid, project.storyboard?.outputPath]);

  const statusCfg = STATUS_CONFIG[project.status] || STATUS_CONFIG.draft;
  const typeCfg = TYPE_CONFIG[project.type] || TYPE_CONFIG.other;
  const StatusIcon = statusCfg.icon;

  const updatedLabel = (() => {
    if (typeof project.updatedAt === 'number') {
      return new Date(project.updatedAt).toLocaleDateString('vi-VN');
    }
    return new Date(project.updatedAt).toLocaleDateString('vi-VN');
  })();

  const storyboardMeta = project.storyboard;
  const daemonMeta = project.daemon;

  return (
    <div
      className={cn(
        "group relative bg-[#16141a] rounded-2xl overflow-hidden border transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_-16px_rgba(255,90,31,0.28)]",
        project.status === 'processing' ? "border-orange-500/20 hover:border-orange-500/40"
          : project.status === 'done' ? "border-emerald-500/15 hover:border-emerald-500/30"
          : "border-white/12 hover:border-brand/20",
      )}
    >
      {/* Hover top-edge accent sweep */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-px z-20 bg-gradient-to-r from-transparent via-transparent to-transparent group-hover:via-brand/60 transition-all duration-500" />
      <Link href={project.href} className="block">
        {/* Thumbnail */}
        <div className="relative aspect-[4/3] bg-[#1f1c25] overflow-hidden">
          {previewUrl && previewMime?.startsWith('video/') ? (
            <>
              <video src={previewUrl} muted preload="metadata" {...noDownloadVideo} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/10 to-transparent group-hover:from-black/60 transition-all duration-500" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                <div className="h-12 w-12 rounded-full bg-brand flex items-center justify-center shadow-sm shadow-brand/40 scale-90 group-hover:scale-100 transition-transform">
                  <Play className="h-5 w-5 text-white fill-white ml-0.5" />
                </div>
                <span className="text-[10px] text-white/60 font-medium tracking-wider uppercase">Xem trước</span>
              </div>
            </>
          ) : previewUrl ? (
            <>
              <img src={previewUrl} alt={project.title} {...noDownloadImg} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/10 to-transparent group-hover:from-black/60 transition-all duration-500" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                <div className="h-12 w-12 rounded-full bg-brand flex items-center justify-center shadow-sm shadow-brand/40 scale-90 group-hover:scale-100 transition-transform">
                  <Play className="h-5 w-5 text-white fill-white ml-0.5" />
                </div>
                <span className="text-[10px] text-white/60 font-medium tracking-wider uppercase">Xem trước</span>
              </div>
            </>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Branded placeholder so empty cards don't read hollow */}
              <div
                className="absolute inset-0 opacity-70"
                style={{ background: 'radial-gradient(120% 90% at 50% 0%, rgba(255,90,31,0.10), transparent 60%)' }}
              />
              <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.05)_1px,transparent_0)] [background-size:16px_16px]" />
              {previewLoading ? (
                <div className="relative h-6 w-6 rounded-full border-2 border-white/10 border-t-brand animate-spin" />
              ) : project.source === 'storyboard' ? (
                <div className="relative flex flex-wrap gap-1.5 p-3 justify-center">
                  {Array.from({ length: Math.min(storyboardMeta?.scenesCount || 2, 6) }, (_, i) => (
                    <div key={i} className="w-10 h-7 rounded-md bg-brand/15 border border-brand/25" />
                  ))}
                </div>
              ) : (
                <div className="relative h-12 w-12 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center">
                  <Clapperboard className="h-6 w-6 text-brand/70" />
                </div>
              )}
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 z-10">
            <span className={cn("px-2.5 py-1 rounded-full text-[11px] font-semibold text-white flex items-center gap-1.5 backdrop-blur-md border border-white/10", typeCfg.color)}>
              {typeCfg.label}
            </span>
          </div>
          <div className="absolute top-3 right-3 z-10">
            <span className={cn("px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 backdrop-blur-md border border-white/10", statusCfg.color)}>
              {IS_ACTIVE.has(project.status) && <Loader2 className="h-3 w-3 animate-spin" />}
              {StatusIcon && !IS_ACTIVE.has(project.status) && <StatusIcon className="h-3 w-3" />}
              {statusCfg.label}
            </span>
          </div>

          {storyboardMeta?.totalDuration && (
            <div className="absolute bottom-3 right-3 z-10 px-2 py-0.5 rounded-full bg-[#16141a]/60 backdrop-blur-sm text-[10px] text-slate-400 border border-white/12">
              {storyboardMeta.totalDuration}s
            </div>
          )}

          {IS_ACTIVE.has(project.status) && (
            <motion.div className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand z-10"
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }} />
          )}
        </div>

        {/* Info */}
        <div className="p-4 md:p-5 space-y-3">
          <h3 className="text-base md:text-lg font-semibold text-white leading-tight line-clamp-2">
            {project.title}
          </h3>

          <div className="space-y-1.5">
            <div className="flex items-center gap-4 text-xs text-slate-500">
              {storyboardMeta ? (
                <>
                  <span className="flex items-center gap-1.5">
                    <Film className="h-3.5 w-3.5 text-slate-400" />
                    {storyboardMeta.scenesCount} cảnh
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-slate-400" />
                    {storyboardMeta.creditsCost} credits
                  </span>
                </>
              ) : daemonMeta?.surface ? (
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{daemonMeta.surface}</span>
              ) : null}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Clock className="h-3.5 w-3.5" />
              {updatedLabel}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
