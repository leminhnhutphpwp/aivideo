'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Bell, ArrowLeft, Info, AlertTriangle, CheckCircle, AlertCircle, Clock, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { laravel } from '@/lib/api/client';
import { useToastStore } from '@/stores/toast-store';

interface NotificationDetail {
  uuid: string;
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

export default function NotificationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [notif, setNotif] = useState<NotificationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const addToast = useToastStore(s => s.addToast);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await laravel.notification(id);
      if (res?.data) {
        setNotif(res.data);
        // Auto mark as read if unread
        if (!res.data.read) {
          handleMarkReadSilently();
        }
      }
    } catch {
      addToast('Không thể tải thông báo', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkReadSilently = async () => {
    try {
      await laravel.markNotificationRead(id);
      setNotif(prev => prev ? { ...prev, read: true, read_at: new Date().toISOString() } : prev);
    } catch {
      // silent
    }
  };

  const handleMarkRead = async () => {
    if (notif?.read) return;
    setMarking(true);
    try {
      await laravel.markNotificationRead(id);
      setNotif(prev => prev ? { ...prev, read: true, read_at: new Date().toISOString() } : prev);
      addToast('Đã đánh dấu đã đọc', 'success');
    } catch {
      addToast('Không thể cập nhật', 'error');
    } finally {
      setMarking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 rounded-full border-2 border-white/10 border-t-[#FF5A1F] animate-spin" />
        <p className="text-xs text-slate-400 font-medium mt-4">Đang tải thông báo...</p>
      </div>
    );
  }

  if (!notif) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Bell className="h-12 w-12 text-slate-800 mb-4" />
        <p className="text-sm text-slate-400 font-medium">Không tìm thấy thông báo</p>
        <button
          onClick={() => router.push('/notifications')}
          className="mt-4 h-9 px-4 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold hover:bg-white/10 transition-all flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại
        </button>
      </div>
    );
  }

  const Icon = TYPE_ICONS[notif.type] || Info;
  const color = TYPE_COLORS[notif.type] || TYPE_COLORS.info;
  const label = TYPE_LABELS[notif.type] || 'Thông tin';

  return (
    <div className="flex flex-col gap-6 md:gap-6 pb-20 font-sans relative max-w-3xl mx-auto">
      <div className="absolute -top-20 -left-20 w-[400px] h-[400px] rounded-full bg-[#FF5A1F]/5 blur-[120px] pointer-events-none" />

      {/* Back button */}
      <button
        onClick={() => router.push('/notifications')}
        className="self-start h-9 px-4 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold hover:bg-white/10 transition-all flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại danh sách
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-6"
      >
        {/* Header card */}
        <div className="p-5 md:p-6 rounded-2xl md:rounded-2xl bg-gradient-to-b from-[#0c0c0c] to-[#080808] border border-white/12">
          <div className="flex items-start gap-4">
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${color}`}>
                  {label}
                </span>
                {!notif.read && (
                  <span className="h-2 w-2 rounded-full bg-[#FF5A1F] animate-pulse" />
                )}
              </div>
              <h1 className="text-xl md:text-2xl font-display font-bold text-white tracking-tight mt-2 leading-snug">
                {notif.title}
              </h1>
              <div className="flex items-center gap-3 mt-3 text-[10px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {notif.sent_at ? new Date(notif.sent_at).toLocaleString('vi-VN') : ''}
                </span>
                {notif.read_at && (
                  <span className="flex items-center gap-1 text-slate-500">
                    <Check className="h-3 w-3" />
                    Đã đọc
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Body card */}
        <div className="p-5 md:p-6 rounded-2xl md:rounded-2xl bg-gradient-to-b from-[#0c0c0c] to-[#080808] border border-white/12">
          <div
            className="prose prose-invert prose-sm max-w-none text-slate-300 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: notif.body }}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {!notif.read && (
            <button
              onClick={handleMarkRead}
              disabled={marking}
              className="h-10 px-5 rounded-xl bg-[#FF5A1F] text-white font-bold text-xs tracking-tight hover:bg-[#FF5A1F]/90 transition-all flex items-center gap-2 shadow-sm shadow-[#FF5A1F]/20 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {marking ? 'Đang cập nhật...' : 'Đánh dấu đã đọc'}
            </button>
          )}
          <button
            onClick={() => router.push('/notifications')}
            className="h-10 px-5 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-xs tracking-tight hover:bg-white/10 transition-all flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại danh sách
          </button>
        </div>
      </motion.div>
    </div>
  );
}
