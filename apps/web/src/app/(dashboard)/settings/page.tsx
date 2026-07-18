'use client';

import { useState, useEffect } from 'react';
import {
  User,
  Shield,
  Lock,
  History,
  Mail,
  Monitor,
  CheckCircle2,
  ArrowRight,
  Bell,
  Camera,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { laravel } from '@/lib/api/client';
import { showApiError, showApiResponse } from '@/lib/api/handle-response';
import { useAuthStore } from '@/stores/auth-store';
import { useToastStore } from '@/stores/toast-store';
import { PasswordInput } from '@/components/ui/password-input';
import { t } from '@/lib/i18n';

const ACCENT = '#FF5A1F';

// Shared field styling — orange focus ring, calm surface, generous touch target.
const FIELD_CLASS =
  'w-full h-11 rounded-xl bg-black/30 border border-white/[0.08] px-4 text-sm text-white outline-none transition-all placeholder:text-slate-600 focus:border-[#FF5A1F]/60 focus:ring-4 focus:ring-[#FF5A1F]/10 focus:bg-black/50';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { id: 'profile', label: t('settings.profile'), icon: User, hint: 'Thông tin cá nhân' },
    { id: 'security', label: t('settings.security'), icon: Shield, hint: 'Mật khẩu & phiên đăng nhập' },
    { id: 'notifications', label: t('settings.notifications'), icon: Bell, hint: 'Email & cảnh báo' },
  ];

  return (
    <div className="flex flex-col gap-7 pb-24">
      {/* Page header */}
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#FF5A1F]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#FF5A1F]" />
          Tài khoản
        </div>
        <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-white">
          {t('settings.title')}
        </h1>
        <p className="text-slate-400 font-medium text-sm md:text-base max-w-2xl">{t('settings.desc')}</p>
      </header>

      <div className="grid grid-cols-12 gap-5 lg:gap-7">
        {/* Nav rail — sticky sidebar on desktop, horizontal scroll on mobile */}
        <nav
          role="tablist"
          aria-label="Cài đặt"
          className="col-span-12 lg:col-span-3 lg:sticky lg:top-6 lg:self-start"
        >
          <div className="flex lg:flex-col gap-2">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group relative flex-1 lg:flex-none lg:w-full flex flex-col lg:flex-row items-center lg:items-center gap-1.5 lg:gap-3.5 px-2.5 lg:px-4 py-3 lg:py-3.5 rounded-2xl text-center lg:text-left transition-all duration-300 cursor-pointer border ${
                    active
                      ? 'bg-[#FF5A1F]/[0.1] border-[#FF5A1F]/25 text-white'
                      : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.04] hover:border-white/10'
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-7 w-1 rounded-full bg-[#FF5A1F] hidden lg:block" />
                  )}
                  <span
                    className={`flex h-8 w-8 lg:h-9 lg:w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                      active
                        ? 'bg-[#FF5A1F] text-white'
                        : 'bg-white/[0.04] text-slate-400 group-hover:text-white'
                    }`}
                  >
                    <tab.icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] lg:text-sm font-bold tracking-tight whitespace-nowrap">{tab.label}</span>
                    <span className="hidden lg:block text-[11px] font-medium text-slate-500 whitespace-nowrap">
                      {tab.hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Content */}
        <div role="tabpanel" className="col-span-12 lg:col-span-9 min-w-0">
          <AnimatePresence mode="wait">
            {activeTab === 'profile' && <ProfileTab key="profile" />}
            {activeTab === 'security' && <SecurityTab key="security" />}
            {activeTab === 'notifications' && <NotificationsTab key="notifications" />}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shared presentational helpers                                       */
/* ------------------------------------------------------------------ */

function SettingsCard({
  icon: Icon,
  title,
  description,
  action,
  children,
  className = '',
}: {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.03] to-white/[0.01] overflow-hidden ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 md:p-6 border-b border-white/[0.05]">
        <div className="flex items-center gap-3.5 flex-1 min-w-0">
          {Icon && (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FF5A1F]/10 text-[#FF5A1F]">
              <Icon className="h-5 w-5" />
            </span>
          )}
          <div className="min-w-0 space-y-0.5">
            <h3 className="text-base font-display font-bold text-white tracking-tight">{title}</h3>
            {description && <p className="text-xs md:text-[13px] text-slate-500 font-medium leading-relaxed">{description}</p>}
          </div>
        </div>
        {action && <div className="shrink-0 w-full sm:w-auto">{action}</div>}
      </div>
      <div className="p-5 md:p-6">{children}</div>
    </section>
  );
}

