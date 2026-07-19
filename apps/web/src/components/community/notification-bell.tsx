'use client';

import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { laravel } from '@/lib/api/client';
import { useToastStore } from '@/stores/toast-store';

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const addToast = useToastStore(s => s.addToast);

  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 15000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadUnreadCount();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const loadUnreadCount = async () => {
    try {
      const count = await laravel.notificationsUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      const result = await laravel.notifications();
      setNotifications(result.data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      addToast('Không thể tải thông báo. Vui lòng thử lại sau.', 'error');
    }
  };

  const handleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      loadNotifications();
    }
  };

  const handleMarkAllAsRead = async () => {
    setIsMarkingRead(true);
    try {
      await laravel.markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      addToast('Đã đánh dấu tất cả thông báo là đã đọc', 'success');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      addToast('Không thể đánh dấu đã đọc. Vui lòng thử lại sau.', 'error');
    } finally {
      setIsMarkingRead(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className="relative h-10 w-10 rounded-xl bg-white/[0.03] border border-white/12 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.05] transition-all cursor-pointer"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-[#FF5A1F] text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 w-80 bg-[#16141a] border border-white/12 rounded-2xl shadow-2xl z-50">
          <div className="p-4 border-b border-white/12 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Thông báo</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={isMarkingRead}
                className="flex items-center gap-1.5 text-[10px] font-bold text-[#FF5A1F] hover:brightness-110 uppercase tracking-wider cursor-pointer disabled:opacity-50"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Đọc tất cả
              </button>
            )}
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-slate-500 text-sm">
                Chưa có thông báo
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.uuid}
                  className={cn(
                    "p-4 border-b border-white/[0.02] hover:bg-white/[0.02]",
                    !notification.read && "bg-[#FF5A1F]/[0.02]"
                  )}
                >
                  <p className="text-sm font-bold text-white">{notification.title}</p>
                  <p className="text-xs text-slate-400 mt-1">{notification.body}</p>
                  <p className="text-[10px] text-slate-500 mt-2">
                    {new Date(notification.created_at).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
