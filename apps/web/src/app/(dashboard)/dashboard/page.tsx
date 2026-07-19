'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Play, Film, Zap, ArrowUpRight, ChevronRight,
  Wand2, Library, Clock, Crown, Sparkles, FolderOpen, FolderPlus,
  History, Type, Image, Music, X,
  Clapperboard, Crosshair, Activity, Cpu,
  TrendingUp, Rocket, MonitorPlay, Ratio, Square, Smartphone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { daemon, laravel } from '@/lib/api/client';
import { useDaemonStore, initDaemonCheck } from '@/stores/daemon-store';
import { useToastStore } from '@/stores/toast-store';
import { useAuthStore } from '@/stores/auth-store';
import { t } from '@/lib/i18n';
import { BarChart } from '@/components/ui/bar-chart';
import { UnifiedProjectCard } from '@/components/projects/unified-project-card';
import { SectionHeading } from '@/components/ui/section-heading';
import { fetchUnifiedProjects } from '@/lib/api/unified-projects';
import type { UnifiedProject } from '@/lib/api/unified-project-types';
import { useRealtimeJobs, type JobEvent } from '@/hooks/use-realtime-jobs';

function AnimatedCounter({ target, duration = 1500 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const startTime = useRef<number | null>(null);
  useEffect(() => {
    startTime.current = null;
    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const progress = Math.min((timestamp - startTime.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target, duration]);
  return <span>{count.toLocaleString()}</span>;
}

const EVENT_LABELS: Record<string, string> = { created: 'Tạo mới', updated: 'Cập nhật', deleted: 'Xoá', login: 'Đăng nhập', logout: 'Đăng xuất', job_created: 'Tạo tác vụ' };
const EVENT_COLORS: Record<string, string> = { created: 'text-emerald-400 bg-emerald-400/10', login: 'text-[#FF8A5B] bg-[#FF8A5B]/10', logout: 'text-slate-400 bg-slate-400/10', updated: 'text-amber-400 bg-amber-400/10', deleted: 'text-red-400 bg-red-400/10', job_created: 'text-[#FF5A1F] bg-[#FF5A1F]/10' };
const SUBJECT_LABELS: Record<string, string> = { 'App\\Models\\User': 'Người dùng', 'App\\Models\\Asset': 'Tài sản', 'App\\Models\\RenderJob': 'Tác vụ render', 'App\\Models\\Plan': 'Gói dịch vụ', 'App\\Models\\Credit': 'Credit' };

function getSubjectLabel(type?: string): string { if (!type) return 'Hệ thống'; return SUBJECT_LABELS[type] || type.split('\\').pop() || 'Hệ thống'; }
function getEventLabel(event?: string): string { return EVENT_LABELS[event || ''] || event || '—'; }
function getEventColor(event?: string): string { return EVENT_COLORS[event || ''] || 'text-slate-400 bg-slate-400/10'; }
function buildActivityDescription(activity: any): string {
  const subject = getSubjectLabel(activity?.subject_type);
  const event = activity?.event;
  if (activity?.description === 'job_created') return `Tạo tác vụ render${activity?.properties?.duration ? ` (${activity.properties.duration}s)` : ''}`;
  if (activity?.description && !['created', 'updated', 'deleted'].includes(activity.description)) {
    const m: Record<string, string> = { login: 'Đăng nhập hệ thống', logout: 'Đăng xuất hệ thống' };
    if (m[activity.description]) return m[activity.description];
  }
  if (event === 'created') return `Tạo ${subject.toLowerCase()} mới`;
  if (event === 'updated') return `Cập nhật ${subject.toLowerCase()}`;
  if (event === 'deleted') return `Xoá ${subject.toLowerCase()}`;
  return activity?.description || 'Hoạt động';
}

const STUDIO_FEATURES = [
  { id: 'text-to-video', label: 'Text-to-Video', desc: 'Biến ý tưởng thành video từ mô tả văn bản', icon: Type, href: '/studio/text-to-video', bg: 'bg-white/[0.06]', text: 'text-white', tag: 'Phổ biến' },
  { id: 'image-to-video', label: 'Image-to-Video', desc: 'Chuyển ảnh tĩnh thành video sống động', icon: Image, href: '/studio/image-to-video', bg: 'bg-white/[0.06]', text: 'text-slate-300' },
  { id: 'reference-to-video', label: 'Reference-to-Video', desc: 'Tạo video dựa trên ảnh tham chiếu', icon: Crosshair, href: '/studio/reference-to-video', bg: 'bg-white/[0.06]', text: 'text-slate-300' },
  { id: 'character-animation', label: 'Character Animation', desc: 'Tạo animation nhân vật từ ảnh tĩnh', icon: Sparkles, href: '/studio/video/character-animation', bg: 'bg-white/[0.06]', text: 'text-slate-300' },
  { id: 'storyboard', label: 'Storyboard', desc: 'Lên kịch bản phân cảnh chuyên nghiệp', icon: Clapperboard, href: '/studio/storyboard', bg: 'bg-white/[0.06]', text: 'text-slate-300' },
  { id: 'audio', label: 'Audio & Voiceover', desc: 'Tạo âm thanh, nhạc nền và giọng đọc AI', icon: Music, href: '/studio/audio', bg: 'bg-white/[0.06]', text: 'text-slate-300' },
];

const TYPING_LINES = ['Một rừng hoa anh đào dưới ánh hoàng hôn...', 'Nhân vật anime chiến đấu dưới cơn mưa', 'Cảnh hoảng hôn trên thành phố neon', 'Flythrough camera giữa những tòa nhà tương lai'];

function TypingEffect() {
  const [lineIndex, setLineIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  useEffect(() => {
    const line = TYPING_LINES[lineIndex];
    let timeout: ReturnType<typeof setTimeout>;
    if (!isDeleting) {
      if (displayText.length < line.length) { timeout = setTimeout(() => setDisplayText(line.slice(0, displayText.length + 1)), 40 + Math.random() * 40); }
      else { timeout = setTimeout(() => setIsDeleting(true), 2000); }
    } else {
      if (displayText.length > 0) { timeout = setTimeout(() => setDisplayText(line.slice(0, displayText.length - 1)), 20); }
      else { setIsDeleting(false); setLineIndex(prev => (prev + 1) % TYPING_LINES.length); }
    }
    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, lineIndex]);
  return <span className="text-slate-400">{displayText}<span className="animate-pulse text-[#FF5A1F]">|</span></span>;
}

type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3';

interface ShowcaseItem {
  id: string;
  title: string;
  desc: string;
  duration: string;
  res: string;
  type: string;
  ratio: AspectRatio;
  gradient: string;
  style: string;
  asset_id?: string;
  col_span?: string;
  row_span?: string;
  video_url?: string;
  /** 'image' | 'video' — how to render this item. Absent/legacy items default to video. */
  media_type?: string;
}



const ASPECT_CLASSES: Record<AspectRatio, string> = {
  '16:9': 'aspect-video',
  '9:16': 'aspect-[9/16]',
  '1:1': 'aspect-square',
  '4:3': 'aspect-[4/3]',
};

const ASPECT_LABELS: Record<AspectRatio, { icon: typeof Ratio; w: string; h: string }> = {
  '16:9': { icon: MonitorPlay, w: '16', h: '9' },
  '9:16': { icon: Smartphone, w: '9', h: '16' },
  '1:1': { icon: Square, w: '1', h: '1' },
  '4:3': { icon: Ratio, w: '4', h: '3' },
};
export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [projects, setProjects] = useState<UnifiedProject[]>([]);
  const [credits, setCredits] = useState<number | null>(null);
  const [activityData, setActivityData] = useState<{ label: string; value: number }[] | null>(null);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [assetsSummary, setAssetsSummary] = useState({ video: 0, image: 0, audio: 0 });
  const [liveJobs, setLiveJobs] = useState<any[]>([]);
  const [hoveredShowcase, setHoveredShowcase] = useState<string | null>(null);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [showcaseItems, setShowcaseItems] = useState<ShowcaseItem[]>([]);
  const [showcaseBlobs, setShowcaseBlobs] = useState<Record<string, string>>({});
  const [heroVideoUrl, setHeroVideoUrl] = useState<string | null>(null);
  const processingJobs = liveJobs.length;

  const addToast = useToastStore(s => s.addToast);
  const daemonOk = useDaemonStore(s => s.ok);
  const prevDaemonOk = useRef<boolean | null>(null);
  const user = useAuthStore(s => s.user);
  const planName = (user as any)?.plan?.name || 'Free';

  // Prevent background scrolling when video modal is open
  useEffect(() => {
    if (playingVideo) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [playingVideo]);

  useEffect(() => {
    setMounted(true);
    initDaemonCheck();
    const interval = setInterval(() => fetchUnifiedProjects().then(setProjects).catch(() => { }), 30000);
    fetchUnifiedProjects().then(setProjects).catch(() => { });
    laravel.creditsBalance().then(d => setCredits(d.balance)).catch(() => { });
    laravel.activityLogsStatistics().then((stats) => {
      if (stats?.daily) {
        const days = Object.entries(stats.daily).slice(-7).map(([date, count]) => ({ label: new Date(date).toLocaleDateString('vi-VN', { weekday: 'short' }).slice(0, 3), value: count as number }));
        setActivityData(days);
      }
    }).catch(() => { });
    laravel.activityLogs({ per_page: 5 }).then((res) => { const payload = res.data as any; setRecentActivities(Array.isArray(payload.items) ? payload.items : []); }).catch(() => { });
    laravel.assets().then((res) => {
      const assets = Array.isArray(res) ? res : res?.data || [];
      const summary = { video: 0, image: 0, audio: 0 };
      assets.forEach((a: any) => { const type = a.type || 'unknown'; if (type.includes('video')) summary.video++; else if (type.includes('image')) summary.image++; else if (type.includes('audio')) summary.audio++; });
      setAssetsSummary(summary);
    }).catch(() => { });
    laravel.renderJobs().then((res) => { const jobs = Array.isArray(res) ? res : res?.data || []; setLiveJobs(jobs.filter((j: any) => j.status === 'processing' || j.status === 'queued').slice(0, 3)); }).catch(() => { });
    laravel.getShowcase().then(async (res) => {
      const data = res?.data;
      if (!data) return;
      const items = data.items || [];
      setShowcaseItems(items);
      const jwt = localStorage.getItem('auth_token');
      const streamBase = `${(window as any).LARAVEL_URL || 'http://localhost:8000'}/api/showcase/stream/`;

      // Hero video
      if (data.hero_stream_token) {
        try {
          const resp = await fetch(streamBase + data.hero_stream_token, {
            headers: jwt ? { Authorization: `Bearer ${jwt}` } : {},
          });
          if (resp.ok) {
            const blob = await resp.blob();
            setHeroVideoUrl(URL.createObjectURL(blob));
          }
        } catch {}
      }

      // Showcase video blobs
      const blobs: Record<string, string> = {};
      await Promise.all(items.map(async (item: any) => {
        if (!item.stream_token) return;
        try {
          const resp = await fetch(streamBase + item.stream_token, {
            headers: jwt ? { Authorization: `Bearer ${jwt}` } : {},
          });
          if (!resp.ok) return;
          const blob = await resp.blob();
          blobs[item.asset_id || item.id] = URL.createObjectURL(blob);
        } catch {}
      }));
      setShowcaseBlobs(blobs);
    }).catch(() => { });
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (prevDaemonOk.current === false && daemonOk === true) addToast(t('dashboard.reconnected'), 'success');
    if (prevDaemonOk.current !== false && daemonOk === false) addToast(t('dashboard.offline'), 'error', 0);
    prevDaemonOk.current = daemonOk;
  }, [daemonOk]);

  useRealtimeJobs({
    onCompleted: (e: JobEvent) => {
      addToast(`Job hoàn thành: ${e.job_id?.slice(0, 8)}...`, 'success');
      setCredits(prev => (prev ?? 0) - 1 >= 0 ? (prev ?? 0) - 1 : 0);
      laravel.renderJobs().then((res) => {
        const jobs = Array.isArray(res) ? res : res?.data || [];
        setLiveJobs(jobs.filter((j: any) => j.status === 'processing' || j.status === 'queued').slice(0, 3));
      }).catch(() => {});
    },
    onFailed: (e: JobEvent) => {
      addToast(`Job thất bại: ${e.job_id?.slice(0, 8)}...`, 'error');
      laravel.renderJobs().then((res) => {
        const jobs = Array.isArray(res) ? res : res?.data || [];
        setLiveJobs(jobs.filter((j: any) => j.status === 'processing' || j.status === 'queued').slice(0, 3));
      }).catch(() => {});
    },
  });

  if (!mounted) {
    return (
      <div className="flex flex-col gap-6 pb-20 animate-pulse">
        <div className="h-[320px] rounded-2xl bg-white/[0.02] border border-white/12" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-white/[0.02] border border-white/12" />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-4 auto-rows-[180px]">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-2xl bg-white/[0.02] border border-white/12" style={{ gridColumn: `span ${i === 0 ? 6 : 3}` }} />
          ))}
        </div>
      </div>
    );
  }
  const totalAssets = assetsSummary.video + assetsSummary.image + assetsSummary.audio;

  return (
    <div className="flex flex-col gap-0 pb-20 font-sans relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-[#FF5A1F]/8 blur-[150px] animate-pulse" />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full bg-[#FF5A1F]/6 blur-[130px]" />
      </div>

      {/* ===== HERO: Full cinematic ===== */}
      <section className="relative">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="relative rounded-2xl overflow-hidden min-h-[260px] md:min-h-[320px]">
          {heroVideoUrl ? (
            <video className="absolute inset-0 w-full h-full object-cover" src={heroVideoUrl} autoPlay muted loop playsInline />
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-[#FF5A1F]/20 via-[#1a0f0a] to-[#0a0a12]" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-transparent to-transparent" />
              <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-[#FF5A1F]/10 blur-[140px]" />
              <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full bg-[#FF5A1F]/8 blur-[100px]" />
            </>
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          <div className="relative p-6 md:p-6 lg:p-14 flex flex-col justify-between h-full">
            <div className="flex items-start justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
                    <div className={`h-2 w-2 rounded-full ${daemonOk ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : daemonOk === false ? 'bg-red-400 shadow-sm shadow-red-400/50' : 'bg-amber-400 animate-pulse shadow-sm shadow-amber-400/50'}`} />
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{daemonOk ? 'Studio Online' : daemonOk === false ? 'Offline' : 'Connecting...'}</span>
                  </div>
                  {processingJobs > 0 && (<div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#FF5A1F]/10 border border-[#FF5A1F]/20"><div className="h-2 w-2 rounded-full bg-[#FF5A1F] animate-pulse" /><span className="text-[10px] font-bold text-[#FF8A5B] uppercase tracking-widest">{processingJobs} rendering</span></div>)}
                </div>

                <div className="space-y-3">
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold tracking-tight text-white leading-[1.1]">
                    Wavise <span className="text-[#FF5A1F]">Studio</span>
                  </h1>
                  <p className="text-base md:text-lg text-slate-300 max-w-2xl leading-relaxed">
                    Tạo video AI chất lượng cao từ văn bản, hình ảnh và kịch bản.
                    Hỗ trợ đa tỷ lệ khung hình, nhiều mô hình AI mạnh mẽ.
                  </p>
                </div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="flex flex-wrap items-center gap-3">
                  <Link href="/studio"><button className="group flex items-center gap-2.5 h-12 px-7 rounded-2xl bg-[#FF5A1F] hover:bg-[#FF6A2B] text-white font-bold text-sm tracking-tight shadow-sm shadow-[#FF5A1F]/25 hover:shadow-[#FF5A1F]/35 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"><Wand2 className="h-4.5 w-4.5" />Tạo video mới<ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" /></button></Link>
                  <Link href="/projects"><button className="flex items-center gap-2 h-12 px-6 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-bold text-sm tracking-tight transition-all cursor-pointer"><Film className="h-4 w-4 text-slate-400" />Dự án của tôi</button></Link>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ===== AI VIDEO SHOWCASE - Free-form bento ===== */}
      {showcaseItems.length > 0 && (
        <section className="relative mt-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <SectionHeading
              eyebrow="Khám phá"
              title="Video"
              accent="Showcase"
              subtitle="Khám phá khả năng AI với mọi tỷ lệ khung hình"
              action={
                <div className="flex items-center gap-3">
                  {(['16:9', '9:16', '1:1', '4:3'] as AspectRatio[]).map((r) => {
                    const info = ASPECT_LABELS[r];
                    const Icon = info.icon;
                    return (
                      <div key={r} className="hidden md:flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.03] border border-white/12 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                        <Icon className="h-3 w-3" />
                        <span>{r}</span>
                      </div>
                    );
                  })}
                  <Link href="/studio"><span className="flex items-center gap-1 text-[10px] font-bold text-[#FF5A1F] uppercase tracking-widest hover:underline group">Tạo ngay <ArrowUpRight className="h-3 w-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" /></span></Link>
                </div>
              }
            />

            {/* Bento masonry grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-4 auto-rows-[150px] md:auto-rows-[180px] lg:auto-rows-[200px]">
              {showcaseItems.map((item, i) => {
                const itemKey = item.asset_id || item.id || String(i);
                const isHovered = hoveredShowcase === itemKey;
                const ratioInfo = ASPECT_LABELS[item.ratio];
                const RatioIcon = ratioInfo.icon;

                const cs = (item.col_span || '25').toString();
                const rs = (item.row_span || '1').toString();
                const colMap: Record<string, string> = {
                  '25': 'col-span-1 lg:col-span-3',
                  '33': 'col-span-1 md:col-span-2 lg:col-span-4',
                  '50': 'col-span-2 md:col-span-2 lg:col-span-6',
                  '66': 'col-span-2 md:col-span-3 lg:col-span-8',
                  '75': 'col-span-2 md:col-span-3 lg:col-span-9',
                  '100': 'col-span-2 md:col-span-4 lg:col-span-12',
                };
                const rowMap: Record<string, string> = {
                  '1': 'row-span-1', '2': 'row-span-2', '3': 'row-span-3',
                };

                return (
                  <motion.div
                    key={itemKey}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.45 + i * 0.05, duration: 0.4 }}
                    className={cn('group relative rounded-2xl overflow-hidden border border-white/12 hover:border-white/15 transition-all duration-300 cursor-pointer', colMap[cs] || 'col-span-1', rowMap[rs] || 'row-span-1')}
                    onMouseEnter={() => setHoveredShowcase(itemKey)}
                    onMouseLeave={() => setHoveredShowcase(null)}
                    style={{ background: item.style }}
                  >
                    <div className="block h-full w-full relative overflow-hidden">
                      {showcaseBlobs[item.asset_id || item.id] ? (
                        item.media_type === 'image' ? (
                          <img
                            className="absolute inset-0 w-full h-full object-cover"
                            src={showcaseBlobs[item.asset_id || item.id]}
                            alt={item.title}
                            loading="lazy"
                          />
                        ) : (
                          <video
                            className="absolute inset-0 w-full h-full object-cover"
                            src={showcaseBlobs[item.asset_id || item.id]}
                            autoPlay
                            muted
                            loop
                            playsInline
                          />
                        )
                      ) : (
                        <div className={cn('absolute inset-0 bg-gradient-to-br', item.gradient || 'from-[#0a0a0a] to-[#1a1a1a]')} />
                      )}
                      {/* Dark overlay for readability */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      {/* Aspect ratio badge */}
                      <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#16141a]/40 backdrop-blur-sm">
                        <RatioIcon className="h-2.5 w-2.5 text-white/60" />
                        <span className="text-[8px] font-bold text-white/70 uppercase tracking-wider">{item.ratio}</span>
                      </div>
                      {/* Type badge */}
                      <div className="absolute top-2.5 left-2.5">
                        <span className="px-2 py-0.5 rounded-full bg-[#16141a]/40 backdrop-blur-sm text-[8px] font-bold text-white/80 uppercase tracking-wider">{item.type}</span>
                      </div>
                      {/* Bottom info */}
                      <div className="absolute inset-x-0 bottom-0 p-3">
                        <div className="flex items-end justify-between">
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-bold text-white truncate drop-shadow-sm">{item.title}</h3>
                            <p className="text-[10px] text-white/70 truncate drop-shadow">{item.desc}</p>
                          </div>
                          <div className="flex items-center gap-1.5 ml-2 shrink-0">
                            <span className="px-1.5 py-0.5 rounded bg-white/20 backdrop-blur-sm text-[8px] font-bold text-white/80">{item.duration}</span>
                            <span className="px-1.5 py-0.5 rounded bg-white/20 backdrop-blur-sm text-[8px] font-bold text-white/80">{item.res}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </section>
      )}

      {/* ===== RECENT PROJECTS ===== */}
      <section className="relative mt-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
          <SectionHeading
            eyebrow="Thư viện"
            title="Dự án gần đây"
            subtitle={projects.length > 0 ? `${projects.length} dự án` : 'Chưa có dự án'}
            action={projects.length > 0 ? (
              <Link href="/projects"><span className="flex items-center gap-1 text-[10px] font-bold text-[#FF5A1F] uppercase tracking-widest hover:underline group">{t('common.viewAll')} <ArrowUpRight className="h-3 w-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" /></span></Link>
            ) : undefined}
          />

          {projects.length === 0 ? (
            <div className="p-6 md:p-6 rounded-2xl bg-[#1f1c25] border border-dashed border-white/12 flex flex-col items-center justify-center text-center gap-4 min-h-[200px] w-full">
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1 }} className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#FF5A1F]/20 to-[#FF5A1F]/5 flex items-center justify-center"><FolderOpen className="h-7 w-7 text-[#FF5A1F]/50" /></motion.div>
              <div className="space-y-1"><p className="text-sm font-semibold text-white">{t('dashboard.noProjects')}</p><p className="text-xs text-slate-400">Bắt đầu tạo video đầu tiên của bạn</p></div>
              <Link href="/studio"><Button className="h-10 px-6 rounded-xl bg-[#FF5A1F] hover:bg-[#FF6A2B] text-white font-bold text-xs shadow-sm shadow-[#FF5A1F]/20"><Wand2 className="h-4 w-4 mr-1.5" />{t('dashboard.createFirstProject')}</Button></Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-6">
              {projects.slice(0, 8).map((p) => (
                <UnifiedProjectCard key={p.id} project={p} />
              ))}
            </div>
          )}
        </motion.div>
      </section>

      {/* ===== WORKSPACE OVERVIEW ===== */}
      <section className="relative mt-10 mb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* COL 1: Stats & Assets */}
          <div className="space-y-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="grid grid-cols-2 gap-3">
              {[
                { icon: Film, value: projects.length, label: 'Dự án', color: '#FF5A1F', href: '/projects', anim: true },
                { icon: Zap, value: credits ?? 0, label: 'Credits', color: '#FF5A1F', href: '/billing', anim: true, showProgress: true },
                { icon: Activity, value: processingJobs, label: 'Rendering', color: '#FF5A1F', href: '/jobs' },
                { icon: Crown, value: planName, label: 'Gói', color: '#F59E0B', href: '/billing', isStr: true },
              ].map((card) => (
                <Link key={card.label} href={card.href} className="group block">
                  <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-[#1f1c25] border border-white/12 hover:border-white/15 transition-all h-full">
                    <div className="flex items-start justify-between">
                      <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${card.color}15` }}><card.icon className="h-4 w-4" style={{ color: card.color }} /></div>
                      <ArrowUpRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-white transition-colors" />
                    </div>
                    <div className="mt-1">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{card.label}</p>
                      <p className="text-base font-bold text-white mt-0.5">{card.isStr ? card.value : card.anim ? <AnimatedCounter target={card.value as number} /> : card.value}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.95 }} className="p-4 rounded-2xl bg-[#1f1c25] border border-white/12">
              <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-2"><Library className="h-3.5 w-3.5 text-[#FF8A5B]" /><h3 className="text-xs font-bold text-white">Thư viện</h3></div><Link href="/assets"><span className="text-[9px] font-bold text-[#FF5A1F] uppercase tracking-wider hover:underline">Xem</span></Link></div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Video', count: assetsSummary.video, icon: Film, color: '#FF5A1F' },
                  { label: 'Image', count: assetsSummary.image, icon: Image, color: '#FF5A1F' },
                  { label: 'Audio', count: assetsSummary.audio, icon: Music, color: '#FF5A1F' },
                ].map((item) => (
                  <div key={item.label} className="py-2 rounded-lg bg-white/[0.02] border border-white/12 text-center group hover:border-white/10 transition-all">
                    <div className="h-7 w-7 rounded-lg mx-auto mb-1 flex items-center justify-center" style={{ backgroundColor: `${item.color}15` }}><item.icon className="h-3.5 w-3.5" style={{ color: item.color }} /></div>
                    <p className="text-sm font-bold text-white">{item.count}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* COL 2: Activity Center */}
          <div className="space-y-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }} className="h-full flex flex-col p-4 rounded-2xl bg-[#1f1c25] border border-white/12">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2"><History className="h-3.5 w-3.5 text-[#FF8A5B]" /><h3 className="text-xs font-bold text-white">Nhật ký hoạt động</h3></div>
              </div>
              <div className="flex-1 space-y-4">
                {recentActivities.slice(0, 4).map((activity: any, i) => {
                  const isProject = activity.type === 'project';
                  const ActIcon = isProject ? FolderPlus : Sparkles;
                  const color = isProject ? 'text-[#FF5A1F]' : 'text-[#FF5A1F]';
                  const bg = isProject ? 'bg-[#FF5A1F]/10' : 'bg-[#FF5A1F]/10';
                  const desc = buildActivityDescription(activity);
                  return (
                    <div key={i} className="flex gap-3">
                      <div className="relative mt-0.5">
                        <div className={`h-6 w-6 rounded-full flex items-center justify-center ${bg}`}><ActIcon className={`h-3 w-3 ${color}`} /></div>
                        {i !== Math.min(recentActivities.length, 4) - 1 && <div className="absolute top-6 bottom-[-16px] left-1/2 -translate-x-1/2 w-px bg-white/[0.05]" />}
                      </div>
                      <div className="flex-1 min-w-0 pb-1">
                        <p className="text-[11px] text-white">
                          <span className="font-medium text-slate-300">{activity.user?.name || activity.user}</span> {activity.action || 'đã tạo'} <span className="font-bold">{activity.target || desc}</span>
                        </p>
                        <p className="text-[9px] text-slate-400 mt-0.5">{activity.created_at ? new Date(activity.created_at).toLocaleString('vi-VN') : activity.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              {activityData && (
                <div className="mt-4 pt-4 border-t border-white/12">
                  <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-2"><TrendingUp className="h-3.5 w-3.5 text-emerald-400" /><h3 className="text-[10px] font-bold text-slate-400 uppercase">7 ngày qua</h3></div><span className="text-[9px] text-emerald-400/80 font-bold bg-emerald-400/10 px-1.5 py-0.5 rounded">{activityData.reduce((a, b) => a + b.value, 0)} events</span></div>
                  <BarChart data={activityData} height={50} />
                </div>
              )}
            </motion.div>
          </div>

          {/* COL 3: Live Jobs */}
          <div className="space-y-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.05 }} className="h-full p-4 rounded-2xl bg-[#1f1c25] border border-white/12 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-[#FF5A1F] animate-pulse" />
                  <Cpu className="h-3.5 w-3.5 text-[#FF8A5B]" />
                  <h3 className="text-xs font-bold text-white">Đang render</h3>
                </div>
                <span className="text-[9px] font-bold text-[#FF5A1F] uppercase tracking-wider bg-[#FF5A1F]/10 px-1.5 py-0.5 rounded">{liveJobs.length} jobs</span>
              </div>

              {liveJobs.length > 0 ? (
                <div className="space-y-3 flex-1">
                  {liveJobs.map((job: any, idx: number) => (
                    <div key={job.uuid || job.id || idx} className="space-y-1.5 bg-white/[0.02] p-2.5 rounded-xl border border-white/12">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-white truncate pr-2">{job.name || (job.uuid || job.id || '').slice(0, 8) || 'Job'}</span>
                        <span className="text-[9px] font-bold text-slate-400">{job.status === 'processing' ? 'Đang xử lý' : 'Đang chờ'}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-[#16141a] overflow-hidden relative">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${job.progress || 0}%` }} transition={{ duration: 1, ease: 'easeOut' }} className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#FF5A1F] to-[#FF8A5B]" />
                      </div>
                      <div className="flex justify-end pt-0.5">
                        <span className="text-[9px] text-[#FF8A5B] font-bold">{job.progress || 0}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 min-h-[150px]">
                  <Cpu className="h-8 w-8 text-slate-400 mb-2" />
                  <p className="text-[11px] text-slate-500 font-medium">Không có tiến trình render nào</p>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-white/12">
                <Link href="/jobs"><button className="w-full h-8 rounded-lg bg-white/[0.03] border border-white/12 text-slate-400 font-bold text-[10px] uppercase tracking-wider hover:bg-white/[0.06] hover:text-white transition-all">Xem tất cả</button></Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== VIDEO MODAL ===== */}
      <AnimatePresence>
        {playingVideo && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[#16141a]/90 backdrop-blur-xl p-4 md:p-6"
            onClick={() => setPlayingVideo(null)}
          >
            <button className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors" onClick={() => setPlayingVideo(null)}>
              <X className="h-6 w-6" />
            </button>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className={cn(
                "relative w-full rounded-2xl overflow-hidden bg-[#16141a] border border-white/10 shadow-md flex items-center justify-center",
                (() => {
                  const item = showcaseItems.find(i => (i.asset_id || i.id) === playingVideo);
                  if (item?.ratio === '9:16') return 'aspect-[9/16] max-h-[85vh] max-w-[calc(85vh*9/16)]';
                  if (item?.ratio === '1:1') return 'aspect-square max-h-[85vh] max-w-[85vh]';
                  if (item?.ratio === '4:3') return 'aspect-[4/3] max-w-4xl max-h-[85vh]';
                  return 'aspect-video max-w-5xl max-h-[85vh]';
                })()
              )}
              onClick={e => e.stopPropagation()}
            >
              {/* Dummy video player UI for now */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a]" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10">
                <div className="h-16 w-16 rounded-full bg-[#FF5A1F]/20 flex items-center justify-center animate-pulse"><Play className="h-8 w-8 text-[#FF5A1F] ml-1" /></div>
                <p className="text-white font-medium text-center px-4">Đang tải video showcase từ Admin...</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}