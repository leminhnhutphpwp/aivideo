'use client';

import { useState } from 'react';
import { useEffect } from 'react';
import { CheckCircle2, XCircle, Clock, FileType, Download, Play, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import type { TaskRecord } from './types';

function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function elapsedStr(startedAt: number | undefined, endedAt: number | undefined | null): string {
  const start = startedAt ?? Date.now();
  const ms = (endedAt ?? Date.now()) - start;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

const STATUS_LABEL: Record<string, string> = { queued: 'Đang chờ', running: 'Đang xử lý', done: 'Hoàn thành', failed: 'Thất bại', interrupted: 'Thất bại' };
const STATUS_COLOR: Record<string, string> = { queued: 'text-slate-400 bg-white/5', running: 'text-amber-400 bg-amber-400/10', done: 'text-emerald-400 bg-emerald-400/10', failed: 'text-red-400 bg-red-400/10', interrupted: 'text-orange-400 bg-orange-400/10' };
const SURFACE_LABEL: Record<string, string> = { image: 'Hình ảnh', video: 'Video', audio: 'Âm thanh' };

function StatusIcon({ status }: { status?: string }) {
  const isRunning = status === 'running';
  const isQueued = status === 'queued';
  const isDone = status === 'done';
  const isFailed = status === 'failed' || status === 'interrupted';

  return (
    <div className={cn(
      "h-10 w-10 md:h-12 md:w-12 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-500",
      isRunning && "bg-[#FF5A1F]/10 text-[#FF5A1F] border border-[#FF5A1F]/20",
      isQueued && "bg-[#FF5A1F]/5 text-[#FF5A1F]/70 border border-[#FF5A1F]/10",
      isDone && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
      isFailed && "bg-red-500/10 text-red-400 border border-red-500/20",
      !status && "bg-white/5 border border-white/5 text-slate-500",
    )}>
      {isRunning ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : isQueued ? (
        <div className="flex gap-1">
          <motion.div className="h-1.5 w-1.5 rounded-full bg-current" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0 }} />
          <motion.div className="h-1.5 w-1.5 rounded-full bg-current" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }} />
          <motion.div className="h-1.5 w-1.5 rounded-full bg-current" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }} />
        </div>
      ) : isDone ? (
        <CheckCircle2 className="h-5 w-5" />
      ) : isFailed ? (
        <XCircle className="h-5 w-5" />
      ) : (
        <Clock className="h-5 w-5" />
      )}
    </div>
  );
}

function TaskMeta({ task }: { task: TaskRecord }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="text-sm font-semibold text-white">{SURFACE_LABEL[task.surface ?? ''] || 'Tạo mới'}</span>
      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest", STATUS_COLOR[task.status ?? ''] || 'text-slate-400 bg-white/5')}>
        {STATUS_LABEL[task.status ?? ''] || task.status}
      </span>
      {task.surface && (
        <span className="text-[10px] text-slate-500 uppercase tracking-widest">{SURFACE_LABEL[task.surface] || task.surface}</span>
      )}
    </div>
  );
}

function ProgressMessages({ progress }: { progress?: string[] }) {
  if (!progress || progress.length === 0) return null;
  return (
    <div className="space-y-0.5">
      {progress.slice(-3).map((msg, i) => (
        <p key={i} className="text-xs text-slate-500 flex items-center gap-1.5">
          <span className="h-1 w-1 rounded-full bg-slate-600 shrink-0" />{msg}
        </p>
      ))}
    </div>
  );
}

function TimingInfo({ task }: { task: TaskRecord }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600">
      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{elapsedStr(task.startedAt, task.endedAt)}</span>
      {task.startedAt && <span>Bắt đầu: {new Date(task.startedAt).toLocaleTimeString('vi-VN')}</span>}
      {task.endedAt && <span>Kết thúc: {new Date(task.endedAt).toLocaleTimeString('vi-VN')}</span>}
    </div>
  );
}

