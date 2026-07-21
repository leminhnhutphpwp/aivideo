'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ReactFlow, Controls, MiniMap, Background, BackgroundVariant, Node, Edge, MarkerType, Panel, NodeTypes, type EdgeTypes } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { laravel } from '@/lib/api/client';
import { useToastStore } from '@/stores/toast-store';
import { subscribeStoryboard } from '@/lib/echo';
import { ArrowLeft, Edit3, Play, Download, Loader2, CheckCircle, AlertCircle, Sparkles, Film, Camera, Mic, ImageIcon, Presentation, XCircle, Trash2 } from 'lucide-react';
import { PulsingEdge } from '@/components/studio/pulsing-edge';
import { Storyboard } from '@/lib/api/storyboard-types';
import { CinematicGenerationStatus } from '@/components/projects/cinematic-generation-status';
import { VoiceoverModal } from '@/components/studio/voiceover-modal';
import { MediaViewer } from '@/components/ui/media-viewer';
import { downloadBlob } from '@/lib/download';

// Voiceover (TTS) is DISABLED for the "AI Phục chế" pivot: the feature is currently broken (the
// daemon TTS key is a placeholder → 401 on submit) and is out of scope for the image-restoration
// product. Backend route + providers are left intact — re-enable by flipping this to true AND
// supplying a real CKEY_API_KEY / ELEVENLABS_API_KEY in apps/daemon/.env.
const VOICEOVER_ENABLED = false;

const COLORS = ['#FF5A1F', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];
const STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Bản nháp', cls: 'bg-slate-500/20 text-slate-400' },
  analyzing: { label: 'Phân tích', cls: 'bg-[#FF5A1F]/20 text-[#FF8A5B]' },
  analyzed: { label: 'Đã phân tích', cls: 'bg-emerald-500/15 text-emerald-400' },
  rendering: { label: 'Đang render', cls: 'bg-orange-500/15 text-orange-400' },
  completed: { label: 'Hoàn thành', cls: 'bg-emerald-500/15 text-emerald-400' },
  failed: { label: 'Thất bại', cls: 'bg-red-500/15 text-red-400' },
};

