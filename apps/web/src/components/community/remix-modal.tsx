'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Copy, Heart, Share2, Award, Zap, Sparkles, Sliders, Check, MessageCircle, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { AssetCard } from '@/lib/api/community-types';
import { CreatorLevelBadge } from './creator-level-badge';
import { CommentSection } from './comment-section';
import { ShareButtons } from './share-buttons';
import { laravel, LARAVEL_URL } from '@/lib/api/client';
import { useToastStore } from '@/stores/toast-store';
import { useScrollLock } from '@/hooks/use-scroll-lock';
import { noDownloadImg, noDownloadVideo } from '@/lib/media-protection';

function resolveAssetUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('/api/')) return `${LARAVEL_URL}${url}`;
  return url;
}

function useAuthenticatedMedia(url: string | null): string | null {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const prevBlobUrl = useRef<string | null>(null);

  useEffect(() => {
    if (!url || !url.startsWith('http')) {
      setBlobUrl(null);
      return;
    }

    let cancelled = false;
    const token = localStorage.getItem('auth_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch(url, { headers })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then(blob => {
        if (cancelled) return;
        if (prevBlobUrl.current) URL.revokeObjectURL(prevBlobUrl.current);
        const newBlobUrl = URL.createObjectURL(blob);
        prevBlobUrl.current = newBlobUrl;
        setBlobUrl(newBlobUrl);
      })
      .catch(() => {
        if (!cancelled) setBlobUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  useEffect(() => {
    return () => {
      if (prevBlobUrl.current) URL.revokeObjectURL(prevBlobUrl.current);
    };
  }, []);

  return blobUrl;
}

function getProjectLabel(asset: AssetCard): string {
  const cap = asset.capability || '';
  if (asset.asset_type === 'image') {
    if (cap.startsWith('i2i') || cap === 'image_editing') return 'Chỉnh sửa ảnh AI';
    if (cap.startsWith('t2i') || cap === 'image_generation') return 'Tạo ảnh AI';
    return 'Tạo ảnh AI';
  }
  if (asset.asset_type === 'video') {
    if (cap === 'i2v' || cap === 'image_to_video') return 'Tạo video từ ảnh AI';
    if (cap === 't2v' || cap === 'text_to_video') return 'Tạo video AI';
    if (cap === 'r2v' || cap === 'reference_to_video') return 'Tạo video từ tham chiếu AI';
    if (cap === 'video_edit') return 'Chỉnh sửa video AI';
    return 'Tạo video AI';
  }
  return 'Tác phẩm AI';
}

function ReferenceImagesGallery({ urls }: { urls: string[] }) {
  return (
    <div className="space-y-2.5 mb-6">
      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-mono px-1">
        <ImageIcon className="h-3.5 w-3.5 text-[#FF5A1F]" /> Ảnh tham chiếu ({urls.length})
      </span>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {urls.map((refUrl, idx) => (
          <ReferenceImage key={idx} url={refUrl} index={idx} />
        ))}
      </div>
    </div>
  );
}

function ReferenceImage({ url, index }: { url: string; index: number }) {
  const resolvedUrl = resolveAssetUrl(url);
  const blobUrl = useAuthenticatedMedia(resolvedUrl);

  return (
    <div className="shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-white/12 bg-[#1f1c25]">
      <img
        src={blobUrl || resolvedUrl || url}
        alt={`Reference ${index + 1}`}
        className="w-full h-full object-cover"
      />
    </div>
  );
}

interface RemixModalProps {
  asset: AssetCard | null;
  isOpen: boolean;
  onClose: () => void;
  onLikeChange?: (uuid: string, liked: boolean) => void;
}

export function RemixModal({ asset, isOpen, onClose, onLikeChange }: RemixModalProps) {
  const router = useRouter();
  const [isCopied, setIsCopied] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isLoadingRemix, setIsLoadingRemix] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const addToast = useToastStore(s => s.addToast);

  useScrollLock(isOpen);

  useEffect(() => {
    if (asset) {
      setLikeCount(asset.like_count);
      setIsLiked(asset.liked_by_me ?? false);
    }
  }, [asset]);

  if (!isOpen || !asset) return null;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(asset.prompt);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleRemix = async () => {
    setIsLoadingRemix(true);
    try {
      // Track asset usage before redirecting
      await laravel.communityUseAsset(asset.uuid);
    } catch (error) {
      console.error('Failed to track asset usage:', error);
      // Don't block remix if tracking fails
    }

    const params = new URLSearchParams({
      remix_prompt: asset.prompt,
      remix_aspect: asset.aspect_ratio,
    });

    onClose();
    router.push(`/studio/text-to-video?${params.toString()}`);
  };

  const handleLikeToggle = async () => {
    const previousLiked = isLiked;
    const previousCount = likeCount;
    try {
      const result = await laravel.communityLike(asset.uuid);
      setIsLiked(result.data.liked);
      setLikeCount(result.data.count);

      // Sync like change to parent component (community card)
      if (onLikeChange) {
        onLikeChange(asset.uuid, result.data.liked);
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
      setIsLiked(previousLiked);
      setLikeCount(previousCount);
      addToast('Không thể thực hiện thao tác. Vui lòng thử lại sau.', 'error');
    }
  };

  const handleShare = () => {
    // ShareButtons handles the sharing logic
  };

  const isVideo = asset.asset_type === 'video';
  const isImage = asset.asset_type === 'image';
  const resolvedMediaUrl = resolveAssetUrl(asset.output_path);
  const resolvedThumbnailUrl = resolveAssetUrl(asset.thumbnail_path);
  // Fetch through the authenticated blob mechanism (adds the Bearer token).
  // Never fall back to the raw /api/assets/.../download URL as an <img>/<video>
  // src: a plain element request carries no Authorization header and the API
  // 302-redirects to /login, producing a broken image inside the modal.
  const mediaBlobUrl = useAuthenticatedMedia(resolvedMediaUrl);
  const thumbnailBlobUrl = useAuthenticatedMedia(resolvedThumbnailUrl);
  // Full-res media first, thumbnail as a graceful fallback (mirrors the card).
  const imageSrc = mediaBlobUrl || thumbnailBlobUrl;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6 lg:p-6 select-none">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#16141a]/80 backdrop-blur-md"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        className="relative z-10 w-full max-w-[1100px] h-[90vh] md:h-[80vh] bg-[#16141a]/90 border border-white/12 shadow-[0_0_80px_rgba(0,0,0,0.8)] rounded-2xl overflow-hidden flex flex-col md:flex-row backdrop-blur-xl"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 h-10 w-10 rounded-full bg-[#16141a]/60 hover:bg-white/10 text-slate-400 hover:text-white border border-white/12 flex items-center justify-center transition-all cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex-1 md:flex-[1.3] bg-[#16141a] flex items-center justify-center relative overflow-hidden h-[45%] md:h-full border-b md:border-b-0 md:border-r border-white/12">
          {isVideo ? (
            <video
              src={mediaBlobUrl || undefined}
              poster={thumbnailBlobUrl || undefined}
              autoPlay
              controls
              loop
              {...noDownloadVideo}
              className="w-full h-full object-contain"
            />
          ) : imageSrc ? (
            <img
              src={imageSrc}
              alt={asset.title}
              {...noDownloadImg}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 text-slate-500">
              <div className="h-8 w-8 rounded-full border-2 border-white/10 border-t-[#FF5A1F] animate-spin" />
              <span className="text-[11px] font-mono uppercase tracking-wider">Đang tải ảnh…</span>
            </div>
          )}

          <div className="absolute top-4 left-4 z-10">
            {asset.visibility === 'public' ? (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 text-black text-[10px] font-black uppercase tracking-wider shadow-sm">
                <Award className="h-3.5 w-3.5" />
                Premium Asset
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
                Free Sharing
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col h-[55%] md:h-full p-6 md:p-6 overflow-y-auto custom-scrollbar bg-gradient-to-b from-[#050508]/40 to-[#0c0c10]">
          <div className="mb-6">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] font-mono">
              Chi tiết tác phẩm
            </span>
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight mt-1 line-clamp-1">
              {getProjectLabel(asset)}
            </h2>
          </div>

          <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/12 mb-6">
            <div className="flex items-center gap-3">
              <img
                src={asset.user?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&auto=format&fit=crop'}
                alt={asset.user?.username || 'unknown'}
                className="h-10 w-10 rounded-full object-cover border border-white/10"
              />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white">@{asset.user?.username || 'unknown'}</span>
              </div>
            </div>
            <CreatorLevelBadge level={asset.user?.reputation_level || 'newbie'} />
          </div>

          <div className="space-y-2.5 mb-6">
            <div className="flex justify-between items-center px-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <Sparkles className="h-3.5 w-3.5 text-[#FF5A1F]" /> Prompt Gốc
              </span>
              <button
                onClick={handleCopyPrompt}
                className="text-[10px] font-bold text-[#FF5A1F] hover:brightness-125 flex items-center gap-1.5 transition-all uppercase tracking-wider cursor-pointer"
              >
                {isCopied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    Đã copy
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy prompt
                  </>
                )}
              </button>
            </div>
            <div className="w-full bg-[#16141a] border border-white/12 rounded-2xl p-4 text-xs font-mono text-slate-300 leading-relaxed text-left min-h-[90px] relative overflow-hidden select-text">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#FF5A1F]" />
              {asset.prompt}
            </div>
          </div>

          {/* Reference Images */}
          {asset.reference_images && asset.reference_images.length > 0 && (
            <ReferenceImagesGallery urls={asset.reference_images} />
          )}

          <div className="mb-6">
            <div className="flex items-center gap-4 text-[11px] text-slate-400 font-mono">
              <span className="flex items-center gap-1.5">
                <Sliders className="h-3 w-3 text-[#FF5A1F]" />
                {asset.aspect_ratio}
              </span>
              <span className="w-px h-3 bg-white/10" />
              <span>{asset.resolution}</span>
              {isVideo && (
                <>
                  <span className="w-px h-3 bg-white/10" />
                  <span>{asset.duration_seconds ?? '--'}s</span>
                </>
              )}
            </div>
          </div>

          <div className="space-y-3 mb-8">
            <div className="flex gap-2">
              <button
                onClick={handleLikeToggle}
                className={cn(
                  "flex-1 h-11 rounded-xl border border-white/12 hover:border-[#FF5A1F]/30 bg-white/[0.01] hover:bg-[#FF5A1F]/[0.02] text-slate-300 hover:text-white flex items-center justify-center gap-2 transition-all cursor-pointer font-bold text-xs uppercase tracking-wider",
                  isLiked && "border-[#FF5A1F]/30 bg-[#FF5A1F]/[0.04] text-[#FF5A1F]"
                )}
              >
                <Heart className={cn("h-4 w-4", isLiked && "fill-[#FF5A1F]")} />
                {isLiked ? 'Đã lưu' : `Yêu thích (${likeCount})`}
              </button>

              <button
                onClick={() => setShowComments(!showComments)}
                className={cn(
                  "h-11 px-4 rounded-xl border border-white/12 hover:border-white/20 bg-white/[0.01] hover:bg-white/[0.03] flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                  showComments ? "border-[#FF5A1F]/30 text-[#FF5A1F]" : "text-slate-400 hover:text-white"
                )}
              >
                <MessageCircle className="h-4 w-4" />
                {asset.comment_count != null && asset.comment_count > 0 && (
                  <span className="text-[10px] font-bold">{asset.comment_count}</span>
                )}
              </button>
            </div>

            <ShareButtons
              url={`${window.location.origin}/community?asset=${asset.uuid}`}
              title={asset.title}
            />
          </div>

          {/* Comments Section */}
          <CommentSection assetUuid={asset.uuid} isOpen={showComments} />

          <div className="mt-auto">
            <button
              onClick={handleRemix}
              disabled={isLoadingRemix}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#FF5A1F] to-[#FF8A5B] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-sm uppercase tracking-widest shadow-[0_15px_30px_rgba(255,90,31,0.25)] hover:shadow-[0_20px_40px_rgba(255,90,31,0.35)] transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2 group"
            >
              <Sparkles className="h-5 w-5 text-white animate-pulse" />
              {isLoadingRemix ? 'Đang xử lý...' : 'Remix với prompt này'}
            </button>
            <p className="text-[10px] text-center text-slate-500 font-medium tracking-tight mt-2.5 uppercase font-mono">
              Hệ thống tự động sao chép prompt và thông số vào Studio của bạn
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
