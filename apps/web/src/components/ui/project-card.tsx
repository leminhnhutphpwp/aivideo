'use client';

import { useState, useEffect } from 'react';
import { Clapperboard, Clock, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { fetchRawFile } from '@/lib/api/client';
import { t } from '@/lib/i18n';

export interface ProjectCardData {
  uuid: string;
  name?: string;
  surface?: string;
  skillId?: string;
  createdAt?: string;
  updatedAt?: string;
  lastTaskFile?: string | null;
  lastTaskStatus?: string;
  id?: string;
}

export function ProjectCard({ project }: { project: ProjectCardData }) {
  const surface = project.surface || project.skillId || 'video';
  const projectId = project.uuid || project.id || '';
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    const file = project.lastTaskFile;
    if (!file || !projectId) return;
    setPreviewLoading(true);
    fetchRawFile(projectId, file)
      .then(({ blobUrl }) => setPreviewUrl(blobUrl))
      .catch(() => {})
      .finally(() => setPreviewLoading(false));
  }, [project.lastTaskFile, projectId]);

  const taskStatus = project.lastTaskStatus;
  const statusConfig = taskStatus === 'done'
    ? { label: t('projects.completed'), color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', icon: null }
    : taskStatus === 'running' || taskStatus === 'processing'
    ? { label: t('projects.rendering'), color: 'text-[#FF5A1F] bg-[#FF5A1F]/10 border-[#FF5A1F]/20', icon: Loader2 }
    : { label: t('projects.production'), color: 'text-amber-400 bg-amber-400/10 border-amber-400/20', icon: Clock };
  const StatusIcon = statusConfig.icon;

  const updated = (() => {
    if (project.updatedAt) return new Date(project.updatedAt).toLocaleDateString('vi-VN');
    if (project.createdAt) return new Date(project.createdAt).toLocaleDateString('vi-VN');
    return new Date().toLocaleDateString('vi-VN');
  })();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="bg-zinc-900 border border-white/[0.06] rounded-2xl overflow-hidden group hover:border-[#FF5A1F]/20 hover:shadow-sm hover:shadow-black/30 transition-all duration-300 flex flex-col"
    >
      <Link href={`/projects/${project.uuid}`} className="flex flex-col h-full">
        <div className="aspect-[3/4] relative overflow-hidden bg-gradient-to-b from-[#141418] to-[#0A0A0A] shrink-0">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={project.name || ''}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              {previewLoading ? (
                <div className="h-6 w-6 rounded-full border-2 border-white/10 border-t-[#FF5A1F] animate-spin" />
              ) : (
                <Clapperboard className="h-10 w-10 text-white/[0.04]" />
              )}
            </div>
          )}
          <div className="absolute top-2 left-2">
             <span className={`inline-flex items-center gap-1 px-2 h-5 text-[8px] font-semibold uppercase tracking-wider rounded-md border backdrop-blur-md ${statusConfig.color} bg-zinc-950/60`}>
               {StatusIcon && <StatusIcon className={`h-2.5 w-2.5 ${taskStatus === 'running' ? 'animate-spin' : ''}`} />}
               {statusConfig.label}
             </span>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#141418] to-transparent pointer-events-none" />
        </div>
        <div className="p-2.5 space-y-1.5 flex-1 flex flex-col justify-between">
          <div className="min-w-0">
            <h3 className="text-[11px] font-semibold text-white group-hover:text-[#FF5A1F] transition-colors truncate leading-snug">{project.name || 'Untitled'}</h3>
            <p className="text-[9px] text-slate-600 mt-0.5">{updated}</p>
          </div>
          <span className="text-[8px] font-semibold text-slate-600 uppercase tracking-wider">{surface}</span>
        </div>
      </Link>
    </motion.div>
  );
}
