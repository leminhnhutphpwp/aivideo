import { Clock, Loader2 } from 'lucide-react';

export type UnifiedProjectType = 'storyboard' | 'video' | 'image' | 'audio' | 'other';
export type UnifiedStatus = 'draft' | 'analyzing' | 'analyzed' | 'processing' | 'done' | 'failed' | 'queued';

export interface UnifiedProject {
  id: string;
  source: 'storyboard' | 'daemon';
  type: UnifiedProjectType;
  title: string;
  status: UnifiedStatus;
  statusLabel: string;
  createdAt: string | number;
  updatedAt: string | number;
  href: string;
  hasThumbnail: boolean;
  thumbnailUrl?: string | null;
  storyboard?: {
    uuid: string;
    scenesCount: number;
    creditsCost: number;
    totalDuration: number | null;
    qualityTier: string;
    videoType: string;
    renderMode: string;
    outputPath: string | null;
  };
  daemon?: {
    projectId: string;
    surface: string | null;
    lastTaskStatus: string | null;
    lastTaskFile: string | null;
  };
}

export const STATUS_CONFIG: Record<UnifiedStatus, { label: string; color: string; icon: typeof Loader2 | typeof Clock | null }> = {
  draft:     { label: 'Bản nháp',      color: 'bg-slate-500/20 text-slate-400',          icon: null },
  analyzing: { label: 'Đang phân tích', color: 'bg-[#FF5A1F]/20 text-[#FF8A5B]',       icon: Loader2 },
  analyzed:  { label: 'Đã phân tích',  color: 'bg-emerald-500/20 text-emerald-400',     icon: null },
  processing:{ label: 'Đang xử lý',    color: 'bg-orange-500/20 text-orange-400',       icon: Loader2 },
  done:      { label: 'Hoàn thành',    color: 'bg-emerald-500/20 text-emerald-400',     icon: null },
  failed:    { label: 'Thất bại',      color: 'bg-red-500/20 text-red-400',             icon: null },
  queued:    { label: 'Đang chờ',      color: 'bg-amber-500/20 text-amber-400',         icon: Clock },
};

export const TYPE_CONFIG: Record<UnifiedProjectType, { label: string; color: string }> = {
  storyboard: { label: 'Storyboard', color: 'bg-[#FF5A1F]' },
  video:   { label: 'Video',   color: 'bg-blue-500' },
  image:   { label: 'Hình ảnh', color: 'bg-emerald-500' },
  audio:   { label: 'Âm thanh', color: 'bg-purple-500' },
  other:   { label: 'Khác',    color: 'bg-slate-500' },
};

export const FILTER_TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'storyboard', label: 'Storyboard' },
  { key: 'video', label: 'Video' },
  { key: 'image', label: 'Hình ảnh' },
  { key: 'audio', label: 'Âm thanh' },
];

export const VALID_TYPE_KEYS = new Set<string>(['all', 'storyboard', 'video', 'image', 'audio']);