function FileInfo({ file, projectId, onFetchFile, aspectRatio }: { file: NonNullable<TaskRecord['file']>; projectId: string; onFetchFile: (projectId: string, fileName: string) => Promise<{ blobUrl: string; blob: Blob }>; aspectRatio?: string }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const isImage = file.mime?.startsWith('image/');
  const isVideo = file.mime?.startsWith('video/');
  const isAudio = file.mime?.startsWith('audio/');

  const loadPreview = async () => {
    if (!file.name || previewUrl) return;
    setLoading(true);
    try {
      const { blobUrl } = await onFetchFile(projectId, file.name);
      setPreviewUrl(blobUrl);
    } catch { setPreviewUrl(null); }
    finally { setLoading(false); }
  };

  // Auto-load ALL media types (not just images)
  useEffect(() => {
    if ((isImage || isVideo || isAudio) && file.name && !previewUrl) {
      loadPreview();
    }
  }, []);

  const handleDownload = async () => {
    if (!file.name || downloading) return;
    setDownloading(true);
    try {
      const { blob, blobUrl } = await onFetchFile(projectId, file.name);
      const ext = file.name.includes('.') ? file.name.split('.').pop() : 'mp4';
      const surface = isVideo ? 'video' : isImage ? 'image' : isAudio ? 'audio' : 'file';
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = now.getFullYear();
      const dateStr = `${dd}-${mm}-${yyyy}`;
      const shortId = projectId.slice(0, 8);
      const cleanName = `${surface}_${shortId}_${dateStr}.${ext}`;
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = cleanName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch {}
    finally { setDownloading(false); }
  };

  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 space-y-2 flex flex-col h-full">
      <div className="flex flex-wrap items-center gap-3 text-[11px]">
        {file.mime && <span className="text-slate-500"><FileType className="h-3 w-3 inline" /> {file.mime}</span>}
        {file.size != null && <span className="text-slate-500">{fmtBytes(file.size)}</span>}
      </div>

      {/* Video player */}
      {isVideo && (
        <div className="relative rounded-xl overflow-hidden border border-white/[0.06] bg-zinc-950/60 shadow-sm shadow-black/40 group" style={{ maxWidth: (() => { const [w, h] = (aspectRatio || '16:9').split(':').map(Number); return w < h ? 280 : 448; })() }}>
          {previewUrl ? (
            <>
              <div className={cn(
                "w-full",
                aspectRatio && `aspect-[${aspectRatio.replace(':', '/')}]`,
                !aspectRatio && "aspect-video"
              )}>
                <video
                  src={previewUrl}
                  controls
                  autoPlay={false}
                  className="w-full h-full object-contain"
                  playsInline
                  controlsList="nodownload noremoteplayback noplaybackrate"
                  disablePictureInPicture
                  onContextMenu={e => e.preventDefault()}
                >
                  Trình duyệt không hỗ trợ phát video
                </video>
              </div>
              <div className="absolute inset-0 rounded-xl pointer-events-none ring-1 ring-inset ring-white/[0.06]" />
            </>
          ) : (
            <div className="flex items-center justify-center aspect-video">
              {loading ? (
                <div className="h-6 w-6 rounded-full border-2 border-white/10 border-t-[#FF5A1F] animate-spin" />
              ) : (
                <button onClick={loadPreview} className="text-xs text-[#FF5A1F] hover:underline cursor-pointer">
                  Nhấn để xem video
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Audio player */}
      {isAudio && (
        <div className="relative rounded-xl overflow-hidden border border-white/[0.06] bg-white/[0.02] max-w-[400px] shadow-sm shadow-black/20">
          {previewUrl ? (
            <div className="px-4 py-5">
              <audio
                src={previewUrl}
                controls
                className="w-full h-10"
                controlsList="nodownload"
                onContextMenu={e => e.preventDefault()}
              >
                Trình duyệt không hỗ trợ phát âm thanh
              </audio>
            </div>
          ) : (
            <div className="flex items-center justify-center h-16">
              {loading ? (
                <div className="h-5 w-5 rounded-full border-2 border-white/10 border-t-[#FF5A1F] animate-spin" />
              ) : (
                <button onClick={loadPreview} className="text-xs text-[#FF5A1F] hover:underline cursor-pointer">
                  Nhấn để nghe
                </button>
              )}
            </div>
          )}
          <div className="absolute inset-0 rounded-xl pointer-events-none ring-1 ring-inset ring-white/[0.06]" />
        </div>
      )}

      {/* Image preview */}
      {isImage && (
        <div className="relative rounded-xl overflow-hidden border border-white/[0.06] bg-zinc-950/40 shadow-sm shadow-black/20 group" style={{ maxWidth: (() => { const [w, h] = (aspectRatio || '4:3').split(':').map(Number); return w < h ? 320 : 400; })() }}>
          {previewUrl ? (
            <div className={cn(
              "w-full",
              aspectRatio && `aspect-[${aspectRatio.replace(':', '/')}]`,
              !aspectRatio && "aspect-[4/3]"
            )}>
              <img src={previewUrl} alt={file.name || 'Preview'} className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="flex items-center justify-center aspect-[4/3]">
              {loading ? (
                <div className="h-6 w-6 rounded-full border-2 border-white/10 border-t-[#FF5A1F] animate-spin" />
              ) : (
                <button onClick={loadPreview} className="text-xs text-[#FF5A1F] hover:underline cursor-pointer">
                  Nhấn để xem ảnh
                </button>
              )}
            </div>
          )}
          <div className="absolute inset-0 rounded-xl pointer-events-none ring-1 ring-inset ring-white/[0.06]" />
        </div>
      )}

      {/* Action buttons */}
      {file.name && (
        <div className="flex gap-2 pt-1">
          {!isImage && !isVideo && !isAudio && (
            <Button onClick={loadPreview} className="h-7 px-3 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-[10px] font-bold border border-emerald-500/20">
              <Play className="h-3 w-3 mr-1 fill-current" />Xem
            </Button>
          )}
          <button onClick={handleDownload} disabled={downloading}
            className="cursor-pointer h-8 flex items-center gap-1.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-[11px] text-white font-semibold transition-all shadow-[0_2px_12px_rgba(16,185,129,0.25)] disabled:opacity-50 disabled:cursor-not-allowed">
            {downloading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
            {downloading ? 'Đang tải...' : 'Tải về'}
          </button>
        </div>
      )}

      {file.usedStubFallback && (
        <p className="text-[10px] text-amber-500 flex items-center gap-1">
          <AlertCircle className="h-3 w-3 shrink-0" />Dự phòng — đã có lỗi khi tạo
        </p>
      )}
    </div>
  );
}

function ErrorInfo({ error, onRetry, retrying }: { error?: TaskRecord['error']; onRetry: () => void; retrying: boolean }) {
  if (!error) return null;
  return (
    <div className="bg-red-400/5 border border-red-400/10 rounded-xl p-3 space-y-2">
      <p className="text-xs text-red-400 flex items-center gap-1.5">
        <AlertCircle className="h-3 w-3 shrink-0" />{error.message || 'Có lỗi xảy ra'}
      </p>
      <Button onClick={onRetry} disabled={retrying} size="sm"
        className="h-7 px-3 rounded-lg bg-red-400/10 text-red-400 hover:bg-red-400/20 text-[10px] font-bold border border-red-400/20">
        ⟳ Thử lại
      </Button>
    </div>
  );
}

export function TaskCard({ task, projectId, onFetchFile, onRetry, retrying, aspectRatio }: {
  task: TaskRecord; projectId: string; onFetchFile: (projectId: string, fileName: string) => Promise<{ blobUrl: string; blob: Blob }>; onRetry: () => void; retrying: boolean; aspectRatio?: string;
}) {
  const isActive = task.status === 'queued' || task.status === 'running';
  const isDone = task.status === 'done';
  const isFailed = task.status === 'failed' || task.status === 'interrupted';
  const inputImage = task.metadata?.inputImage as string | undefined;
  const lastFrameImage = task.metadata?.lastFrameImage as string | undefined;

  return (
    <motion.div id={`task-${task.taskId}`}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={cn(
        "relative overflow-hidden rounded-xl border transition-all duration-700",
        "bg-zinc-950 border-white/5",
        isActive && "border-[#FF5A1F]/10 shadow-[0_0_30px_rgba(255,90,31,0.03)]",
        isDone && "border-emerald-500/10 bg-gradient-to-r from-[#0A1510]/50 to-[#0A0A0A]",
        isFailed && "border-red-500/10 bg-gradient-to-r from-[#150A0A]/50 to-[#0A0A0A]",
      )}
    >
      {/* Active glow edge */}
      {isActive && (
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, #FF5A1F33, transparent)' }}
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      )}

      <div className="p-5 md:p-6">
        <div className="flex items-start gap-4">
          <StatusIcon status={task.status} />
          <div className="flex-1 min-w-0 space-y-2">
            <TaskMeta task={task} />
            <ProgressMessages progress={task.progress} />
            <TimingInfo task={task} />
            {/* Input vs output comparison */}
            {(() => {
              const imagesArray = task.metadata?.images as string[] | undefined;
              const inputImagesList = imagesArray?.length ? imagesArray : (inputImage ? [inputImage] : []);
              const hasInputs = inputImagesList.length > 0 || lastFrameImage;
              const hasOutput = isDone && task.file;
              
              if (!hasInputs && !hasOutput) return null;
              if (!hasInputs && hasOutput) {
                return <FileInfo file={task.file!} projectId={projectId} onFetchFile={onFetchFile} aspectRatio={aspectRatio} />;
              }

              const totalItems = inputImagesList.length + (lastFrameImage ? 1 : 0) + (hasOutput ? 1 : 0);
              let gridClass = 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4';
              if (totalItems === 2) gridClass = 'grid-cols-2';
              if (totalItems === 3) gridClass = 'grid-cols-3';
              if (totalItems === 4) gridClass = 'grid-cols-4';

              return (
                <div className={`grid gap-2 ${gridClass}`}>
                  {inputImagesList.map((img, i) => (
                    <InputImagePreview 
                      key={i} 
                      fileName={img} 
                      label={inputImagesList.length > 1 ? `Ảnh gốc ${i + 1}` : (lastFrameImage ? 'First frame' : 'Ảnh gốc')} 
                      projectId={projectId} 
                      onFetchFile={onFetchFile} 
                      aspectRatio={aspectRatio}
                    />
                  ))}
                  {lastFrameImage && (
                    <InputImagePreview fileName={lastFrameImage} label="Last frame" projectId={projectId} onFetchFile={onFetchFile} aspectRatio={aspectRatio} />
                  )}
                  {hasOutput && (
                    <FileInfo file={task.file!} projectId={projectId} onFetchFile={onFetchFile} aspectRatio={aspectRatio} />
                  )}
                </div>
              );
            })()}
            <ErrorInfo error={task.error} onRetry={onRetry} retrying={retrying} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function InputImagePreview({ fileName, label = 'Ảnh gốc', projectId, onFetchFile, aspectRatio }: { fileName: string; label?: string; projectId: string; onFetchFile: (projectId: string, fileName: string) => Promise<{ blobUrl: string; blob: Blob }>; aspectRatio?: string }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!fileName) return;
    onFetchFile(projectId, fileName)
      .then(({ blobUrl }) => setPreviewUrl(blobUrl))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [fileName, projectId]);

  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 space-y-2 flex flex-col h-full">
      <div className="flex flex-wrap items-center gap-3 text-[11px]">
        <span className="text-slate-500 font-medium uppercase tracking-widest">{label}</span>
      </div>
      
      <div className="relative rounded-xl overflow-hidden border border-white/[0.06] bg-zinc-950/40 shadow-sm shadow-black/20 group" style={{ maxWidth: (() => { const [w, h] = (aspectRatio || '4:3').split(':').map(Number); return w < h ? 320 : 400; })() }}>
        {previewUrl ? (
          <div className={cn(
            "w-full",
            aspectRatio && `aspect-[${aspectRatio.replace(':', '/')}]`,
            !aspectRatio && "aspect-[4/3]"
          )}>
            <img src={previewUrl} alt={label} className="w-full h-full object-contain" />
          </div>
        ) : loading ? (
          <div className={cn("flex items-center justify-center w-full", aspectRatio ? `aspect-[${aspectRatio.replace(':', '/')}]` : "aspect-[4/3]")}>
            <div className="h-6 w-6 rounded-full border-2 border-white/10 border-t-[#FF5A1F] animate-spin" />
          </div>
        ) : (
          <div className={cn("flex items-center justify-center w-full", aspectRatio ? `aspect-[${aspectRatio.replace(':', '/')}]` : "aspect-[4/3]")}>
            <span className="text-[10px] text-slate-600">...</span>
          </div>
        )}
      </div>
    </div>
  );
}
