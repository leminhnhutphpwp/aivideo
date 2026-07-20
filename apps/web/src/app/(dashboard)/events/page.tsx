'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Gift, Loader2, Copy, Check, Clock, Users, Sparkles, ArrowRight } from 'lucide-react';
import { laravel, type EventItem } from '@/lib/api/client';
import { useToastStore } from '@/stores/toast-store';
import { TurnstileWidget, TURNSTILE_ENABLED, type TurnstileHandle } from '@/components/security/TurnstileWidget';

/** Định dạng số tiền VND, ví dụ 50000 → "50.000₫". */
function formatVnd(value: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
}

/** Định dạng mốc thời gian kết thúc, ví dụ "20:00 31/12/2026". */
function formatDeadline(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

/** Tóm tắt phần thưởng theo loại. */
function rewardSummary(type: EventItem['reward_type'], value: number): string {
  switch (type) {
    case 'credits':
      return `Tặng ${value.toLocaleString('vi-VN')} credits`;
    case 'percent':
      return `Giảm ${value}% gói nạp`;
    case 'fixed':
      return `Giảm ${formatVnd(value)} gói nạp`;
    default:
      return '';
  }
}

export default function EventsPage() {
  const addToast = useToastStore((s) => s.addToast);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await laravel.listEvents();
        if (active) setEvents(res.events ?? []);
      } catch (err: any) {
        addToast(err?.message || 'Không tải được danh sách ưu đãi', 'error');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [addToast]);

  const handleClaimed = (slug: string, code: string) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.slug === slug ? { ...e, already_claimed: true, claimed_code: code } : e
      )
    );
  };

  return (
    <div className="flex flex-col gap-6 pb-20 font-sans">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl bg-[#FF5A1F]/10 flex items-center justify-center shrink-0">
          <Gift className="h-6 w-6 text-[#FF5A1F]" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">Ưu đãi & Sự kiện</h1>
          <p className="text-sm text-slate-400">Nhận mã quà tặng và các ưu đãi độc quyền dành riêng cho bạn.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl bg-[#16141a] border border-white/12 py-16 px-6 flex flex-col items-center text-center">
          <div className="h-14 w-14 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
            <Sparkles className="h-7 w-7 text-slate-500" />
          </div>
          <p className="text-base font-bold text-white">Hiện chưa có ưu đãi nào</p>
          <p className="text-sm text-slate-500 mt-1 max-w-sm">
            Các chương trình ưu đãi và sự kiện sẽ xuất hiện tại đây. Hãy quay lại sau nhé!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {events.map((event) => (
            <EventCard key={event.slug} event={event} onClaimed={handleClaimed} />
          ))}
        </div>
      )}
    </div>
  );
}

function EventCard({ event, onClaimed }: { event: EventItem; onClaimed: (slug: string, code: string) => void }) {
  const addToast = useToastStore((s) => s.addToast);
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileHandle>(null);

  const handleClaim = async () => {
    if (TURNSTILE_ENABLED && !turnstileToken) {
      addToast('Vui lòng xác nhận bạn không phải robot', 'warning');
      return;
    }
    setLoading(true);
    try {
      const res = await laravel.claimEvent(event.slug, turnstileToken);
      addToast(res.message || 'Nhận mã thành công!', 'success');
      onClaimed(event.slug, res.code);
    } catch (err: any) {
      addToast(err?.message || 'Không thể nhận mã ưu đãi này', 'error');
      turnstileRef.current?.reset();
    } finally {
      setLoading(false);
    }
  };

  const soldOut = !event.already_claimed && event.remaining !== null && event.remaining <= 0;
  const claimable = !event.already_claimed && !soldOut;

  return (
    <div className="rounded-2xl bg-[#16141a] border border-white/12 p-5 flex flex-col gap-4">
      {/* Head */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-[#FF5A1F]/10 flex items-center justify-center shrink-0">
            <Gift className="h-5 w-5 text-[#FF5A1F]" />
          </div>
          <p className="text-sm font-bold text-white tracking-tight truncate">{event.name}</p>
        </div>
        {event.already_claimed && (
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Đã nhận
          </span>
        )}
      </div>

      {/* Description */}
      {event.description && (
        <p className="text-[13px] text-slate-400 leading-relaxed line-clamp-3">{event.description}</p>
      )}

      {/* Reward */}
      <div className="rounded-xl bg-[#FF5A1F]/[0.06] border border-[#FF5A1F]/15 px-3.5 py-3">
        <p className="text-sm font-bold text-[#FF5A1F]">{rewardSummary(event.reward_type, event.reward_value)}</p>
      </div>

      {/* Meta */}
      <div className="flex flex-col gap-1.5 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span>Kết thúc: {event.ends_at ? formatDeadline(event.ends_at) : 'Không giới hạn'}</span>
        </div>
        {event.remaining !== null && (
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 shrink-0" />
            <span>Còn {event.remaining.toLocaleString('vi-VN')} lượt</span>
          </div>
        )}
      </div>

      {/* Action */}
      <div className="mt-auto pt-1">
        {event.already_claimed && event.claimed_code ? (
          <ClaimedCodeBox code={event.claimed_code} />
        ) : (
          <>
          {TURNSTILE_ENABLED && claimable && (
            <div className="mb-3 flex justify-center">
              <TurnstileWidget ref={turnstileRef} onToken={setTurnstileToken} />
            </div>
          )}
          <button
            onClick={handleClaim}
            disabled={loading || soldOut || (TURNSTILE_ENABLED && claimable && !turnstileToken)}
            className="h-11 w-full rounded-xl bg-[#FF5A1F] hover:bg-[#FF6A2B] text-white font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Đang nhận...</>
            ) : soldOut ? (
              'Đã hết lượt'
            ) : (
              <><Gift className="h-4 w-4" /> Nhận mã</>
            )}
          </button>
          </>
        )}
      </div>
    </div>
  );
}

function ClaimedCodeBox({ code }: { code: string }) {
  const addToast = useToastStore((s) => s.addToast);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      addToast('Đã copy mã', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      addToast('Không thể copy mã', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5">
        <span className="flex-1 text-sm font-bold text-white tracking-wider uppercase truncate">{code}</span>
        <button
          onClick={handleCopy}
          className="shrink-0 h-7 w-7 rounded-lg bg-[#FF5A1F]/10 hover:bg-[#FF5A1F]/20 text-[#FF5A1F] flex items-center justify-center transition-all"
          aria-label="Copy mã"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      <Link
        href="/billing"
        className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[#FF5A1F] hover:text-[#FF6A2B] transition-all"
      >
        Đến trang Đổi mã <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
