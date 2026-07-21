'use client';

import { useState, useEffect, useRef, useMemo, useCallback, type ComponentType } from 'react';
import { Search, Bell, Menu, User, Settings, CreditCard, Shield, LogOut, Crown, Info, AlertTriangle, AlertCircle, CheckCircle, Wand2, Image, Crosshair, Sparkles, Clapperboard, Music, LayoutDashboard, FolderOpen, Activity, Library, Star, Coins } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { t } from '@/lib/i18n';
import { laravel } from '@/lib/api/client';
import { useToastStore } from '@/stores/toast-store';
import { useNotificationStore, sanitizeNotificationBody } from '@/stores/notification-store';
import { motion, AnimatePresence } from 'motion/react';

interface Notification {
  uuid: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  sent_at: string;
}

const TYPE_ICONS: Record<string, typeof Info> = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle,
  error: AlertCircle,
};

const TYPE_COLORS: Record<string, string> = {
  info: 'text-[#FF8A5B] bg-[#FF8A5B]/10',
  warning: 'text-amber-400 bg-amber-400/10',
  success: 'text-emerald-400 bg-emerald-400/10',
  error: 'text-red-400 bg-red-400/10',
};

interface SearchItem {
  label: string;
  desc: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  category: string;
}

const SEARCH_ITEMS: SearchItem[] = [
  { label: 'Dashboard', desc: 'Tổng quan', href: '/dashboard', icon: LayoutDashboard, category: 'Trang' },
  { label: 'Projects', desc: 'Quản lý dự án', href: '/projects', icon: FolderOpen, category: 'Trang' },
  { label: 'Jobs', desc: 'Tiến trình render', href: '/jobs', icon: Activity, category: 'Trang' },
  { label: 'Assets', desc: 'Thư viện tài nguyên', href: '/assets', icon: Library, category: 'Trang' },
  { label: 'Billing', desc: 'Quản lý thanh toán', href: '/billing', icon: CreditCard, category: 'Trang' },
  { label: 'Credits', desc: 'Credits khả dụng', href: '/billing', icon: Star, category: 'Trang' },
  { label: 'Settings', desc: 'Cài đặt tài khoản', href: '/settings', icon: Settings, category: 'Trang' },
  { label: 'Text-to-Video', desc: 'Tạo video từ văn bản', href: '/studio/video/text-to-video', icon: Wand2, category: 'Studio' },
  { label: 'Image-to-Video', desc: 'Tạo video từ ảnh', href: '/studio/video/image-to-video', icon: Image, category: 'Studio' },
  { label: 'Reference-to-Video', desc: 'Tạo video từ ảnh tham chiếu', href: '/studio/video/reference-to-video', icon: Crosshair, category: 'Studio' },
  { label: 'Character Animation', desc: 'Animation nhân vật từ ảnh', href: '/studio/video/character-animation', icon: Sparkles, category: 'Studio' },
  { label: 'Storyboard', desc: 'Kịch bản phân cảnh', href: '/studio/storyboard', icon: Clapperboard, category: 'Studio' },
  { label: 'Audio & Voiceover', desc: 'Âm thanh và giọng đọc AI', href: '/studio/audio', icon: Music, category: 'Studio' },
];

