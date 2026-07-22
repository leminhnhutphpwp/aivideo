'use client';

import { useState, useEffect } from 'react';
import { ScrollText, Clock, ArrowUpDown, Activity, User, FileText, Video, Image as ImageIcon, Music, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { laravel } from '@/lib/api/client';
import { showApiError } from '@/lib/api/handle-response';
import { t } from '@/lib/i18n';

interface LogEntry {
  id: number;
  log_name?: string;
  description: string;
  subject_type?: string;
  subject_id?: number;
  event?: string;
  causer_type?: string;
  causer_id?: number;
  properties?: any;
  batch_uuid?: string;
  created_at: string;
  updated_at?: string;
  causer?: { id: number; name: string; email: string } | null;
  subject?: any;
}

const SUBJECT_LABELS: Record<string, string> = {
  'App\\Models\\User': 'Người dùng',
  'App\\Models\\Asset': 'Tài sản',
  'App\\Models\\RenderJob': 'Tác vụ render',
  'App\\Models\\EmailTemplate': 'Mẫu email',
  'App\\Models\\Plan': 'Gói dịch vụ',
  'App\\Models\\Credit': 'Credit',
  'App\\Models\\ApiKey': 'API Key',
};

const EVENT_LABELS: Record<string, string> = {
  created: 'Tạo mới',
  updated: 'Cập nhật',
  deleted: 'Xoá',
  login: 'Đăng nhập',
  logout: 'Đăng xuất',
  job_created: 'Tạo tác vụ',
};

const EVENT_COLORS: Record<string, string> = {
  created: 'text-emerald-400 bg-emerald-400/10',
  login: 'text-[#FF8A5B] bg-[#FF8A5B]/10',
  logout: 'text-slate-400 bg-slate-400/10',
  updated: 'text-amber-400 bg-amber-400/10',
  deleted: 'text-red-400 bg-red-400/10',
  job_created: 'text-[#FF5A1F] bg-[#FF5A1F]/10',
};

function getSubjectLabel(type?: string): string {
  if (!type) return 'Hệ thống';
  return SUBJECT_LABELS[type] || type.split('\\').pop() || type;
}

function getSubjectIcon(type?: string) {
  if (!type) return <Settings className="h-4 w-4" />;
  if (type.includes('User')) return <User className="h-4 w-4" />;
  if (type.includes('RenderJob')) return <Video className="h-4 w-4" />;
  if (type.includes('Asset')) return <FileText className="h-4 w-4" />;
  if (type.includes('EmailTemplate')) return <FileText className="h-4 w-4" />;
  return <Activity className="h-4 w-4" />;
}

function getEventLabel(event?: string): string {
  if (!event) return '—';
  return EVENT_LABELS[event] || event;
}

function getEventColor(event?: string): string {
  if (!event) return 'text-slate-400 bg-slate-400/10';
  return EVENT_COLORS[event] || 'text-slate-400 bg-slate-400/10';
}

function buildDescription(log: LogEntry): string {
  const subject = getSubjectLabel(log.subject_type);
  const event = log.event;

  if (log.description === 'job_created') {
    const props = log.properties;
    return `Tạo tác vụ render${props?.duration ? ` (${props.duration}s)` : ''}`;
  }

  if (log.description && !['created', 'updated', 'deleted'].includes(log.description)) {
    const customLabels: Record<string, string> = {
      login: 'Đăng nhập hệ thống',
      logout: 'Đăng xuất hệ thống',
    };
    if (customLabels[log.description]) return customLabels[log.description];
  }

  switch (event) {
    case 'created': return `Tạo ${subject.toLowerCase()} mới`;
    case 'updated': return `Cập nhật ${subject.toLowerCase()}`;
    case 'deleted': return `Xoá ${subject.toLowerCase()}`;
    default: break;
  }

  return log.description || '—';
}

function formatPropertyName(key: string): string {
  const labels: Record<string, string> = {
    credits: 'Credits',
    plan_id: 'Gói dịch vụ',
    name: 'Tên',
    email: 'Email',
    model: 'Mô hình',
    duration: 'Thời lượng',
    resolution: 'Độ phân giải',
    cost: 'Chi phí',
  };
  return labels[key] || key;
}

function PropertyChanges({ properties, event }: { properties?: any; event?: string }) {
  if (!properties || event === 'created' || event === 'deleted') return null;
  const changes = properties.attributes && properties.old
    ? Object.keys(properties.attributes).filter(k => JSON.stringify(properties.attributes[k]) !== JSON.stringify(properties.old[k]))
    : [];

  if (changes.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {changes.slice(0, 5).map(key => (
        <span key={key} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/5 text-slate-400 border border-white/12">
          {formatPropertyName(key)}: <span className="text-white">{String(properties.attributes[key] ?? '—')}</span>
        </span>
      ))}
      {changes.length > 5 && (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/5 text-slate-400">+{changes.length - 5} khác</span>
      )}
    </div>
  );
}

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  const fetchLogs = async (p: number, dir: 'desc' | 'asc' = sortDir) => {
    setLoading(true);
    try {
      const res = await laravel.activityLogs({ page: p, per_page: 20, sort: dir });
      const payload = res.data as any;
      setLogs(Array.isArray(payload.items) ? payload.items : []);
      setCurrentPage(p);
      setSortDir(dir);
      setTotalPages(payload.last_page || 1);
      setTotal(payload.total || 0);
    } catch (err) {
      showApiError(err, t('activityLogs.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(1); }, []);

  // Toggle sort server-side so ALL pages reorder (not just the current 20 rows),
  // and reset to page 1 since order changed.
  const toggleSort = () => {
    const dir = sortDir === 'desc' ? 'asc' : 'desc';
    fetchLogs(1, dir);
  };

  const getPageNumbers = (): (number | '...')[] => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    if (currentPage > 3) pages.push('...');
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
    return pages;
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold tracking-tight text-white">{t('activityLogs.title')}</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">{t('activityLogs.desc')}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-400 font-bold">{total} mục</span>
          <button onClick={toggleSort}
            className="flex items-center gap-2 h-9 px-4 rounded-xl bg-[#16141a] border border-white/12 text-xs font-bold text-slate-400 hover:text-white transition-all uppercase tracking-widest">
            <ArrowUpDown className="h-3.5 w-3.5" />
            {sortDir === 'desc' ? t('activityLogs.newest') : t('activityLogs.oldest')}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {logs.map((log) => (
          <div key={log.id}
            className="flex items-start gap-4 p-4 rounded-2xl bg-[#16141a]/60 border border-white/12 hover:bg-[#16141a]/80 transition-all">
            <div className={`p-2.5 rounded-xl ${getEventColor(log.event)}`}>
              {getSubjectIcon(log.subject_type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-semibold text-white">{buildDescription(log)}</span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${getEventColor(log.event)}`}>
                  {getEventLabel(log.event)}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold text-slate-500 bg-white/5">
                  {getSubjectLabel(log.subject_type)}
                </span>
              </div>
              {log.causer && (
                <p className="text-[11px] text-slate-500 mt-1">bởi <span className="text-slate-400 font-medium">{log.causer.name}</span></p>
              )}
              <PropertyChanges properties={log.properties} event={log.event} />
              <div className="flex items-center gap-4 mt-1.5">
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Clock className="h-3 w-3" />
                  {new Date(log.created_at).toLocaleString('vi-VN')}
                </span>
              </div>
            </div>
          </div>
        ))}

        {!loading && logs.length === 0 && (
          <div className="text-center py-20 text-slate-400">
            <ScrollText className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-sm font-medium">{t('activityLogs.empty')}</p>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 rounded-full border-2 border-white/10 border-t-[#FF5A1F] animate-spin" />
          </div>
        )}
      </div>

      {totalPages > 1 && !loading && (
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => fetchLogs(currentPage - 1)}
            disabled={currentPage <= 1}
            className="h-10 w-10 rounded-xl bg-[#16141a] border border-white/12 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronLeft className="h-4 w-4" />
          </button>
          {getPageNumbers().map((p, i) =>
            p === '...' ? (
              <span key={`dots-${i}`} className="h-10 w-10 flex items-center justify-center text-slate-400 text-xs font-bold">...</span>
            ) : (
              <button
                key={p}
                onClick={() => fetchLogs(p)}
                className={`h-10 w-10 rounded-xl flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                  p === currentPage
                    ? 'bg-[#FF5A1F] text-white shadow-sm shadow-[#FF5A1F]/20'
                    : 'bg-[#16141a] border border-white/12 text-slate-400 hover:text-white hover:bg-white/5'
                }`}>
                {p}
              </button>
            )
          )}
          <button
            onClick={() => fetchLogs(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="h-10 w-10 rounded-xl bg-[#16141a] border border-white/12 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
