'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, RefreshCw, Wand2, Trash2, Send, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { daemon, laravel, fetchRawFile } from '@/lib/api/client';
import { subscribeUserJobs } from '@/lib/echo';
import { useToastStore } from '@/stores/toast-store';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { TaskCard } from '@/components/projects/task-card';
import { JobHistory } from '@/components/projects/job-history';
import { CinematicGenerationStatus } from '@/components/projects/cinematic-generation-status';
import { PublishModal } from '@/components/community/publish-modal';
import type { TaskRecord, ProjectRecord, RenderJobRecord } from '@/components/projects/types';

function resolveRetryModel(surface: string | null, fallbackModel?: string): string {
  if (surface === 'image') return 'thanhnhan9023/gpt-image-2';
  if (surface === 'audio') return 'tts-1';
  return fallbackModel || 'wan2.6-t2v';
}

function resolveRetryAspect(surface: string | null): string {
  return surface === 'image' ? '1:1' : '16:9';
}

export default function ProjectDetailPage() {
  const params = useParams();
  const addToast = useToastStore(s => s.addToast);
  const user = useAuthStore(s => s.user);
  const userUuid = (user as any)?.uuid || '';
  const projectId = params.id as string;
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasActive, setHasActive] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [publishTarget, setPublishTarget] = useState<RenderJobRecord | null>(null);
  const [unpublishTarget, setUnpublishTarget] = useState<RenderJobRecord | null>(null);
  const [unpublishLoading, setUnpublishLoading] = useState(false);
  const [renderJobs, setRenderJobs] = useState<RenderJobRecord[]>([]);
  const [renderJob, setRenderJob] = useState<RenderJobRecord | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastFetchRef = useRef(0);
  const fetchDataRef = useRef<() => Promise<void>>(async () => {});
  const lastWsEventRef = useRef(Date.now());
  const [wsActive, setWsActive] = useState(true);

  useEffect(() => {
    if (showDeleteConfirm) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showDeleteConfirm]);

  const fetchData = useCallback(async () => {
    const now = Date.now();
    if (now - lastFetchRef.current < 2000) return;
    lastFetchRef.current = now;
    try {
      const [p, t, jobsRes] = await Promise.all([
        daemon.getProject(projectId),
        daemon.listTasks(projectId).catch(() => [] as TaskRecord[]),
        laravel.renderJobs(projectId).catch(() => ({ data: [] })),
      ]);
      setProject(p);
      setTasks(t);
      const jobList: RenderJobRecord[] = (jobsRes as any)?.data?.items || (jobsRes as any)?.data || [];
      if (jobList.length > 0) {
        setRenderJob(jobList[0]);
        setRenderJobs(jobList);
      }
      setHasActive(t.some((task: TaskRecord) => task.status === 'queued' || task.status === 'running'));
    } catch {
      // project not found
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  fetchDataRef.current = fetchData;

  useEffect(() => { fetchData(); }, [projectId]);

  // WebSocket real-time updates + 30s fallback poll + WS timeout detection
  useEffect(() => {
    if (!userUuid) return;
    const safeFetch = () => fetchDataRef.current();

    const onEvent = () => {
      lastWsEventRef.current = Date.now();
      safeFetch();
    };

    const unsub = subscribeUserJobs(userUuid, {
      onCompleted: onEvent,
      onFailed: onEvent,
      onQueued: onEvent,
    });

    const interval = setInterval(safeFetch, 30000);

    const wsCheckInterval = setInterval(() => {
      if (hasActive && Date.now() - lastWsEventRef.current > 15000) {
        setWsActive(false);
      } else {
        setWsActive(true);
      }
    }, 5000);

    return () => {
      unsub?.();
      clearInterval(interval);
      clearInterval(wsCheckInterval);
    };
  }, [userUuid, hasActive]);

  // Elapsed timer for cinematic display
  useEffect(() => {
    if (hasActive) {
      // Find the earliest running/queued task to calculate elapsed
      const activeTask = tasks.find(t => t.status === 'running' || t.status === 'queued');
      const startTime = activeTask?.startedAt || Date.now();
      const updateTimer = () => {
        setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
      };
      updateTimer();
      timerRef.current = setInterval(updateTimer, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [hasActive, tasks]);

  const surface = (project?.metadata?.surface as string)
    || (tasks.find(t => t.surface)?.surface as string) || null;

  const aspectRatio = renderJob?.aspect_ratio
    || (tasks.find(t => t.metadata?.aspect)?.metadata?.aspect as string)
    || '16:9';

  const handleViewResult = useCallback(() => {
    const completedTask = tasks.find(t => t.status === 'done');
    if (completedTask) {
      const el = document.getElementById(`task-${completedTask.taskId}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [tasks]);

  const hasOutput = tasks.some(t => t.status === 'done' && t.file);
  const completedJobs = renderJobs.filter(j => j.status === 'completed');
  const hasCompletedJobs = completedJobs.length > 0;

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await daemon.retryGenerate(projectId, {
        model: resolveRetryModel(surface, tasks[0]?.model),
        prompt: project?.name || '',
        length: 5,
        aspect: resolveRetryAspect(surface),
      });
      setTimeout(fetchData, 2000);
    } catch (err: any) {
      addToast(err.message || 'Lỗi khi thử lại', 'error');
    } finally {
      setRetrying(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-32"><div className="h-6 w-6 rounded-full border-2 border-white/10 border-t-[#FF5A1F] animate-spin" /></div>;
  }
  if (!project) {
    return (
      <div className="text-center py-32 space-y-4">
        <p className="text-slate-500 font-medium">Không tìm thấy project</p>
        <Link href="/projects"><Button variant="outline" className="border-white/10">Quay lại</Button></Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6 pb-20 px-2 md:px-0">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Link href="/projects">
          <Button variant="ghost" className="text-slate-500 hover:text-white group px-0 font-bold uppercase tracking-widest text-xs">
            <ArrowLeft className="mr-3 h-5 w-5 transition-transform group-hover:-translate-x-2 text-[#FF5A1F]" />Quay lại
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          {hasActive && <RefreshCw className="h-3.5 w-3.5 text-amber-400 animate-spin" />}
          {hasActive && !wsActive && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[10px] text-amber-500/70 flex items-center gap-1"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500/70" />
              Đang chờ kết nối thời gian thực...
            </motion.p>
          )}
          <Link href="/studio">
            <Button className="h-9 px-6 rounded-xl bg-[#FF5A1F] hover:bg-[#FF6A2B] text-white font-bold text-[10px] uppercase tracking-widest shadow-sm shadow-[#FF5A1F]/20">
              <Wand2 className="mr-2 h-3.5 w-3.5" />Studio
            </Button>
          </Link>
          {hasCompletedJobs && (() => {
            const job = completedJobs[0];
            const isPublished = job.visibility && job.visibility !== 'private';
            return isPublished ? (
              <Button
                onClick={() => setUnpublishTarget(job)}
                disabled={unpublishLoading}
                className="h-9 px-5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] uppercase tracking-widest shadow-sm shadow-amber-600/20"
              >
                <EyeOff className="mr-2 h-3.5 w-3.5" />Gỡ đăng
              </Button>
            ) : (
              <Button onClick={() => setPublishTarget(job)}
                className="h-9 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] uppercase tracking-widest shadow-sm shadow-emerald-600/20">
                <Send className="mr-2 h-3.5 w-3.5" />Đăng tác phẩm
              </Button>
            );
          })()}
          <Button onClick={() => setShowDeleteConfirm(true)} disabled={deleting}
            className="h-9 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-[10px] uppercase tracking-widest border border-red-500/20">
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />Xoá
          </Button>
        </div>
      </div>


      {/* Cinematic generation view for active tasks */}
      {hasActive && (
        <CinematicGenerationStatus
          status={tasks.find(t => t.status === 'running') ? 'running' : 'queued'}
          prompt={renderJob?.prompt}
          elapsedSeconds={elapsedSeconds}
          progress={tasks.find(t => t.status === 'running' || t.status === 'queued')?.progress}
          onViewResult={handleViewResult}
          hasOutput={hasOutput}
        />
      )}

      {/* Tasks */}
      <div className="space-y-3">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-white uppercase tracking-widest">Tasks</h2>
        </div>
        {tasks.length === 0 ? (
          <div className="text-center py-16 space-y-4 bg-[#16141a] rounded-2xl border border-white/12">
            <p className="text-slate-500 font-medium">Chưa có tác vụ nào</p>
            <p className="text-xs text-slate-400">
              {surface === 'image' ? 'Tạo ảnh mới tại Studio → Image' : surface === 'audio' ? 'Tạo âm thanh mới tại Studio → Audio' : 'Tạo video mới tại Studio'}
            </p>
            <Button onClick={handleRetry} disabled={retrying}
              className="inline-flex h-10 px-6 rounded-xl bg-[#FF5A1F] hover:bg-[#FF6A2B] text-white font-bold text-sm disabled:opacity-50">
              {retrying ? 'Đang thử lại...' : 'Thử lại tác vụ'}
            </Button>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {tasks.map((task: TaskRecord) => (
              <motion.div key={task.taskId} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <TaskCard task={task} projectId={projectId} onFetchFile={fetchRawFile} onRetry={handleRetry} retrying={retrying} aspectRatio={aspectRatio} />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <JobHistory jobs={renderJobs} />

      {/* Publish modal */}
      <AnimatePresence>
        {publishTarget && (
          <PublishModal
            key={publishTarget.uuid}
            isOpen={true}
            onClose={() => setPublishTarget(null)}
            assetName={publishTarget.prompt || 'Tác phẩm không tên'}
            creditsCost={publishTarget.credits_cost || 0}
            currentVisibility={publishTarget.visibility}
            currentTags={publishTarget.tags}
            onConfirm={async (visibility, tags) => {
              try {
                const res = await laravel.communityPublish(publishTarget.uuid, visibility, tags);
                if (res?.pending_review) {
                  addToast('Tác phẩm đang chờ kiểm duyệt trước khi hiển thị công khai', 'info');
                } else {
                  addToast('Đăng lên cộng đồng thành công!', 'success');
                }
                setPublishTarget(null);
                fetchData();
              } catch (e: any) {
                if (e?.status === 403) {
                  addToast('Tính năng dành cho gói Pro trở lên', 'error');
                } else if (e?.status === 429) {
                  addToast('Đã đạt giới hạn publish hôm nay', 'error');
                } else {
                  addToast(e?.message || 'Lỗi khi đăng tác phẩm', 'error');
                }
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Delete modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#16141a]/70 backdrop-blur-md z-[200] flex items-center justify-center p-4"
            onClick={() => setShowDeleteConfirm(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="w-full max-w-sm bg-[#16141a] border border-white/10 rounded-2xl p-6 shadow-md"
              onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-white mb-2">Xoá project?</h3>
              <p className="text-sm text-slate-400 mb-6">Xoá vĩnh viễn project và tất cả tài nguyên.</p>
              <div className="flex gap-3">
                <Button onClick={() => setShowDeleteConfirm(false)} disabled={deleting}
                  className="flex-1 h-11 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm">Huỷ</Button>
                <Button onClick={async () => {
                  setDeleting(true);
                  try { await daemon.deleteProject(projectId); window.location.href = '/projects'; }
                  catch (err: any) { addToast(err.message || 'Lỗi khi xoá', 'error'); setShowDeleteConfirm(false); }
                  finally { setDeleting(false); }
                }} disabled={deleting}
                  className="flex-1 h-11 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm">
                  {deleting ? 'Đang xoá...' : 'Xác nhận xoá'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {unpublishTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#16141a]/70 backdrop-blur-md z-[200] flex items-center justify-center p-4"
            onClick={() => setUnpublishTarget(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="w-full max-w-sm bg-[#16141a] border border-white/10 rounded-2xl p-6 shadow-md"
              onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-white mb-2">Gỡ đăng tác phẩm?</h3>
              <p className="text-sm text-slate-400 mb-6">Tác phẩm sẽ không còn hiển thị trên cộng đồng.</p>
              <div className="flex gap-3">
                <Button onClick={() => setUnpublishTarget(null)} disabled={unpublishLoading}
                  className="flex-1 h-11 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm">Huỷ</Button>
                <Button onClick={async () => {
                  setUnpublishLoading(true);
                  try {
                    await laravel.communityUnpublish(unpublishTarget.uuid);
                    addToast('Đã gỡ đăng tác phẩm', 'success');
                    setUnpublishTarget(null);
                    fetchData();
                  } catch (e: any) {
                    addToast(e?.message || 'Lỗi khi gỡ đăng', 'error');
                  } finally {
                    setUnpublishLoading(false);
                  }
                }} disabled={unpublishLoading}
                  className="flex-1 h-11 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm">
                  {unpublishLoading ? 'Đang gỡ...' : 'Xác nhận gỡ'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