export function Topbar() {
  const router = useRouter();
  const { toggleMobileMenu } = useUIStore();
  const { user, logout } = useAuthStore();
  const addToast = useToastStore(s => s.addToast);
  const unreadCount = useNotificationStore(s => s.unreadCount);
  const refreshUnread = useNotificationStore(s => s.refreshUnread);
  const resetUnread = useNotificationStore(s => s.resetUnread);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [credits, setCredits] = useState<number>(user?.credits ?? 0);

  const fetchCredits = useCallback(() => {
    laravel.creditsBalance().then(d => setCredits(d.balance)).catch(() => {});
  }, []);

  useEffect(() => {
    fetchCredits();
    const onVisibility = () => { if (!document.hidden) fetchCredits(); };
    document.addEventListener('visibilitychange', onVisibility);
    const interval = setInterval(() => {
      if (!document.hidden) fetchCredits();
    }, 30000);
    const onFocus = () => fetchCredits();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('focus', onFocus); };
  }, [fetchCredits]);

  const refreshNotifs = useCallback(() => {
    refreshUnread();
    laravel.notifications({ per_page: 5 }).then((res) => {
      setNotifications(res.data || []);
    }).catch(() => {});
  }, [refreshUnread]);

  useEffect(() => {
    refreshNotifs();
    const onVisibility = () => { if (!document.hidden) refreshNotifs(); };
    document.addEventListener('visibilitychange', onVisibility);
    const interval = setInterval(() => {
      if (!document.hidden) refreshNotifs();
    }, 30000);
    const onFocus = () => refreshNotifs();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('focus', onFocus); };
  }, [refreshNotifs]);

  const handleMarkAllRead = async () => {
    try {
      await laravel.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      resetUnread();
    } catch {
      addToast('Không thể đánh dấu đã đọc. Vui lòng thử lại sau.', 'error');
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [searchIdx, setSearchIdx] = useState(-1);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return { items: SEARCH_ITEMS, categories: [...new Set(SEARCH_ITEMS.map(i => i.category))] };
    const q = searchQuery.toLowerCase();
    const items = SEARCH_ITEMS.filter(i => i.label.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q));
    const categories = [...new Set(items.map(i => i.category))];
    return { items, categories };
  }, [searchQuery]);

  useEffect(() => {
    if (!searchOpen) { setSearchIdx(-1); return; }
    const handle = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [searchOpen]);

  const handleSearchKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSearchIdx(i => Math.min(i + 1, filtered.items.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSearchIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && searchIdx >= 0) {
      const item = filtered.items[searchIdx];
      if (item) { router.push(item.href); setSearchOpen(false); setSearchQuery(''); }
    }
    if (e.key === 'Escape') { setSearchOpen(false); }
  };

  const navigateSearch = (href: string) => { router.push(href); setSearchOpen(false); setSearchQuery(''); };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 lg:h-20 items-center justify-between border-b border-white/12 px-4 md:px-8 lg:px-12" style={{ backgroundColor: 'var(--surface, #000000)', borderColor: 'var(--card-border, rgba(255,255,255,0.05))' }}>
      <div className="flex items-center gap-4">
        <button onClick={toggleMobileMenu} className="lg:hidden h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer">
          <Menu className="h-5 w-5" />
        </button>
        <div ref={searchRef} className="relative hidden lg:block">
          <div className="flex items-center gap-3 w-80 rounded-xl border px-4 h-9 focus-within:border-[#FF5A1F]/30 focus-within:bg-white/[0.08] focus-within:text-white transition-all" style={{ borderColor: 'var(--card-border)', backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--muted)' }}>
            <Search className="h-4 w-4 shrink-0" />
            <input value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true); }} onFocus={() => setSearchOpen(true)} onKeyDown={handleSearchKey}
              placeholder={t('topbar.searchPlaceholder')}
              className="bg-transparent text-sm outline-none placeholder:text-slate-400 w-full font-medium"
              style={{ color: 'var(--foreground)' }}
            />
          </div>

          <AnimatePresence>
            {searchOpen && (
              <motion.div initial={{ opacity: 0, y: -4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.97 }} transition={{ duration: 0.15 }}
                className="absolute top-full left-0 right-0 mt-2 z-50 bg-[#16141a] border border-white/10 rounded-2xl shadow-md backdrop-blur-2xl overflow-hidden"
              >
                {filtered.items.length === 0 ? (
                  <div className="p-6 text-center">
                    <Search className="h-6 w-6 text-slate-500 mx-auto mb-2" />
                    <p className="text-xs text-slate-400 font-medium">Không tìm thấy kết quả</p>
                  </div>
                ) : (
                  <div className="max-h-[360px] overflow-y-auto custom-scrollbar p-1.5">
                    {filtered.categories.map(cat => (
                      <div key={cat}>
                        <div className="px-3 py-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider">{cat}</div>
                        {filtered.items.filter(i => i.category === cat).map((item, i) => {
                          const idx = filtered.items.indexOf(item);
                          return (
                            <button key={item.href} onClick={() => navigateSearch(item.href)} onMouseEnter={() => setSearchIdx(idx)}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${searchIdx === idx ? 'bg-[#FF5A1F]/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                            >
                              <item.icon className="h-4 w-4 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-semibold">{item.label}</div>
                                <div className="text-[10px] text-slate-400 truncate">{item.desc}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button onClick={() => { setSearchOpen(true); setSearchQuery(''); }} className="lg:hidden p-2.5 transition-all hover:bg-white/5 rounded-xl text-slate-400 hover:text-white cursor-pointer">
          <Search className="h-5 w-5" />
        </button>
        <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
          <DropdownMenuTrigger>
            <div className="group relative flex items-center justify-center h-9 w-9 rounded-xl bg-gradient-to-r from-[#FF5A1F]/8 to-[#FF8A5B]/5 border border-[#FF5A1F]/15 hover:border-[#FF5A1F]/30 hover:from-[#FF5A1F]/12 hover:to-[#FF8A5B]/8 transition-all cursor-pointer">
              <Bell className="h-4 w-4 text-[#FF5A1F] group-hover:text-[#FF8A5B] transition-colors" />
              <AnimatePresence>
                {unreadCount > 0 && (
                  <motion.span
                    key={`badge-${unreadCount}`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-1 -right-1 h-4.5 w-4.5 min-w-[18px] rounded-full bg-[#FF5A1F] text-white text-[9px] font-bold flex items-center justify-center shadow-sm shadow-[#FF5A1F]/30"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="w-[calc(100vw-32px)] md:w-[360px] bg-[#16141a] border-white/10 p-0 rounded-2xl shadow-md backdrop-blur-2xl overflow-hidden">
            <div className="p-4 border-b border-white/12 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white tracking-tight">Thông báo</h3>
              {unreadCount > 0 && (
                <button onClick={handleMarkAllRead} className="text-[10px] font-bold text-[#FF5A1F] uppercase tracking-wider hover:underline">
                  Đánh dấu tất cả
                </button>
              )}
            </div>
            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="py-8 text-center">
                  <Bell className="h-8 w-8 text-slate-500 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 font-medium">Chưa có thông báo</p>
                </div>
              ) : (
                notifications.map((notif, idx) => {
                  const Icon = TYPE_ICONS[notif.type] || Info;
                  const color = TYPE_COLORS[notif.type] || TYPE_COLORS.info;
                  return (
                    <button
                      key={notif.uuid ?? `notif-${idx}`}
                      onClick={() => {
                        router.push(`/notifications/${notif.uuid}`);
                        setNotifOpen(false);
                      }}
                      className={`w-full flex items-start gap-3 p-3.5 hover:bg-white/[0.03] transition-all text-left border-b border-white/12 last:border-0 ${!notif.read ? 'bg-white/[0.01]' : ''}`}
                    >
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium truncate ${!notif.read ? 'text-white' : 'text-slate-400'}`}>
                          {notif.title}
                        </p>
                        <div
                          className="text-[10px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: sanitizeNotificationBody(notif.body) }}
                        />
                        <p className="text-[9px] text-slate-500 mt-1">
                          {notif.sent_at ? new Date(notif.sent_at).toLocaleString('vi-VN') : ''}
                        </p>
                      </div>
                      {!notif.read && (
                        <div className="h-2 w-2 rounded-full bg-[#FF5A1F] shrink-0 mt-1" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
            <Link href="/notifications" className="block p-3 text-center border-t border-white/12 text-[10px] font-bold text-[#FF5A1F] uppercase tracking-widest hover:bg-white/[0.02] transition-all">
              Xem tất cả thông báo
            </Link>
          </DropdownMenuContent>
        </DropdownMenu>

        <Link href="/billing" className="group flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#FF5A1F]/8 to-[#FF8A5B]/5 border border-[#FF5A1F]/15 hover:border-[#FF5A1F]/30 hover:from-[#FF5A1F]/12 hover:to-[#FF8A5B]/8 transition-all">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-[#FF5A1F] to-[#FF8A5B] flex items-center justify-center shadow-sm shadow-[#FF5A1F]/20 group-hover:shadow-[#FF5A1F]/30 group-hover:scale-105 transition-all">
            <Coins className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-bold text-[#FF5A1F] group-hover:text-[#FF8A5B] transition-colors">{credits.toLocaleString()}</span>
        </Link>

        <div className="flex items-center gap-4 pl-8 border-l border-white/10 ml-2">
             <DropdownMenu>
                <DropdownMenuTrigger>
                  <div className="flex items-center gap-3 cursor-pointer group outline-none">
                    <div className="hidden sm:flex flex-col text-right">
                        <span className="text-sm font-semibold text-white tracking-tight group-hover:text-[#FF5A1F] transition-colors">{user?.name || 'User'}</span>
                        <div className="mt-1 inline-flex items-center gap-1 self-end">
                          {(() => {
                            const plan = (user as any)?.plan?.name || 'Free';
                            const planSlug = (user as any)?.plan?.slug || 'free';
                            const gradients: Record<string, string> = {
                              pro: 'from-[#FF5A1F] to-[#FF8A5B]',
                              studio: 'from-[#FF5A1F] to-[#FF8A5B]',
                              free: 'from-[#64748B] to-[#94A3B8]',
                            };
                            const gradient = gradients[planSlug] || gradients.free;
                            return (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gradient-to-r ${gradient} text-white text-[9px] font-bold uppercase tracking-wider shadow-sm`}>
                                <Crown className="h-2.5 w-2.5" />
                                {plan}
                              </span>
                            );
                          })()}
                        </div>
                    </div>
                    <div className="relative h-10 w-10 rounded-xl border border-white/10 group-hover:border-[#FF5A1F]/50 transition-all overflow-hidden bg-[#FF5A1F]/10 flex items-center justify-center">
                      {user?.avatar_url ? (
                        <img src={user.avatar_url} alt={user?.name || 'User'} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-[#FF5A1F] text-sm font-bold">{(user?.name || 'U').charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={10} className="w-[300px] max-w-[calc(100vw-24px)] bg-[#16141a] border-white/10 p-0 rounded-2xl shadow-xl shadow-black/50 backdrop-blur-2xl overflow-hidden">
                  {/* Header — thẻ tài khoản */}
                  <div className="font-normal">
                    <div className="relative overflow-hidden bg-gradient-to-br from-[#FF5A1F]/12 via-[#FF8A5B]/[0.06] to-transparent px-4 pt-4 pb-3.5 border-b border-white/12">
                      {/* ánh sáng nền tinh tế */}
                      <div className="pointer-events-none absolute -top-10 -right-8 h-28 w-28 rounded-full bg-[#FF5A1F]/20 blur-3xl" />
                      <div className="relative flex items-center gap-3">
                        {/* Avatar viền gradient */}
                        <div className="shrink-0 h-10 w-10 rounded-xl p-[1.5px] bg-gradient-to-br from-[#FF5A1F] to-[#FF8A5B] shadow-md shadow-[#FF5A1F]/20">
                          <div className="h-full w-full rounded-[9px] overflow-hidden bg-[#16141a] flex items-center justify-center">
                            {user?.avatar_url ? (
                              <img src={user.avatar_url} alt={user?.name || 'User'} className="h-full w-full object-cover" />
                            ) : (
                              <span className="bg-gradient-to-br from-[#FF5A1F] to-[#FF8A5B] bg-clip-text text-transparent text-sm font-black">
                                {(user?.name || 'U').charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Tên + badge (cùng dòng) + email */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="min-w-0 truncate text-sm font-bold text-white tracking-tight">{user?.name || 'User'}</p>
                            {(() => {
                              const plan = user?.plan?.name || 'Free';
                              const planSlug = user?.plan?.slug || 'free';
                              const gradient = planSlug === 'free' ? 'from-[#64748B] to-[#94A3B8]' : 'from-[#FF5A1F] to-[#FF8A5B]';
                              return (
                                <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gradient-to-r ${gradient} text-white text-[9px] font-bold uppercase tracking-wider shadow-sm`}>
                                  <Crown className="h-2.5 w-2.5" />
                                  {plan}
                                </span>
                              );
                            })()}
                          </div>
                          <p className="text-xs text-slate-400 truncate mt-0.5" title={user?.email || undefined}>
                            {user?.email || '—'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <DropdownMenuGroup className="p-1.5">
                    <Link href="/settings" passHref>
                      <DropdownMenuItem className="group/mi p-2 text-slate-300 focus:bg-white/[0.04] focus:text-white rounded-xl cursor-pointer gap-3 font-medium transition-all">
                        <span className="h-8 w-8 shrink-0 rounded-lg bg-white/[0.04] flex items-center justify-center text-slate-400 group-focus/mi:bg-[#FF5A1F]/15 group-focus/mi:text-[#FF5A1F] transition-all">
                          <User className="h-4 w-4" />
                        </span>
                        <span className="text-[13px]">{t('topbar.profile')}</span>
                      </DropdownMenuItem>
                    </Link>
                    <Link href="/settings" passHref>
                      <DropdownMenuItem className="group/mi p-2 text-slate-300 focus:bg-white/[0.04] focus:text-white rounded-xl cursor-pointer gap-3 font-medium transition-all">
                        <span className="h-8 w-8 shrink-0 rounded-lg bg-white/[0.04] flex items-center justify-center text-slate-400 group-focus/mi:bg-[#FF5A1F]/15 group-focus/mi:text-[#FF5A1F] transition-all">
                          <Settings className="h-4 w-4" />
                        </span>
                        <span className="text-[13px]">{t('topbar.systemSettings')}</span>
                      </DropdownMenuItem>
                    </Link>
                    <Link href="/billing" passHref>
                      <DropdownMenuItem className="group/mi p-2 text-slate-300 focus:bg-white/[0.04] focus:text-white rounded-xl cursor-pointer gap-3 font-medium transition-all">
                        <span className="h-8 w-8 shrink-0 rounded-lg bg-white/[0.04] flex items-center justify-center text-slate-400 group-focus/mi:bg-[#FF5A1F]/15 group-focus/mi:text-[#FF5A1F] transition-all">
                          <CreditCard className="h-4 w-4" />
                        </span>
                        <span className="text-[13px]">{t('topbar.billing')}</span>
                      </DropdownMenuItem>
                    </Link>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator className="bg-white/5 mx-2 my-0" />
                  <div className="p-1.5">
                    <DropdownMenuItem onClick={handleLogout} className="group/mi p-2 text-red-400/90 focus:bg-red-500/10 focus:text-red-400 rounded-xl cursor-pointer gap-3 font-semibold transition-all">
                      <span className="h-8 w-8 shrink-0 rounded-lg bg-red-500/5 flex items-center justify-center text-red-400/80 group-focus/mi:bg-red-500/15 group-focus/mi:text-red-400 transition-all">
                        <LogOut className="h-4 w-4" />
                      </span>
                      <span className="text-[13px]">{t('topbar.logout')}</span>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
           </div>
        </div>

      {/* Mobile search overlay */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] lg:hidden bg-[#16141a]/80 backdrop-blur-md"
            onClick={() => setSearchOpen(false)}
          >
            <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} transition={{ duration: 0.15 }}
              className="bg-[#16141a] border-b border-white/12 p-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 h-10 focus-within:border-[#FF5A1F]/30 transition-all">
                <Search className="h-4 w-4 text-slate-500 shrink-0" />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={handleSearchKey}
                  placeholder={t('topbar.searchPlaceholder')} autoFocus
                  className="bg-transparent text-sm outline-none placeholder:text-slate-400 w-full font-medium text-white"
                />
                <button onClick={() => setSearchOpen(false)} className="h-6 w-6 rounded-lg flex items-center justify-center text-slate-500 hover:text-white transition-all cursor-pointer">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="mt-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {filtered.items.length === 0 ? (
                  <div className="py-6 text-center">
                    <Search className="h-6 w-6 text-slate-500 mx-auto mb-2" />
                    <p className="text-xs text-slate-400 font-medium">Không tìm thấy kết quả</p>
                  </div>
                ) : (
                  filtered.categories.map(cat => (
                    <div key={cat}>
                      <div className="px-1 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">{cat}</div>
                      {filtered.items.filter(i => i.category === cat).map((item, i) => {
                        const idx = filtered.items.indexOf(item);
                        return (
                          <button key={item.href} onClick={() => navigateSearch(item.href)} onMouseEnter={() => setSearchIdx(idx)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${searchIdx === idx ? 'bg-[#FF5A1F]/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                          >
                            <item.icon className="h-4 w-4 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-semibold">{item.label}</div>
                              <div className="text-[10px] text-slate-400 truncate">{item.desc}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </header>
  );
}
