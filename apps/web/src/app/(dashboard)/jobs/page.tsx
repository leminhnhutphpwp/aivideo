'use client';

import { useState, useEffect, useRef } from 'react';
import { Clock, CheckCircle2, XCircle, Play, ChevronRight, RefreshCw, Film, ExternalLink, Share2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MediaViewer, type MediaKind } from '@/components/ui/media-viewer';
import { motion } from 'motion/react';
import { daemon, laravel } from '@/lib/api/client';
import Link from 'next/link';
import { subscribeUserJobs } from '@/lib/echo';
import { useAuthStore } from '@/stores/auth-store';
import { useToastStore } from '@/stores/toast-store';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { PublishModal } from '@/components/community/publish-modal';

const PROCESSING_UI = { label: t('jobs.processing'), color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' };
const COMPLETED_UI = { label: t('jobs.completed'), color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' };
const FAILED_UI = { label: t('jobs.failed'), color: 'text-red-400 bg-red-400/10 border-red-400/20' };
const PENDING_UI = { label: t('jobs.pending'), color: 'text-slate-400 bg-white/5 border-white/10' };

// Map BOTH vocabularies: daemon (running/done/queued) AND Laravel render-jobs /
// storyboards (processing/completed/pending/rendering). Previously only the daemon
// words were mapped, so a Laravel `completed` job fell through to the `queued`
// fallback and was mislabelled "Đang chờ".
const STATUS_UI: Record<string, { label: string; color: string }> = {
  running: PROCESSING_UI, processing: PROCESSING_UI, rendering: PROCESSING_UI, analyzing: PROCESSING_UI,
  done: COMPLETED_UI, completed: COMPLETED_UI, succeeded: COMPLETED_UI,
  failed: FAILED_UI, error: FAILED_UI, cancelled: FAILED_UI,
  queued: PENDING_UI, pending: PENDING_UI,
};

interface TaskItem {
  taskId: string;
  id?: string;
  status: string;
  capability?: string;
  video_type?: string;
  prompt?: string;
  model?: string;
  startedAt?: number;
  endedAt?: number;
  projectName?: string;
  projectId?: string;
  file?: any;
  progress?: string[];
  progressPercentage?: number;
  estimatedCompletion?: string;
  attempts?: number;
  maxAttempts?: number;
  isTimedOut?: boolean;
  assets?: any[];
  credits_cost?: number;
  daemon_project_id?: string;
  output_path?: string;
  surface?: string;
}

export default function JobsPage() {
  const ITEMS_PER_PAGE = 20;
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const taskIdsRef = useRef<Set<string>>(new Set());
  const watchingRef = useRef<Set<string>>(new Set());
  const tasksRef = useRef(tasks);

  const userUuid = useAuthStore(s => s.user?.uuid);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    const unsubs: (() => void)[] = [];

    const fetchTasks = async () => {
      try {
        const [projects, laravelJobs] = await Promise.allSettled([
          daemon.listProjects(),
          laravel.renderJobs().catch(() => null),
        ]);

        const all: TaskItem[] = [];

        // Daemon tasks
        if (projects.status === 'fulfilled') {
          for (const p of projects.value.slice(0, 5)) {
            const t = await daemon.listTasks(p.uuid || p.id).catch(() => []);
            all.push(...t.map((task: any) => ({ ...task, projectId: p.uuid || p.id, projectName: p.name })));
          }
        }

        // Laravel render jobs
        if (laravelJobs.status === 'fulfilled' && laravelJobs.value) {
          const data = laravelJobs.value.data;
          const jobs = Array.isArray(data) ? data : (data?.items || data?.data || laravelJobs.value);
          
          for (const job of (Array.isArray(jobs) ? jobs : [])) {
            // Deduplicate: If we already fetched this task directly from Daemon, just enrich it
            if (job.daemon_task_id) {
              const existing = all.find(t => t.taskId === job.daemon_task_id || t.id === job.daemon_task_id);
              if (existing) {
                existing.prompt = job.prompt || existing.prompt;
                existing.video_type = job.video_type || existing.video_type;
                existing.capability = job.capability || existing.capability;
                existing.assets = job.assets;
                // Prefer daemon status as it's real-time, unless laravel has an error
                if (job.status === 'failed' && existing.status !== 'failed') existing.status = 'failed';
                continue; // Skip adding a duplicate record
              }
            }

            all.push({
              taskId: `laravel:${job.uuid}`,
              id: job.uuid,
              status: job.status || 'queued',
              capability: job.capability,
              video_type: job.video_type,
              prompt: job.prompt,
              credits_cost: job.credits_cost,
              startedAt: job.started_at ? new Date(job.started_at).getTime() : undefined,
              endedAt: job.completed_at ? new Date(job.completed_at).getTime() : undefined,
              projectName: 'Laravel',
              file: job.output_path,
              progressPercentage: job.progress?.percentage,
              estimatedCompletion: job.timeout?.estimated_completion,
              attempts: job.attempts,
              maxAttempts: job.max_attempts,
              isTimedOut: job.timeout?.is_timed_out,
              assets: job.assets,
              daemon_project_id: job.daemon_project_id,
              output_path: job.output_path,
            });
          }
        }

        all.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));

        for (const task of all) {
          const tid = (task.taskId || task.id) as string | undefined;
          if (tid && !watchingRef.current.has(tid) && task.status === 'running') {
            watchingRef.current.add(tid);
            watchTask(tid);
          }
        }

        setTasks(all);
      } catch {
        // services not running
      } finally {
        setLoading(false);
      }
    };

    const watchTask = async (taskId: string) => {
      while (watchingRef.current.has(taskId)) {
        try {
          const updated = await daemon.waitTask(taskId, 0, 10000);
          setTasks(prev => prev.map(t =>
            (t.taskId || t.id) === taskId
              ? { ...t, status: updated.status, progress: updated.progress, file: updated.file, endedAt: updated.endedAt }
              : t
          ));
          if (updated.status === 'done' || updated.status === 'failed') {
            watchingRef.current.delete(taskId);
            break;
          }
        } catch {
          watchingRef.current.delete(taskId);
          break;
        }
      }
    };

    fetchTasks();
    const interval = setInterval(() => {
      if (tasksRef.current.some(t => t.status === 'queued' || t.status === 'running')) {
        fetchTasks();
      }
    }, 5000);

    if (userUuid) {
      const unsub = subscribeUserJobs(String(userUuid), {
        onProgress: (e: any) => {
          setTasks(prev => prev.map(t =>
            (t.taskId || t.id) === `laravel:${e.job_id}` ? { ...t, progress: [...(t.progress || []), e.stage || e.progress] } : t
          ));
        },
        onCompleted: (e: any) => {
          const job = e.job || e;
          setTasks(prev => prev.map(t =>
            (t.taskId || t.id) === `laravel:${job.uuid || job.id}` ? { ...t, status: 'done', file: job.output_path, endedAt: Date.now() } : t
          ));
        },
        onFailed: (e: any) => {
          setTasks(prev => prev.map(t =>
            (t.taskId || t.id) === `laravel:${e.job_id}` ? { ...t, status: 'failed', endedAt: Date.now() } : t
          ));
        },
      });
      if (unsub) unsubs.push(unsub);
    }

    return () => {
      clearInterval(interval);
      watchingRef.current.clear();
      unsubs.forEach(fn => fn());
    };
  }, [userUuid]);

  const visibleTasks = tasks.slice(0, visibleCount);
  const hasMore = visibleCount < tasks.length;

  return (
    <div className="flex flex-col gap-6 md:gap-6 lg:gap-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-display font-semibold tracking-tight text-white">{t('jobs.title')}</h1>
          <p className="text-slate-500 font-medium tracking-tight">{t('jobs.desc')}</p>
        </div>
        <Button variant="outline" onClick={() => {
          setLoading(true);
          window.location.reload();
        }} className="h-10 w-10 rounded-xl border-white/10">
          <RefreshCw className="h-4 w-4 text-slate-400" />
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 rounded-full border-2 border-white/10 border-t-brand animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-32 space-y-4 bg-[#16141a] rounded-2xl border border-white/12">
          <Clock className="h-12 w-12 text-slate-500 mx-auto" />
          <div className="space-y-1">
            <p className="text-slate-500 font-medium">{t('jobs.empty')}</p>
            <p className="text-xs text-slate-400">Tạo video đầu tiên để bắt đầu theo dõi tiến trình</p>
          </div>
          <Link href="/studio">
            <Button className="bg-brand hover:bg-[#FF6A2B] text-white rounded-xl">
              {t('jobs.createFromStudio')}
            </Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {visibleTasks.map((task) => (
              <JobItemCard key={task.taskId || task.id} task={task} />
            ))}
          </div>
          {hasMore && (
            <div className="flex justify-center pt-8">
              <Button onClick={() => setVisibleCount(c => c + ITEMS_PER_PAGE)}
                variant="ghost"
                className="px-10 py-6 rounded-2xl border border-white/12 text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm font-semibold">
                Xem thêm ({tasks.length - visibleCount})
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function JobItemCard({ task }: { task: TaskItem }) {
  const taskId = task.taskId || task.id;
  const status = STATUS_UI[task.status] || STATUS_UI.queued;
  // Accept both daemon ('done') and Laravel/storyboard ('completed'/'succeeded') vocab —
  // otherwise Laravel jobs mislabel, hide the publish button, and hide the result preview.
  const isDone = ['done', 'completed', 'succeeded'].includes(task.status);
  const isRunning = task.status === 'running';
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const [unpublishLoading, setUnpublishLoading] = useState(false);
  const addToast = useToastStore(s => s.addToast);
  const isLaravelJob = typeof taskId === 'string' && taskId.startsWith('laravel:');
  const jobUuid = isLaravelJob ? taskId.replace('laravel:', '') : task.id;
  const isPublished = !!(task as any).published_at && (task as any).visibility !== 'private';
  const isPendingReview = (task as any).moderation_status === 'pending_review';

  const handleUnpublish = async () => {
    if (!jobUuid) return;
    setUnpublishLoading(true);
    try {
      await laravel.communityUnpublish(jobUuid);
      addToast('Đã gỡ đăng tác phẩm', 'success');
      window.location.reload();
    } catch (e: any) {
      addToast(e?.message || 'Lỗi', 'error');
    } finally {
      setUnpublishLoading(false);
    }
  };

  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative bg-[#16141a] border border-white/12 hover:border-white/10 rounded-2xl overflow-hidden group transition-all">
      <div className="flex flex-col md:flex-row items-start md:items-center p-4 md:p-5 gap-4 md:gap-6">
        
        {/* Thumbnail / Icon Area */}
        <div className="shrink-0 relative">
          <div className={cn("h-16 w-16 md:h-20 md:w-20 rounded-xl flex items-center justify-center shadow-inner transition-colors", status.color, "bg-opacity-20 border")}>
             {isRunning ? <div className="h-6 w-6 rounded-full border-2 border-amber-400/30 border-t-amber-400 animate-spin" />
             : isDone ? <CheckCircle2 className="h-6 w-6" />
             : task.status === 'failed' ? <XCircle className="h-6 w-6" />
             : <Clock className="h-6 w-6" />}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0 space-y-1.5 w-full">
          <div className="flex items-center gap-2">
            <h3 className="text-sm md:text-base font-bold text-white truncate w-full max-w-lg">
              {task.surface === 'image' ? 'Tạo / Chỉnh sửa ảnh AI' :
               task.surface === 'audio' ? 'Tạo âm thanh AI' :
               task.surface === 'video' || task.video_type ? 'Tạo Video AI' :
               task.model ? `Tác vụ ${task.model}` :
               'Tác vụ hệ thống'}
            </h3>
          </div>
          
          {task.prompt && (
            <p className="text-[13px] text-slate-400 line-clamp-2 leading-relaxed pb-1">
              {task.prompt}
            </p>
          )}
          
          <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500">
             <span className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-md border transition-colors", status.color, "bg-opacity-10")}>
               <span className="w-1.5 h-1.5 rounded-full bg-current" />
               <span className="uppercase tracking-widest text-[9px] font-bold">{status.label}</span>
             </span>
             
             {task.projectName && <span className="flex items-center gap-1"><Film className="h-3.5 w-3.5" />{task.projectName}</span>}
             {task.startedAt && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{new Date(task.startedAt).toLocaleTimeString('vi-VN')}</span>}
          </div>

          {/* Inline result preview — the Jobs list was metadata-only before. */}
          {isDone && (() => {
            const assets = ((task as any).assets ?? []) as { type: string; mime_type?: string; url: string }[];
            const media = assets.find(a => a.type === 'video' || a.type === 'image' || a.mime_type?.startsWith('video/') || a.mime_type?.startsWith('image/'));
            if (!media) return null;
            const kind: MediaKind = (media.type === 'video' || media.mime_type?.startsWith('video/')) ? 'video' : 'image';
            return (
              <div className="mt-2 max-w-[320px] rounded-xl overflow-hidden border border-white/12">
                <MediaViewer src={media.url} kind={kind} aspectRatio={(task as any).aspect_ratio || '16:9'} controls fit="cover" rounded={false} />
              </div>
            );
          })()}

          {isRunning && task.progressPercentage !== undefined && (
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-brand transition-all duration-500" style={{ width: `${Math.min(100, task.progressPercentage)}%` }} />
              </div>
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">{Math.round(task.progressPercentage)}%</span>
            </div>
          )}
          {task.progress && task.progress.length > 0 && !isDone && (
             <p className="text-[11px] text-slate-500 truncate mt-1">{task.progress.slice(-1)[0]}</p>
          )}
        </div>

        {/* Action / Status Label */}
        <div className="shrink-0 flex items-center gap-3 self-end md:self-center mt-2 md:mt-0">
           {isDone && isLaravelJob && jobUuid && (
             <>
               {!isPublished ? (
                 <button onClick={() => setPublishModalOpen(true)} disabled={publishLoading}
                   className="cursor-pointer h-8 flex items-center gap-1.5 px-3 rounded-xl bg-brand hover:bg-brand-hover text-[11px] text-white font-semibold transition-all shadow-[0_2px_12px_rgba(255,90,31,0.25)] disabled:opacity-50 disabled:cursor-not-allowed">
                   {publishLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Share2 className="h-3 w-3" />}
                   <span className="hidden sm:inline">Đăng</span>
                 </button>
               ) : isPendingReview ? (
                 <button onClick={handleUnpublish} disabled={unpublishLoading} title="Đang chờ kiểm duyệt trước khi hiển thị công khai"
                   className="cursor-pointer h-8 flex items-center gap-1.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/30 text-[11px] text-amber-300 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                   {unpublishLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Clock className="h-3 w-3" />}
                   <span className="hidden sm:inline">Chờ duyệt</span>
                 </button>
               ) : (
                 <button onClick={handleUnpublish} disabled={unpublishLoading}
                   className="cursor-pointer h-8 flex items-center gap-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-[11px] text-white font-semibold transition-all shadow-[0_2px_12px_rgba(16,185,129,0.25)] disabled:opacity-50 disabled:cursor-not-allowed">
                   {unpublishLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                   <span className="hidden sm:inline">Đã đăng</span>
                 </button>
               )}
             </>
           )}
           {isDone ? (
             <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest px-3">Hoàn tất</span>
           ) : isRunning ? (
             <span className="text-[11px] font-bold text-amber-400 uppercase tracking-widest animate-pulse px-3">Đang xử lý...</span>
           ) : task.status === 'failed' ? (
             <span className="text-[11px] font-bold text-red-400 uppercase tracking-widest px-3">Lỗi</span>
           ) : (
             <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest px-3">Đang đợi</span>
           )}
        </div>
      </div>
      {isDone && isLaravelJob && jobUuid && (
        <PublishModal
          isOpen={publishModalOpen}
          onClose={() => setPublishModalOpen(false)}
          assetName={task.prompt || 'Tác phẩm không tên'}
          creditsCost={(task as any).credits_cost || 0}
          onConfirm={async (visibility, tags) => {
            setPublishLoading(true);
            try {
              const res = await laravel.communityPublish(jobUuid, visibility, tags);
              if (res?.pending_review) {
                addToast('Tác phẩm đang chờ kiểm duyệt trước khi hiển thị công khai', 'info');
              } else {
                addToast('Đăng lên cộng đồng thành công!', 'success');
              }
              window.location.reload();
            } catch (e: any) {
              if (e?.status === 403) {
                addToast('Tính năng dành cho gói Pro trở lên', 'error');
              } else if (e?.status === 429) {
                addToast('Đã đạt giới hạn publish hôm nay', 'error');
              } else {
                addToast(e?.message || 'Lỗi khi đăng tác phẩm', 'error');
              }
            } finally {
              setPublishLoading(false);
            }
          }}
        />
      )}
    </motion.div>
  );
}
