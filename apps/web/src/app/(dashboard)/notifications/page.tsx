'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Info, AlertTriangle, CheckCircle, AlertCircle, Check, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { laravel } from '@/lib/api/client';
import { useToastStore } from '@/stores/toast-store';

interface Notification {
  id: number;
  title: string;
  body: string;
  type: string;
  read: boolean;
  read_at: string | null;
  sent_at: string;
  created_at: string;
}

const TYPE_ICONS: Record<string, typeof Info> = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle,
  error: AlertCircle,
};

const TYPE_COLORS: Record<string, string> = {
  info: 'text-[#FF8A5B] bg-[#FF8A5B]/10 border-[#FF8A5B]/20',
  warning: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  success: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  error: 'text-red-400 bg-red-400/10 border-red-400/20',
};

const TYPE_LABELS: Record<string, string> = {
  info: 'Thông tin',
  warning: 'Cảnh báo',
  success: 'Thành công',
  error: 'Lỗi',
};

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const addToast = useToastStore(s => s.addToast);

  const fetchNotifications = async (page: number) => {
    setLoading(true);
    try {
      const res = await laravel.notifications({ page });
      setNotifications(res.data || []);
      setTotalPages(res.meta?.last_page || 1);
      setCurrentPage(page);
    } catch {
      addToast('Không thể tải thông báo', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(1);
  }, []);

  const handleMarkAllRead = async () => {
    await laravel.markAllNotificationsRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true, read_at: new Date().toISOString() })));
    addToast('Đã đánh dấu tất cả đã đọc', 'success');
  };

  const filtered = filter === 'unread' ? notifications.filter(n => !n.read) : notifications;
  const hasUnread = notifications.some(n => !n.read);

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
    <div className="flex flex-col gap-6 md:gap-6 pb-20 font-sans relative">
      <div className="absolute -top-20 -left-20 w-[400px] h-[400px] rounded-full bg-[#FF5A1F]/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[#FF5A1F] animate-pulse" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Hệ thống</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-white leading-[1.1]">
            Thông báo
          </h1>
        </div>
        {hasUnread && (
          <button
            onClick={handleMarkAllRead}
            className="h-10 px-5 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-xs tracking-tight hover:bg-white/10 transition-all flex items-center gap-2"
          >
            <Check className="h-4 w-4" />
            Đánh dấu tất cả đã đọc
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
            filter === 'all' ? 'bg-[#FF5A1F] text-white shadow-sm' : 'bg-white/5 text-slate-500 hover:text-slate-300 border border-white/5'
          }`}
        >
          Tất cả
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
            filter === 'unread' ? 'bg-[#FF5A1F] text-white shadow-sm' : 'bg-white/5 text-slate-500 hover:text-slate-300 border border-white/5'
          }`}
        >
          Chưa đọc
        </button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 rounded-full border-2 border-white/10 border-t-[#FF5A1F] animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-32 text-center bg-zinc-950 rounded-2xl border border-white/5 space-y-4">
            <Bell className="h-12 w-12 text-slate-700 mx-auto" />
            <p className="text-sm text-slate-500 font-medium">Chưa có thông báo nào</p>
          </div>
        ) : (
          filtered.map((notif, idx) => {
            const Icon = TYPE_ICONS[notif.type] || Info;
            const color = TYPE_COLORS[notif.type] || TYPE_COLORS.info;
            const label = TYPE_LABELS[notif.type] || 'Thông tin';
            return (
              <motion.div
                key={notif.id ?? `notif-${idx}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => router.push(`/notifications/${notif.id}`)}
                className={`p-4 md:p-5 rounded-2xl md:rounded-2xl bg-gradient-to-b from-[#0c0c0c] to-[#080808] border ${!notif.read ? 'border-[#FF5A1F]/20' : 'border-white/5'} hover:border-white/10 transition-all cursor-pointer`}
              >
                <div className="flex items-start gap-4">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className={`text-sm font-bold tracking-tight ${!notif.read ? 'text-white' : 'text-slate-400'}`}>
                        {notif.title}
                      </h3>
                      {!notif.read && (
                        <div className="h-2 w-2 rounded-full bg-[#FF5A1F] shrink-0" />
                      )}
                    </div>
                    <div
                      className="text-xs text-slate-500 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: notif.body }}
                    />
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${color}`}>
                          {label}
                        </span>
                        <span className="text-[10px] text-slate-600">
                          {notif.sent_at ? new Date(notif.sent_at).toLocaleString('vi-VN') : ''}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-[#FF5A1F] uppercase tracking-wider flex items-center gap-1">
                        Xem chi tiết
                        <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && !loading && (
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => fetchNotifications(currentPage - 1)}
            disabled={currentPage <= 1}
            className="h-9 w-9 rounded-xl bg-zinc-950 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {getPageNumbers().map((p, i) =>
            p === '...' ? (
              <span key={`dots-${i}`} className="h-9 w-9 flex items-center justify-center text-slate-600 text-xs font-bold">...</span>
            ) : (
              <button
                key={p}
                onClick={() => fetchNotifications(p)}
                className={`h-9 w-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                  p === currentPage ? 'bg-[#FF5A1F] text-white shadow-sm shadow-[#FF5A1F]/20' : 'bg-zinc-950 border border-white/5 text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {p}
              </button>
            )
          )}
          <button
            onClick={() => fetchNotifications(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="h-9 w-9 rounded-xl bg-zinc-950 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