function SceneStatusNode({ data }: { data: any; selected: boolean }) {
  const st = STATUS[data.status] || STATUS.draft;
  const c = COLORS[(data.sceneNumber - 1) % COLORS.length];
  const Icon = data.status === 'completed' ? CheckCircle : data.status === 'failed' ? AlertCircle : null;
  const active = data.status === 'rendering' || data.status === 'analyzing';
  const isRendering = data.status === 'rendering';
  const tag = data.tag;
  const hasPrompt = !!data.prompt;
  const imageCount = (data.refPreview ? 1 : 0) + (data.lastFramePreview ? 1 : 0);

  return (
    <div className={cn(
      "relative w-[240px] rounded-2xl transition-all overflow-hidden",
      "bg-zinc-900 border",
      data.status === 'completed' && "border-emerald-500/10",
      data.status === 'failed' && "border-red-500/10",
      active && !isRendering && "border-[#FF5A1F]/15",
      isRendering && "border-transparent",
      !active && "border-white/[0.06]",
    )}
    style={data.status === 'completed' ? { boxShadow: `0 0 25px ${c}20` } : undefined}
    >
      {/* Progressive loading ring */}
      {isRendering && (
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none z-0">
          <div className="absolute inset-0 rounded-2xl"
            style={{
              background: 'conic-gradient(from 0deg, #FF5A1F60 0%, #FF5A1F20 40%, transparent 60%, transparent 100%)',
              animation: 'spin 3s linear infinite',
              mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              maskComposite: 'exclude', padding: '1.5px',
            }} />
        </div>
      )}
      {active && !isRendering && <motion.div className="absolute inset-x-0 -bottom-px h-px" style={{ background: 'linear-gradient(90deg,transparent,#FF5A1F40,transparent)' }} animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 2, repeat: Infinity }} />}
      {isRendering && <motion.div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-[#FF5A1F]/60 via-[#FF5A1F] to-[#FF5A1F]/60"
        initial={{ width: '0%' }} animate={{ width: ['0%', '30%', '55%', '70%', '85%', '95%'] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }} />}

      {/* Smart tag */}
      {tag && (
        <div className="absolute -top-2 right-3 z-20">
          <span className={cn("text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md",
            tag === 'intro' && "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
            tag === 'outro' && "bg-amber-500/15 text-amber-400 border border-amber-500/20",
            tag === 'transition' && "bg-slate-500/10 text-slate-500 border border-slate-500/15",
          )}>
            {tag === 'intro' ? 'Mở đầu' : tag === 'outro' ? 'Kết thúc' : 'Chuyển tiếp'}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-white/5 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: c + '15', color: c }}>{data.sceneNumber}</div>
          <span className="text-[11px] font-medium text-slate-300 truncate max-w-[90px]">{hasPrompt ? data.prompt.substring(0, 22) : 'Cảnh'}</span>
        </div>
        <span className={cn("px-2 py-0.5 rounded-md text-[9px] font-semibold relative z-10", st.cls)}>{active && <Loader2 className="h-2.5 w-2.5 inline animate-spin mr-0.5" />}{Icon && <Icon className="h-2.5 w-2.5 inline mr-0.5" />}{st.label}</span>
      </div>

      {/* Body: images or prompt */}
      <div className="px-3 pb-2.5 relative z-10">
        {imageCount > 0 ? (
          <div className={cn("flex rounded-xl overflow-hidden border border-white/[0.04]", imageCount > 1 ? "h-12 gap-px" : "h-16")}>
            {data.refPreview && (
              <div className={cn("relative", imageCount > 1 ? "flex-1" : "w-full")}>
                <img src={data.refPreview} className="w-full h-full object-cover" alt="" />
                <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-black/60 to-transparent flex items-end px-1.5 pb-0.5">
                  <span className="text-[8px] text-white/70">Tham chiếu</span></div>
              </div>
            )}
            {data.lastFramePreview && (
              <div className={cn("relative", imageCount > 1 ? "flex-1" : "w-full")}>
                <img src={data.lastFramePreview} className="w-full h-full object-cover" alt="" />
                <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-black/60 to-transparent flex items-end px-1.5 pb-0.5">
                  <span className="text-[8px] text-white/70">Khung cuối</span></div>
              </div>
            )}
          </div>
        ) : hasPrompt ? (
          <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-3">{data.prompt}</p>
        ) : (
          <div className="h-14 bg-gradient-to-br from-[#0A0A0A] to-[#060606] rounded-xl flex items-center justify-center">
            <Film className="h-5 w-5 text-white/[0.04]" />
          </div>
        )}
        {/* Rendering overlay */}
        {isRendering && (
          <motion.div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#FF5A1F]/5 to-transparent"
            animate={{ opacity: [0.3, 0.1, 0.3] }} transition={{ duration: 3, repeat: Infinity }} />
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-white/5 relative z-10">
        <div className="flex items-center gap-1.5">
          {data.camera_movement && <Camera className="h-3 w-3 text-slate-600" />}
          {data.has_narration && <Mic className="h-3 w-3 text-slate-600" />}
          {data.has_reference && <ImageIcon className="h-3 w-3 text-slate-600" />}
        </div>
        <span className="text-[10px] text-slate-600">{data.duration}s · {data.aspect_ratio}</span>
      </div>
    </div>
  );
}

const nodeTypes: NodeTypes = { sceneStatus: SceneStatusNode };
const edgeTypes: EdgeTypes = { pulsing: PulsingEdge };
const POLLING = ['analyzing', 'rendering'];
const MAX_POLL_RETRIES = 60;

const VIDEO_TYPE_LABELS: Record<string, string> = {
  ugc_review: 'UGC Review',
  brand_tvc: 'TVC Thương hiệu',
  virtual_koc: 'KOC Ảo',
  product_ads: 'Quảng cáo Sản phẩm',
  campaign: 'Chiến dịch',
  storyboard_video: 'Storyboard Video',
  short_form_ads: 'Quảng cáo Ngắn',
  shoppable_video: 'Video Mua sắm',
};

const QUALITY_TIER_LABELS: Record<string, string> = {
  standard: 'Tiêu chuẩn',
  standard_hd: 'HD',
  premium: 'Cao cấp',
  ultra: 'Siêu nét',
};

export default function FlowViewerPage() {
  const router = useRouter(); const params = useParams(); const uuid = params.uuid as string;
  const addToast = useToastStore(s => s.addToast);
  const [sb, setSb] = useState<Storyboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const pollRef = useRef<any>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<any>(null);
  const pollRetryCount = useRef(0);
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const [playbackActive, setPlaybackActive] = useState(false);
  const [voiceoverOpen, setVoiceoverOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const wsReceivedRef = useRef(false);

  const fetch = useCallback(async (silent = false) => {
    try { if (!silent) setLoading(true); const d = await laravel.storyboard(uuid); setSb(d.data || d); } catch (e: any) { if (!silent) addToast(e?.message || 'Lỗi', 'error'); } finally { if (!silent) setLoading(false); }
  }, [uuid, addToast]);

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    if (showDeleteConfirm) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showDeleteConfirm]);

  useEffect(() => {
    if (sb && POLLING.includes(sb.status)) {
      wsReceivedRef.current = false;

      // Subscribe to WebSocket for realtime progress
      const unsub = subscribeStoryboard(uuid, {
        onProgress: (data) => {
          wsReceivedRef.current = true;
          setSb(prev => prev ? {
            ...prev,
            status: data.status as Storyboard['status'],
            progress_message: data.progress_message ?? prev.progress_message,
          } : prev);
          // Terminal status from WS — stop polling, fetch fresh data
          if (data.status === 'completed' || data.status === 'failed') {
            if (pollRef.current) clearInterval(pollRef.current);
            if (timerRef.current) clearInterval(timerRef.current);
            fetch(true);
          }
        },
      });
      unsubscribeRef.current = unsub;

      // Fallback to polling if no WebSocket message within 15s
      const wsTimeout = setTimeout(() => {
        if (!wsReceivedRef.current) {
          // No WebSocket received — start polling as fallback
          pollRetryCount.current = 0;
          pollRef.current = setInterval(() => {
            pollRetryCount.current += 1;
            if (pollRetryCount.current > MAX_POLL_RETRIES) {
              if (pollRef.current) clearInterval(pollRef.current);
              if (timerRef.current) clearInterval(timerRef.current);
              setPollTimedOut(true);
              addToast('Quá thời gian chờ, vui lòng thử lại', 'error');
              return;
            }
            fetch(true);
          }, 5000);
          timerRef.current = setInterval(() => setElapsed(c => c + 1), 1000);
        }
      }, 15000);

      return () => {
        clearTimeout(wsTimeout);
        if (pollRef.current) clearInterval(pollRef.current);
        if (timerRef.current) clearInterval(timerRef.current);
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }
      };
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      setElapsed(0);
      setPollTimedOut(false);
    }
  }, [sb?.status, fetch, uuid, addToast]);

  const { nodes, edges } = useMemo(() => {
    if (!sb?.scenes) return { nodes: [], edges: [] };
    // Smart tags: compute intro/outro per node
    const hasIncoming = new Set<string>();
    const hasOutgoing = new Set<string>();
    const es: Edge[] = [];
    sb.scenes.forEach(s => {
      if (s.parent_scene_id) {
        hasIncoming.add(String(s.id));
        hasOutgoing.add(String(s.parent_scene_id));
        es.push({
          id: `e-${s.parent_scene_id}-${s.id}`, source: String(s.parent_scene_id), target: String(s.id),
          type: s.status === 'rendering' ? 'pulsing' : 'smoothstep',
          data: { animated: s.status === 'rendering' },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#ffffff20' },
          style: { stroke: s.status === 'rendering' ? '#FF5A1F30' : '#ffffff10', strokeWidth: s.status === 'rendering' ? 2 : 1.5 },
          label: s.edge_label || undefined,
          labelStyle: { fill: '#64748b', fontSize: 10 },
          labelBgStyle: { fill: '#121212', fillOpacity: 0.95 },
        });
      }
    });
    const ns: Node[] = sb.scenes.map((s, i) => {
      const sid = String(s.id);
      const isIntro = !hasIncoming.has(sid);
      const isOutro = !hasOutgoing.has(sid);
      const tag = sb.scenes.length === 1 ? null : isIntro ? 'intro' : isOutro ? 'outro' : 'transition';
      return {
        id: sid, type: 'sceneStatus',
        position: { x: s.position_x ?? 80 + (i % 3) * 280, y: s.position_y ?? 80 + Math.floor(i / 3) * 220 },
        data: {
          sceneNumber: s.scene_number, status: s.status, prompt: s.prompt,
          duration: s.duration_seconds, aspect_ratio: s.aspect_ratio,
          thumbnail_path: s.thumbnail_path, camera_movement: s.camera_movement,
          has_narration: !!s.narration, has_reference: !!s.reference_image,
          tag,
        },
      };
    });
    return { nodes: ns, edges: es };
  }, [sb]);

  // Cinematic Playback
  const handlePlayback = useCallback(async () => {
    if (playbackActive || nodes.length === 0) return;
    setPlaybackActive(true);
    const ordered = nodes.map(n => n.id); // already in topological order
    for (const nodeId of ordered) {
      const el = document.querySelector(`.react-flow__node[data-id="${nodeId}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      await new Promise(r => setTimeout(r, 1500));
    }
    setPlaybackActive(false);
  }, [playbackActive, nodes]);

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const url = `${process.env.NEXT_PUBLIC_LARAVEL_URL || 'http://localhost:8000'}/api/storyboards/${uuid}/download`;
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = now.getFullYear();
      const shortId = uuid.slice(0, 8);
      await downloadBlob(url, `storyboard_${shortId}_${dd}-${mm}-${yyyy}.mp4`, token);
    } catch (e: any) {
      addToast(e?.message || 'Lỗi tải về', 'error');
    } finally {
      setDownloading(false);
    }
  }, [uuid, sb?.title, addToast]);

  // Result hero visibility — the completed render plays inline (was download-only before).
  const [showResult, setShowResult] = useState(true);

  if (loading) return <div className="h-full w-full flex items-center justify-center bg-zinc-950"><Loader2 className="h-6 w-6 animate-spin text-slate-600" /></div>;
  if (!sb) return <div className="h-full w-full flex items-center justify-center bg-zinc-950"><p className="text-sm text-slate-600">Không tìm thấy storyboard</p></div>;

  const st = STATUS[sb.status] || STATUS.draft;
  const Icon = sb.status === 'completed' ? CheckCircle : sb.status === 'failed' ? AlertCircle : null;
  const active = POLLING.includes(sb.status);
  // Scene-graph modes (multi_scene) have nodes; one-shot / multi-panel storyboards have none —
  // the ReactFlow canvas would be blank for them, so we hide the "Xem sơ đồ" toggle & canvas.
  const hasScenes = nodes.length > 0;
  const isMultiPanel = sb.render_mode === 'storyboard_image';

  return (
    <div className="h-full w-full flex flex-col bg-zinc-950">
      <div className="h-11 flex items-center gap-3 px-4 border-b border-white/[0.06] bg-[#18181B] shrink-0 z-10">
        <button onClick={() => router.push('/studio/storyboard')} className="cursor-pointer p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-slate-300 transition-colors"><ArrowLeft className="h-4 w-4" /></button>
        <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-semibold", st.cls)}>{active && <Loader2 className="h-2.5 w-2.5 inline animate-spin mr-1" />}{Icon && <Icon className="h-2.5 w-2.5 inline mr-1" />}{st.label}</span>
        {sb.render_mode === 'single_flow' ? (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#FF5A1F]/10 border border-[#FF5A1F]/20 text-[10px] text-[#FF5A1F] font-medium"><Sparkles className="h-3 w-3" />One-Shot</span>
        ) : (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-500/10 border border-slate-500/20 text-[10px] text-slate-400 font-medium"><Film className="h-3 w-3" />Ghép cảnh</span>
        )}
        <h1 className="text-sm font-medium text-slate-200 truncate">{sb.title}</h1>
        <span className="text-[10px] text-slate-600 ml-2">{sb.scenes?.length || 0} cảnh</span>
        <div className="ml-auto flex items-center gap-2">
          {sb.status === 'draft' && <button onClick={() => router.push(`/studio/storyboard/flow?id=${uuid}`)} className="cursor-pointer h-8 flex items-center gap-1.5 px-3 rounded-xl bg-[#18181B] border border-white/[0.06] hover:border-white/[0.10] text-[11px] text-slate-400 transition-colors"><Edit3 className="h-3 w-3" /> Sửa</button>}
          {sb.status === 'failed' && <button onClick={() => router.push(`/studio/storyboard/flow?id=${uuid}`)} className="cursor-pointer h-8 flex items-center gap-1.5 px-3 rounded-xl bg-[#18181B] border border-white/[0.06] hover:border-white/[0.10] text-[11px] text-slate-400 transition-colors"><Edit3 className="h-3 w-3" /> Sửa lại</button>}
          {actionLoading && <span className="text-[11px] text-slate-400 flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" /> Đang xử lý...</span>}
          {(sb.status === 'draft' || sb.status === 'analyzed' || sb.status === 'failed') && <button onClick={async () => {
            setActionLoading(true);
            try {
              if (sb.status === 'failed') {
                const needsCompile = (sb.render_mode === 'single_flow' || sb.render_mode === 'storyboard_image') && !sb.compiled_prompt;
                if (needsCompile) {
                  addToast('Đang compile prompt...', 'info');
                  await laravel.compilePrompt(uuid);
                }
                await laravel.retryStoryboard(uuid);
              } else {
                const needsCompile = (sb.render_mode === 'single_flow' || sb.render_mode === 'storyboard_image') && !sb.compiled_prompt;
                if (needsCompile) {
                  addToast('Đang compile prompt...', 'info');
                  await laravel.compilePrompt(uuid);
                }
                await laravel.renderStoryboard(uuid);
              }
              addToast('Đã bắt đầu render', 'success');
              router.refresh();
              fetch();
            } catch (e: any) {
              addToast(e?.message || 'Lỗi', 'error');
              fetch();
            } finally {
              setActionLoading(false);
            }
          }} disabled={actionLoading || (sb.status === 'failed' && (sb.retries_remaining ?? 1) <= 0)} className="cursor-pointer h-8 flex items-center gap-1.5 px-4 rounded-xl bg-gradient-to-r from-[#FF5A1F] to-[#FF6B35] hover:from-[#FF6B35] hover:to-[#FF7B45] text-[11px] text-white font-semibold transition-all shadow-[0_2px_12px_rgba(255,90,31,0.25)] disabled:opacity-50 disabled:cursor-not-allowed"><Play className="h-3 w-3" /> {sb.status === 'failed' ? ((sb.retries_remaining ?? 1) <= 0 ? 'Hết lượt thử' : `Thử lại${sb.retries_remaining != null ? ` (còn ${sb.retries_remaining})` : ''}`) : 'Render'}</button>}
          {sb.status === 'failed' && (sb.retries_remaining ?? 1) <= 0 && <span className="flex items-center gap-1 text-[10px] text-amber-400/90"><AlertCircle className="h-3 w-3" /> Đã dùng hết {sb.max_render_attempts ?? 5} lần thử — hãy tạo storyboard mới</span>}
          {active && <button onClick={async () => { setCancelling(true); try { await laravel.cancelStoryboard(uuid); addToast('Đã hủy storyboard', 'success'); fetch(true); } catch (e: any) { addToast(e?.message || 'Lỗi', 'error'); } finally { setCancelling(false); } }} disabled={cancelling} className="cursor-pointer h-8 flex items-center gap-1.5 px-3 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-[11px] text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><XCircle className="h-3 w-3" /> {cancelling ? 'Đang hủy...' : 'Hủy'}</button>}
          {sb.status === 'completed' && <>
            {hasScenes && <button onClick={() => setShowResult(v => !v)}
              className="cursor-pointer h-8 flex items-center gap-1.5 px-3 rounded-xl bg-[#18181B] border border-white/[0.06] hover:border-white/[0.10] text-[11px] text-slate-400 transition-colors">
              {showResult ? <><Film className="h-3 w-3" /> Xem sơ đồ</> : <><Play className="h-3 w-3" /> Xem kết quả</>}
            </button>}
            {VOICEOVER_ENABLED && <button onClick={() => setVoiceoverOpen(true)}
              className="cursor-pointer h-8 flex items-center gap-1.5 px-3 rounded-xl bg-[#18181B] border border-white/[0.06] hover:border-white/[0.10] text-[11px] text-slate-400 transition-colors">
              <Mic className="h-3 w-3" /> Thêm giọng đọc
            </button>}
            <button onClick={handleDownload} disabled={downloading} className="cursor-pointer h-8 flex items-center gap-1.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-[11px] text-white font-semibold transition-all shadow-[0_2px_12px_rgba(16,185,129,0.25)] disabled:opacity-50 disabled:cursor-not-allowed">{downloading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />} {downloading ? 'Đang tải...' : 'Tải về'}</button>
          </>}
          <div className="w-px h-5 bg-white/10" />
          <button onClick={() => setShowDeleteConfirm(true)} disabled={deleting}
            className="cursor-pointer h-8 w-8 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed" title="Xoá storyboard">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {active && <CinematicGenerationStatus status="running" prompt={sb.title} elapsedSeconds={elapsed} progress={sb.progress_message ? [sb.progress_message] : undefined} />}
      {sb.status === 'failed' && sb.public_error && (
        <div className="mx-4 mt-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 flex items-start gap-2 shrink-0">
          <AlertCircle className="h-4 w-4 shrink-0 mt-px" />
          <span><span className="font-semibold">Render thất bại:</span> {sb.public_error}</span>
        </div>
      )}
      {pollTimedOut && active && (
        <div className="mx-4 mt-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2 shrink-0">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Quá thời gian chờ, vui lòng thử lại</span>
        </div>
      )}
      <div className="flex-1 relative">
        {sb.status === 'completed' && showResult && (
          // Scroll viewport on the OUTER wrapper + `m-auto` inner content: centers when it fits,
          // top-aligns & scrolls (never clips the top under the toolbar) when taller than the area.
          <div className="absolute inset-0 z-20 overflow-y-auto bg-zinc-950/85 backdrop-blur-sm">
            <div className="min-h-full flex flex-col p-4 sm:p-6 md:p-8">
              <div className={cn("m-auto w-full", isMultiPanel ? "max-w-6xl" : "max-w-4xl")}>
                {/* Header */}
                <div className="flex items-center justify-between gap-3 mb-4 sm:mb-5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-brand/15 border border-brand/30 text-[10px] font-bold text-brand uppercase tracking-wider shrink-0">
                      {isMultiPanel ? <><Presentation className="h-3 w-3" /> Multi-Panel</> : sb.render_mode === 'single_flow' ? <><Sparkles className="h-3 w-3" /> One-Shot</> : <><Film className="h-3 w-3" /> Ghép cảnh</>}
                    </span>
                    <h2 className="text-base md:text-lg font-bold text-white truncate">{sb.title}</h2>
                  </div>
                  {hasScenes && (
                    <button onClick={() => setShowResult(false)} title="Ẩn kết quả, xem sơ đồ"
                      className="cursor-pointer shrink-0 h-8 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center gap-1.5 text-[11px] font-medium transition-colors">
                      <Film className="h-3.5 w-3.5" /> Sơ đồ
                    </button>
                  )}
                </div>

                {/* Media */}
                {isMultiPanel ? (
                  <div className="grid gap-4 lg:gap-5 lg:grid-cols-2 items-start">
                    <figure className="min-w-0">
                      <figcaption className="flex items-center gap-1.5 mb-2 text-[10px] font-bold uppercase tracking-wider text-brand/90">
                        <Play className="h-3 w-3" /> Video hoàn chỉnh
                      </figcaption>
                      <div className="rounded-2xl overflow-hidden border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.55)] ring-1 ring-brand/15">
                        <MediaViewer src={`/api/storyboards/${uuid}/download`} kind="video" aspectRatio="16:9" controls autoPlay rounded={false} />
                      </div>
                    </figure>
                    <figure className="min-w-0">
                      <figcaption className="flex items-center gap-1.5 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <Presentation className="h-3 w-3" /> Bảng phân cảnh
                      </figcaption>
                      <div className="rounded-2xl overflow-hidden border border-white/10 bg-zinc-950 shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
                        <MediaViewer src={`/api/storyboards/${uuid}/multi-panel`} kind="image" aspectRatio="16:9" fit="contain" controls={false} rounded={false} />
                      </div>
                    </figure>
                  </div>
                ) : (
                  // Cap the hero by viewport-height so a 16:9 video never grows past the fold.
                  <div className="mx-auto w-full" style={{ maxWidth: 'min(100%, calc(64vh * 16 / 9))' }}>
                    <div className="rounded-2xl overflow-hidden border border-white/10 shadow-[0_24px_70px_rgba(0,0,0,0.6)] ring-1 ring-brand/15">
                      <MediaViewer src={`/api/storyboards/${uuid}/download`} kind="video" aspectRatio="16:9" controls autoPlay rounded={false} />
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="mt-4 sm:mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1"><Film className="h-3.5 w-3.5" /> {VIDEO_TYPE_LABELS[sb.video_type] ?? sb.video_type}</span>
                  <span className="text-white/15">·</span>
                  <span>{QUALITY_TIER_LABELS[sb.quality_tier] ?? sb.quality_tier}</span>
                  {typeof sb.total_duration === 'number' && sb.total_duration > 0 && <><span className="text-white/15">·</span><span>{sb.total_duration}s</span></>}
                </div>
              </div>
            </div>
          </div>
        )}
        {hasScenes ? (
          <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes}
            proOptions={{ hideAttribution: true }}
            nodesDraggable={false} nodesConnectable={false} elementsSelectable={false}
            fitView fitViewOptions={{ maxZoom: 1, padding: 0.3 }} minZoom={0.08} maxZoom={2}>
            <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#ffffff06" />
            <Controls className={cn(
              "!bg-[#18181B] !border !border-white/[0.08] !rounded-2xl !shadow-md !overflow-hidden",
              "[&_button]:!bg-[#18181B] [&_button]:!border-b [&_button]:!border-white/[0.08] last:[&_button]:!border-b-0",
              "[&_svg]:!fill-slate-400 hover:[&_svg]:!fill-white",
              "hover:[&_button]:!bg-white/[0.06] [&_button]:!transition-colors",
            )} position="bottom-right" showInteractive={false} />
            <MiniMap className="!bg-[#18181B] !border-white/[0.08] !rounded-2xl" nodeColor="#FF5A1F40" maskColor="#000" position="bottom-left" />
            <Panel position="top-right">
              <div className="bg-[#18181B] border border-white/[0.06] rounded-2xl p-3 text-[10px] space-y-1.5 text-slate-400 shadow-sm">
                <div className="flex items-center gap-2 text-slate-400"><Film className="h-3 w-3" /> {VIDEO_TYPE_LABELS[sb.video_type] ?? sb.video_type}</div>
                <div>CL: {QUALITY_TIER_LABELS[sb.quality_tier] ?? sb.quality_tier}</div>
              </div>
            </Panel>
          </ReactFlow>
        ) : (
          // One-shot / multi-panel storyboards have no scene graph — show an info panel instead of a blank canvas.
          !(sb.status === 'completed' && showResult) && (
            <div className="absolute inset-0 flex items-center justify-center p-8 [background-image:radial-gradient(circle_at_1px_1px,#ffffff06_1px,transparent_0)] [background-size:24px_24px]">
              <div className="max-w-md w-full text-center">
                <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center">
                  {isMultiPanel ? <Presentation className="h-6 w-6 text-brand" /> : <Sparkles className="h-6 w-6 text-brand" />}
                </div>
                <h3 className="text-sm font-bold text-slate-200 mb-1">{isMultiPanel ? 'Chế độ Multi-Panel' : sb.render_mode === 'single_flow' ? 'Chế độ One-Shot' : 'Chưa có cảnh'}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">Storyboard này tạo video từ một prompt tổng hợp — không dùng sơ đồ cảnh. Kết quả sẽ hiển thị tại đây khi hoàn thành.</p>
                {sb.compiled_prompt && (
                  <div className="mt-4 text-left rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
                    <p className="text-[10px] uppercase tracking-wider text-slate-600 mb-1 font-bold">Prompt tổng hợp</p>
                    <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-4">{sb.compiled_prompt}</p>
                  </div>
                )}
              </div>
            </div>
          )
        )}
      </div>
      <div className="h-8 flex items-center justify-between px-4 border-t border-white/[0.06] bg-[#18181B] shrink-0 z-10">
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-600">Xem trước</span>
          {hasScenes && <>
            <div className="h-3 w-px bg-white/5" />
            <button onClick={handlePlayback} disabled={playbackActive}
              className={cn("cursor-pointer flex items-center gap-1 text-[10px] transition-colors", playbackActive ? "text-[#FF5A1F]" : "text-slate-600 hover:text-slate-400")}>
              <Presentation className="h-3 w-3" /> {playbackActive ? 'Đang trình chiếu...' : 'Trình chiếu'}
            </button>
          </>}
        </div>
        <div className="flex items-center gap-3 text-[10px] text-slate-600">
          <span>{sb.scenes?.length || 0} cảnh</span><div className="w-px h-3 bg-white/5" /><span>{QUALITY_TIER_LABELS[sb.quality_tier] ?? sb.quality_tier}</span>
        </div>
      </div>
      <VoiceoverModal
        open={voiceoverOpen}
        onClose={() => setVoiceoverOpen(false)}
        storyboardUuid={sb.uuid}
        defaultText={sb.narration || ''}
        onSuccess={(url) => { addToast('Đã thêm giọng đọc thành công', 'success'); fetch(true); }}
      />

      {/* Delete confirm modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-zinc-950/70 backdrop-blur-md z-[200] flex items-center justify-center p-4"
            onClick={() => setShowDeleteConfirm(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="w-full max-w-sm bg-zinc-950 border border-white/10 rounded-2xl p-6 shadow-md"
              onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-white mb-2">Xoá storyboard?</h3>
              <p className="text-sm text-slate-400 mb-6">Xoá vĩnh viễn storyboard và tất cả tài nguyên liên quan.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteConfirm(false)} disabled={deleting}
                  className="flex-1 h-11 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm transition-all cursor-pointer disabled:opacity-50">Huỷ</button>
                <button onClick={async () => {
                  setDeleting(true);
                  try {
                    await laravel.deleteStoryboard(uuid);
                    addToast('Đã xoá storyboard', 'success');
                    router.push('/projects');
                  } catch (e: any) {
                    addToast(e?.message || 'Lỗi khi xoá', 'error');
                    setShowDeleteConfirm(false);
                  } finally {
                    setDeleting(false);
                  }
                }} disabled={deleting}
                  className="flex-1 h-11 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-all cursor-pointer disabled:opacity-50">
                  {deleting ? 'Đang xoá...' : 'Xác nhận xoá'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