function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-[13px] font-semibold text-slate-300 mb-1.5">
      {children}
    </label>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative inline-flex h-7 w-[52px] shrink-0 items-center rounded-full transition-colors duration-200 cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-[#FF5A1F]/25 ${
        checked ? 'bg-[#FF5A1F]' : 'bg-white/10'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? 'translate-x-[26px]' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Profile                                                             */
/* ------------------------------------------------------------------ */

function ProfileTab() {
  const { user, setUser } = useAuthStore();
  const addToast = useToastStore(s => s.addToast);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const isVerified = !!user?.email_verified_at;

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone_number || '');
      setDob(user.date_of_birth || '');
      setGender(user.gender || '');
      setAddress(user.address || '');
    }
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const res = await laravel.uploadAvatar(file);
      if (res.success && res.data?.avatar_url) {
        if (user) {
          setUser({ ...user, avatar_url: res.data.avatar_url } as any);
        }
        addToast(t('settings.updateSuccess'), 'success');
      }
    } catch (err) {
      showApiError(err, t('settings.updateFailed'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    const userId = user?.uuid;
    if (!userId) return;
    setSaving(true);
    try {
      await laravel.updateProfile(userId, {
        name, phone_number: phone || undefined,
        date_of_birth: dob || undefined, gender: gender || undefined,
        address: address || undefined,
      });
      if (user) {
        setUser({ ...user, name, phone_number: phone || null, date_of_birth: dob || null, gender: gender || null, address: address || null });
      }
      addToast(t('settings.updateSuccess'), 'success');
    } catch (err) {
      showApiError(err, t('settings.updateFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="space-y-5"
    >
      {/* Identity banner — signature element: an ID card for the creator */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#FF5A1F]/[0.08] via-white/[0.02] to-transparent p-6 md:p-7">
        <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-[#FF5A1F]/20 blur-[80px]" />
        <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          <label className="relative group cursor-pointer shrink-0">
            <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            <span className="block rounded-full p-[3px] bg-gradient-to-br from-[#FF5A1F] to-[#FF8A5B]">
              <Avatar className="h-24 w-24 md:h-28 md:w-28 border-4 border-black">
                {user?.avatar_url ? (
                  <AvatarImage src={user.avatar_url as string} className="object-cover" />
                ) : null}
                <AvatarFallback className="bg-zinc-900 text-[#FF5A1F] text-4xl font-bold">
                  {(user?.name || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </span>
            <span className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#FF5A1F] text-white ring-4 ring-black transition-transform group-hover:scale-110">
              {uploadingAvatar ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
            </span>
          </label>

          <div className="flex-1 min-w-0 space-y-2 pt-1">
            <h2 className="text-2xl font-display font-bold text-white tracking-tight truncate">
              {name || user?.name || 'Người dùng'}
            </h2>
            <p className="text-sm text-slate-400 font-medium truncate">{email || user?.email}</p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
              {isVerified ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3 py-1 text-[11px] font-bold text-emerald-400 ring-1 ring-emerald-400/20">
                  <ShieldCheck className="h-3.5 w-3.5" /> Email đã xác thực
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 px-3 py-1 text-[11px] font-bold text-amber-400 ring-1 ring-amber-400/20">
                  <AlertTriangle className="h-3.5 w-3.5" /> Chưa xác thực
                </span>
              )}
              <span className="text-[11px] text-slate-600 font-medium">JPEG, PNG, GIF, WebP · Tối đa 5MB</span>
            </div>
          </div>
        </div>
      </div>

      {/* Personal info */}
      <SettingsCard
        icon={User}
        title={t('settings.profile')}
        description="Cập nhật thông tin cá nhân hiển thị trên tài khoản của bạn."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
          <div>
            <FieldLabel htmlFor="pf-name">{t('settings.fullName')}</FieldLabel>
            <input id="pf-name" value={name} onChange={e => setName(e.target.value)}
              placeholder={t('settings.fullNamePlaceholder')} className={FIELD_CLASS} />
          </div>
          <div>
            <FieldLabel htmlFor="pf-email">Email</FieldLabel>
            <input id="pf-email" value={email} placeholder="user@horizon.studio" readOnly
              className={`${FIELD_CLASS} opacity-50 cursor-not-allowed focus:ring-0 focus:border-white/[0.08]`} />
          </div>
          <div>
            <FieldLabel htmlFor="pf-phone">Số điện thoại</FieldLabel>
            <input id="pf-phone" value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="0901234567" className={FIELD_CLASS} />
          </div>
          <div>
            <FieldLabel htmlFor="pf-dob">Ngày sinh</FieldLabel>
            <input id="pf-dob" type="date" value={dob} onChange={e => setDob(e.target.value)}
              className={`${FIELD_CLASS} [color-scheme:dark]`} />
          </div>
          <div>
            <FieldLabel htmlFor="pf-gender">Giới tính</FieldLabel>
            <div className="relative">
              <select id="pf-gender" value={gender} onChange={e => setGender(e.target.value)}
                className={`${FIELD_CLASS} appearance-none cursor-pointer pr-10`}>
                <option value="" className="bg-zinc-950 text-slate-500">Chọn giới tính</option>
                <option value="male" className="bg-zinc-950">Nam</option>
                <option value="female" className="bg-zinc-950">Nữ</option>
                <option value="other" className="bg-zinc-950">Khác</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            </div>
          </div>
          <div className="sm:col-span-2">
            <FieldLabel htmlFor="pf-address">Địa chỉ</FieldLabel>
            <textarea id="pf-address" value={address} onChange={e => setAddress(e.target.value)}
              placeholder="Nhập địa chỉ của bạn" rows={3}
              className="w-full rounded-xl bg-black/30 border border-white/[0.08] p-4 text-sm text-white outline-none transition-all placeholder:text-slate-600 focus:border-[#FF5A1F]/60 focus:ring-4 focus:ring-[#FF5A1F]/10 focus:bg-black/50 resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end pt-6 mt-6 border-t border-white/[0.05]">
          <Button onClick={handleSave} disabled={saving}
            className="h-11 px-8 rounded-xl bg-[#FF5A1F] text-white hover:bg-[#FF5A1F]/90 font-bold text-sm shadow-lg shadow-[#FF5A1F]/20 transition-all disabled:opacity-60">
            {saving ? (
              <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Đang lưu...</span>
            ) : t('settings.saveChanges')}
          </Button>
        </div>
      </SettingsCard>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Security                                                            */
/* ------------------------------------------------------------------ */

function SecurityTab() {
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [changingPage, setChangingPage] = useState(false);
  const [sessionPage, setSessionPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadSessions = async (page = 1, initial = false) => {
    if (initial) setLoadingSessions(true); else setChangingPage(true);
    try {
      const res = await laravel.loginHistory({ page });
      // Numbered pagination → show exactly the requested page (replace).
      setSessions(res.data || []);
      setTotalPages(res.meta?.last_page || 1);
      setSessionPage(res.meta?.current_page || page);
    } catch (err) {
      console.error('Failed to load sessions', err);
    } finally {
      setLoadingSessions(false);
      setChangingPage(false);
    }
  };

  // Page numbers with ellipsis: [1, '…', 4, 5, 6, '…', 20] when there are many.
  const getPageList = (current: number, total: number): (number | '…')[] => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | '…')[] = [1];
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    if (start > 2) pages.push('…');
    for (let p = start; p <= end; p++) pages.push(p);
    if (end < total - 1) pages.push('…');
    pages.push(total);
    return pages;
  };

  useEffect(() => { loadSessions(1, true); }, []);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return t('time.justNowAlt');
    if (hours < 24) return t('time.hoursAgo', { hours });
    return date.toLocaleDateString('vi-VN');
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || newPassword.length < 4) return;
    if (newPassword !== newPasswordConfirmation) {
      showApiError(new Error(t('auth.passwordMismatch')), '');
      return;
    }
    setSaving(true);
    try {
      await laravel.changePassword(currentPassword, newPassword);
      showApiResponse({ success: true, message: t('settings.updateSuccess') });
      setShowPasswordForm(false);
      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordConfirmation('');
    } catch (err) {
      showApiError(err, t('settings.updateFailed'));
    } finally {
      setSaving(false);
    }
  };

  const pwInputClass =
    '[&_input]:h-11 [&_input]:bg-black/30 [&_input]:border-white/[0.08] [&_input]:rounded-xl [&_input]:px-4';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="space-y-5 font-sans"
    >
      {/* Change password */}
      <SettingsCard
        icon={Lock}
        title={t('settings.changePassword')}
        description={t('settings.securityDesc')}
        action={
          <Button
            variant="outline"
            onClick={() => setShowPasswordForm(!showPasswordForm)}
            className="h-10 px-5 w-full sm:w-auto rounded-xl border-white/10 text-xs font-bold text-slate-200 hover:text-white hover:bg-white/10 transition-all"
          >
            {showPasswordForm ? t('common.cancel') : t('settings.changePassword')}
          </Button>
        }
      >
        <AnimatePresence initial={false}>
          {showPasswordForm ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-4 max-w-md">
                <div>
                  <FieldLabel>Mật khẩu hiện tại</FieldLabel>
                  <PasswordInput value={currentPassword} onChange={setCurrentPassword} placeholder={t('auth.passwordPlaceholder')} className={pwInputClass} />
                </div>
                <div>
                  <FieldLabel>{t('auth.resetNewPassword')}</FieldLabel>
                  <PasswordInput value={newPassword} onChange={setNewPassword} placeholder={t('auth.resetNewPassword')} showGenerate className={pwInputClass} />
                </div>
                <div>
                  <FieldLabel>{t('auth.resetConfirmPassword')}</FieldLabel>
                  <PasswordInput value={newPasswordConfirmation} onChange={setNewPasswordConfirmation} placeholder={t('auth.resetConfirmPassword')} className={pwInputClass} />
                </div>
                <div className="flex justify-end gap-3 pt-1">
                  <Button variant="outline" onClick={() => setShowPasswordForm(false)}
                    className="h-10 px-6 rounded-xl border-white/10 text-xs font-bold">
                    {t('common.cancel')}
                  </Button>
                  <Button onClick={handleChangePassword} disabled={!currentPassword || !newPassword || newPassword.length < 4 || saving}
                    className="h-10 px-6 rounded-xl bg-[#FF5A1F] text-white hover:bg-[#FF5A1F]/90 font-bold text-xs shadow-lg shadow-[#FF5A1F]/20">
                    {saving ? t('common.loading') : t('common.save')}
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : (
            <p className="text-sm text-slate-500 font-medium">
              Mật khẩu mạnh giúp bảo vệ tài khoản và các dự án của bạn. Nên gồm chữ hoa, chữ thường, số và ký tự đặc biệt.
            </p>
          )}
        </AnimatePresence>
      </SettingsCard>

      {/* Email verification */}
      <EmailVerifyCard />

      {/* Login history */}
      <SettingsCard icon={History} title={t('settings.loginHistory')} description="Các thiết bị và phiên gần đây đã truy cập tài khoản của bạn.">
        {loadingSessions ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 text-[#FF5A1F] animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-slate-500 text-center py-10 text-sm font-medium">Không có lịch sử đăng nhập</p>
        ) : (
          <div className="space-y-2.5">
            {sessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between gap-3 p-3.5 md:p-4 bg-black/20 border border-white/[0.06] rounded-xl hover:border-white/[0.12] transition-all">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className={`h-11 w-11 shrink-0 rounded-xl flex items-center justify-center ${session.is_current ? 'bg-emerald-400/10 text-emerald-400' : 'bg-white/[0.04] text-slate-400'}`}>
                    <Monitor className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white tracking-tight truncate">{session.device || 'Unknown'}</p>
                    <p className="text-xs text-slate-500 font-medium truncate">{session.location || 'Unknown'} · {formatTime(session.login_at)}</p>
                  </div>
                </div>
                {session.is_current && (
                  <span className="shrink-0 text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-400/10 px-3 py-1.5 rounded-full ring-1 ring-emerald-400/20">
                    {t('settings.current')}
                  </span>
                )}
              </div>
            ))}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1.5 pt-4">
                <button
                  onClick={() => loadSessions(sessionPage - 1)}
                  disabled={sessionPage <= 1 || changingPage}
                  className="h-9 w-9 flex items-center justify-center rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  aria-label="Trang trước"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {getPageList(sessionPage, totalPages).map((p, i) =>
                  p === '…' ? (
                    <span key={`gap-${i}`} className="px-1 text-slate-600 text-xs select-none">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => loadSessions(p)}
                      disabled={changingPage}
                      className={`h-9 min-w-[2.25rem] px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        p === sessionPage
                          ? 'bg-[#FF5A1F] text-white shadow-lg shadow-[#FF5A1F]/20'
                          : 'border border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
                <button
                  onClick={() => loadSessions(sessionPage + 1)}
                  disabled={sessionPage >= totalPages || changingPage}
                  className="h-9 w-9 flex items-center justify-center rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  aria-label="Trang sau"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </SettingsCard>
    </motion.div>
  );
}

function EmailVerifyCard() {
  const user = useAuthStore(s => s.user);
  const isVerified = !!user?.email_verified_at;

  if (isVerified) {
    return (
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.04] p-5 md:p-6">
        <div className="flex items-center gap-3.5 min-w-0">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <div className="min-w-0 space-y-0.5">
            <h3 className="text-base font-display font-bold text-white tracking-tight">Xác thực email</h3>
            <p className="text-[13px] text-emerald-400/90 font-medium">Email của bạn đã được xác thực.</p>
          </div>
        </div>
        <span className="hidden sm:flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 shrink-0">
          <CheckCircle2 className="h-4 w-4" /> Đã xác thực
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-amber-500/25 bg-amber-500/[0.05] p-5 md:p-6">
      <div className="flex items-center gap-3.5 min-w-0">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
          <Mail className="h-5 w-5" />
        </span>
        <div className="min-w-0 space-y-0.5">
          <h3 className="text-base font-display font-bold text-white tracking-tight">Xác thực email</h3>
          <p className="text-[13px] text-amber-400/90 font-medium">Email chưa được xác thực. Xác thực để mở khóa đầy đủ tính năng.</p>
        </div>
      </div>
      <Link href="/verify-email" className="shrink-0 w-full sm:w-auto">
        <Button className="h-10 px-6 w-full sm:w-auto rounded-xl bg-amber-500 text-black hover:bg-amber-400 text-xs font-bold flex items-center justify-center gap-2 transition-all">
          Xác thực ngay <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </Link>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

function NotificationsTab() {
  const addToast = useToastStore(s => s.addToast);
  const [prefs, setPrefs] = useState<Array<{ type: string; channel: string; enabled: boolean }>>([]);
  const [loading, setLoading] = useState(true);

  const notificationTypes = [
    { type: 'job_completed', label: 'Email khi hoàn thành', desc: 'Nhận email khi job render hoàn tất.' },
    { type: 'job_failed', label: 'Email khi thất bại', desc: 'Nhận email khi job render gặp lỗi.' },
    { type: 'credits_added', label: 'Email khi nạp credits', desc: 'Nhận email khi credits được nạp vào tài khoản.' },
    { type: 'credits_refunded', label: 'Email khi hoàn credits', desc: 'Nhận email khi credits được hoàn lại.' },
  ];

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    setLoading(true);
    try {
      const res = await laravel.notificationPreferences();
      if (res.success) {
        const existing = res.data || [];
        const all = notificationTypes.map(({ type }) => {
          const found = existing.find((p: any) => p.type === type && p.channel === 'email');
          return { type, channel: 'email', enabled: found ? found.enabled : true };
        });
        setPrefs(all);
      }
    } catch (err) {
      showApiError(err, 'Không thể tải cài đặt thông báo');
    } finally {
      setLoading(false);
    }
  };

  const togglePreference = async (type: string, enabled: boolean) => {
    setPrefs(prev => prev.map(p => p.type === type ? { ...p, enabled } : p));

    try {
      const res = await laravel.updateNotificationPreferences(
        prefs.map(p => p.type === type ? { ...p, enabled } : p)
      );
      if (res.success) {
        addToast('Đã cập nhật', 'success');
      }
    } catch (err) {
      setPrefs(prev => prev.map(p => p.type === type ? { ...p, enabled: !enabled } : p));
      showApiError(err, 'Lỗi khi lưu');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="font-sans"
    >
      <SettingsCard
        icon={Bell}
        title={t('settings.notifications')}
        description="Chọn các thông báo qua email bạn muốn nhận từ hệ thống."
      >
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 text-[#FF5A1F] animate-spin" />
          </div>
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {notificationTypes.map(({ type, label, desc }) => {
              const pref = prefs.find(p => p.type === type) || { enabled: true };
              return (
                <div key={type} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                  <div className="min-w-0 space-y-0.5">
                    <h4 className="text-sm font-bold text-white tracking-tight">{label}</h4>
                    <p className="text-xs text-slate-500 font-medium max-w-md">{desc}</p>
                  </div>
                  <ToggleSwitch checked={!!pref.enabled} label={label} onChange={() => togglePreference(type, !pref.enabled)} />
                </div>
              );
            })}
          </div>
        )}
      </SettingsCard>
    </motion.div>
  );
}
