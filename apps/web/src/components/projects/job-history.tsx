'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, FileType } from 'lucide-react';
import { LARAVEL_URL } from '@/lib/api/client';
import type { RenderJobRecord } from './types';

function resolveAssetUrl(url: string): string {
  if (url.startsWith('/api/')) return `${LARAVEL_URL}${url}`;
  return url;
}

const STATUS_LABEL: Record<string, string> = {
  queued: 'Đang chờ', processing: 'Đang xử lý', completed: 'Hoàn thành',
  failed: 'Thất bại', cancelled: 'Đã huỷ',
};
const STATUS_COLOR: Record<string, string> = {
  queued: 'text-amber-400 bg-amber-400/10', processing: 'text-blue-400 bg-blue-400/10',
  completed: 'text-emerald-400 bg-emerald-400/10', failed: 'text-red-400 bg-red-400/10',
  cancelled: 'text-slate-400 bg-slate-400/10',
};

function PromptDisplay({ prompt }: { prompt: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = prompt.length > 200;
  return (
    <div>
      <p className={cn(
        "text-[13px] text-slate-300 leading-relaxed whitespace-pre-wrap break-words",
        !expanded && isLong && "line-clamp-2",
      )}>{prompt}</p>
      {isLong && (
        <button onClick={() => setExpanded(!expanded)}
          className="text-[11px] text-[#FF5A1F] hover:text-[#FF8A5B] transition-colors mt-1 font-medium cursor-pointer select-none">
          {expanded ? '▲ Thu gọn' : '▼ Xem đầy đủ'}
        </button>
      )}
    </div>
  );
}

function MediaPreview({ output_url, mime_type }: { output_url: string; mime_type?: string | null }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const isVideo = mime_type?.startsWith('video/');
  const isAudio = mime_type?.startsWith('audio/');
  const isImage = mime_type?.startsWith('image/');
  const resolvedUrl = resolveAssetUrl(output_url);

  if (error) return null;

  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
      {isVideo ? (
        <div className="relative" style={{ maxWidth: 320 }}>
          <video
            src={resolvedUrl}
            controls
            className="w-full aspect-video object-contain"
            playsInline
            controlsList="nodownload"
            onCanPlay={() => setLoading(false)}
            onError={() => setError(true)}
          />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/40">
              <div className="h-6 w-6 rounded-full border-2 border-white/10 border-t-[#FF5A1F] animate-spin" />
            </div>
          )}
        </div>
      ) : isAudio ? (
        <div className="px-4 py-5 max-w-[320px]">
          <audio
            src={resolvedUrl}
            controls
            className="w-full h-10"
            controlsList="nodownload"
            onCanPlay={() => setLoading(false)}
            onError={() => setError(true)}
          />
          {loading && (
            <div className="flex items-center justify-center h-10 mt-2">
              <div className="h-5 w-5 rounded-full border-2 border-white/10 border-t-[#FF5A1F] animate-spin" />
            </div>
          )}
        </div>
      ) : isImage ? (
        <div className="max-w-[320px]">
          <img
            src={resolvedUrl}
            alt="Kết quả"
            className="w-full h-auto object-contain"
            onLoad={() => setLoading(false)}
            onError={() => setError(true)}
          />
          {loading && (
            <div className="flex items-center justify-center aspect-[4/3]">
              <div className="h-6 w-6 rounded-full border-2 border-white/10 border-t-[#FF5A1F] animate-spin" />
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 px-4 py-3">
          <FileType className="h-4 w-4 text-slate-500" />
          <a href={resolvedUrl} target="_blank" rel="noopener noreferrer"
            className="text-xs text-[#FF5A1F] hover:underline cursor-pointer">
            Xem kết quả
          </a>
        </div>
      )}
      {mime_type && (
        <div className="px-3 py-1.5 border-t border-white/[0.04]">
          <span className="text-[10px] text-slate-600">{mime_type}</span>
        </div>
      )}
    </div>
  );
}

function JobItem({ job }: { job: RenderJobRecord }) {
  const isImage = job.mime_type?.startsWith('image/') || job.capability?.startsWith('t2i') || job.video_type === 'image_generation';
  return (
    <div className="bg-zinc-950 border border-white/5 rounded-xl overflow-hidden">
      <div className="p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className={cn("text-[11px] font-bold px-2.5 py-1 rounded-lg", STATUS_COLOR[job.status] || 'text-slate-400 bg-white/5')}>
            {STATUS_LABEL[job.status] || job.status}
          </span>
          <p className="text-[11px] text-slate-600">
            {new Date(job.created_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
          </p>
        </div>
        {job.prompt && <PromptDisplay prompt={job.prompt} />}
        {job.error_message && (
          <p className="text-[11px] text-red-400/80 bg-red-500/5 rounded-lg px-3 py-2">
            {job.error_message}
          </p>
        )}
        {job.status === 'completed' && job.output_url ? (
          <MediaPreview output_url={job.output_url} mime_type={job.mime_type} />
        ) : job.status === 'completed' && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400/70 bg-emerald-500/5 px-2 py-0.5 rounded-md">
            <CheckCircle2 className="h-3 w-3" />
            Có kết quả
          </span>
        )}
        <div className="flex items-center gap-1.5 flex-wrap">
          {!isImage && job.duration_seconds > 0 && (
            <span className="text-[10px] font-medium text-slate-600 bg-white/[0.03] px-2 py-0.5 rounded-md">{job.duration_seconds}s</span>
          )}
          {job.resolution && (
            <span className="text-[10px] font-medium text-slate-600 bg-white/[0.03] px-2 py-0.5 rounded-md">{job.resolution}</span>
          )}
          {job.aspect_ratio && (
            <span className="text-[10px] font-medium text-slate-600 bg-white/[0.03] px-2 py-0.5 rounded-md">{job.aspect_ratio}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function JobHistory({ jobs }: { jobs: RenderJobRecord[] }) {
  if (jobs.length === 0) return null;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-white uppercase tracking-widest">Lịch sử tác vụ</h2>
        <span className="text-[10px] text-slate-600">{jobs.length} lần</span>
      </div>
      <div className="space-y-2">
        {jobs.map((job, idx) => (
          <JobItem key={job.id || idx} job={job} />
        ))}
      </div>
    </div>
  );
}
