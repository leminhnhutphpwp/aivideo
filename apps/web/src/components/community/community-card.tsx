'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Heart, Play, Eye, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { AssetCard } from '@/lib/api/community-types';
import { CreatorLevelBadge } from './creator-level-badge';
import { useToastStore } from '@/stores/toast-store';
import { noDownloadImg, noDownloadVideo } from '@/lib/media-protection';

const LARAVEL_URL = process.env.NEXT_PUBLIC_LARAVEL_URL || 'http://localhost:8000';

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

interface CommunityCardProps {
  asset: AssetCard;
  onOpenDetails: (asset: AssetCard) => void;
  onLikeChange?: (uuid: string, liked: boolean) => void;
}

export function CommunityCard({ asset, onOpenDetails, onLikeChange }: CommunityCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isLiked, setIsLiked] = useState(asset.liked_by_me ?? false);
  const [likeCount, setLikeCount] = useState(asset.like_count);
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const heartIdCounter = useRef(0);
  const addToast = useToastStore(s => s.addToast);

  const isVideo = asset.asset_type === 'video';
  const mediaUrl = resolveAssetUrl(asset.output_path);
  const thumbnailUrl = resolveAssetUrl(asset.thumbnail_path);
  const mediaBlobUrl = useAuthenticatedMedia(mediaUrl);
  const thumbnailBlobUrl = useAuthenticatedMedia(thumbnailUrl);

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (!isLiked) {
      setIsLiked(true);
      setLikeCount(prev => prev + 1);
      if (onLikeChange) onLikeChange(asset.uuid, true);
    }

    const newHeart = { id: heartIdCounter.current++, x, y };
    setHearts(prev => [...prev, newHeart]);

    setTimeout(() => {
      setHearts(prev => prev.filter(h => h.id !== newHeart.id));
    }, 1000);
  };

  const handleSingleClick = () => {
    onOpenDetails(asset);
  };

  const handleLikeToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLikeLoading) return;
    setIsLikeLoading(true);
    const previousLiked = isLiked;
    const previousCount = likeCount;
    const nextState = !isLiked;
    setIsLiked(nextState);
    setLikeCount(prev => prev + (nextState ? 1 : -1));
    if (onLikeChange) onLikeChange(asset.uuid, nextState);

    try {
      const { laravel } = await import('@/lib/api/client');
      const result = await laravel.communityLike(asset.uuid);
      setIsLiked(result.data.liked);
      setLikeCount(result.data.count);
      if (onLikeChange) onLikeChange(asset.uuid, result.data.liked);
    } catch (error) {
      console.error('Failed to toggle like:', error);
      setIsLiked(previousLiked);
      setLikeCount(previousCount);
      if (onLikeChange) onLikeChange(asset.uuid, previousLiked);
      addToast('Không thể thực hiện thao tác. Vui lòng thử lại sau.', 'error');
    } finally {
      setIsLikeLoading(false);
    }
  };

  const handleMouseEnter = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => {
      setIsHovered(true);
    }, 300);
  };

  const handleMouseLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setIsHovered(false);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isHovered && isVideo) {
      video.currentTime = 0;
      video.play().catch(() => { });
    } else {
      video.pause();
    }
  }, [isHovered, isVideo]);

  const formatNum = (num: number) => {
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num;
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onDoubleClick={handleDoubleClick}
      onClick={handleSingleClick}
      className="group relative rounded-2xl bg-[#16141a]/80 border border-white/12 hover:border-brand/30 hover:shadow-[0_0_30px_rgba(255,90,31,0.06)] overflow-hidden cursor-pointer transition-all duration-300 select-none animate-item-rise"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#16141a] flex items-center justify-center">
        {isVideo ? (
          <video
            ref={videoRef}
            src={mediaBlobUrl || undefined}
            poster={thumbnailBlobUrl || undefined}
            muted
            loop
            playsInline
            {...noDownloadVideo}
            className="w-full h-full object-cover"
          />
        ) : (
          <img
            src={thumbnailBlobUrl || mediaBlobUrl || `https://images.unsplash.com/photo-1578894381163-e72c17f2d45f?q=80&w=600&auto=format&fit=crop`}
            alt={asset.title}
            className={cn(
              "w-full h-full object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)]",
              isHovered ? "scale-[1.05]" : "scale-100"
            )}
            loading="lazy"
            {...noDownloadImg}
          />
        )}

        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          {asset.visibility === 'public' ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/90 text-black text-[9px] font-extrabold uppercase tracking-wider backdrop-blur-md">
              <Award className="h-3 w-3" />
              Premium
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/80 text-white text-[9px] font-extrabold uppercase tracking-wider backdrop-blur-md">
              Free
            </span>
          )}

          {isVideo && !isHovered && (
            <div className="h-7 w-7 rounded-full bg-[#16141a]/60 border border-white/10 flex items-center justify-center backdrop-blur-md">
              <Play className="h-3.5 w-3.5 text-white fill-white ml-0.5" />
            </div>
          )}
        </div>

        <AnimatePresence>
          {hearts.map(heart => (
            <motion.div
              key={heart.id}
              initial={{ opacity: 1, scale: 0.5, x: heart.x - 12, y: heart.y - 12 }}
              animate={{ opacity: 0, scale: 1.8, y: heart.y - 80, rotate: Math.random() * 30 - 15 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="absolute pointer-events-none z-20"
            >
              <Heart className="h-7 w-7 text-brand fill-brand filter drop-shadow-[0_0_8px_#FF5A1F]" />
            </motion.div>
          ))}
        </AnimatePresence>

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent opacity-60 group-hover:opacity-80 transition-opacity pointer-events-none" />
      </div>

      <div className="p-4 space-y-3.5 relative bg-gradient-to-b from-transparent to-[#050508]">
        <p className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors line-clamp-2 leading-relaxed font-sans">
          {asset.title}
        </p>

        {asset.tags && asset.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {asset.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/12 text-[9px] font-bold text-slate-500 uppercase tracking-wider"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-1 border-t border-white/12">
          <Link
            href={`/community/creators/${asset.user?.username || 'unknown'}`}
            className="flex items-center gap-2 cursor-pointer group/author"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={asset.user?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&auto=format&fit=crop'}
              alt={asset.user?.username || 'unknown'}
              className="h-6 w-6 rounded-full object-cover border border-white/10"
            />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-200 group-hover/author:text-brand transition-colors leading-tight">
                @{asset.user?.username || 'unknown'}
              </span>
              <CreatorLevelBadge level={asset.user?.reputation_level || 'newbie'} className="text-[8px] px-1.5 py-0" />
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={handleLikeToggle}
              className={cn(
                "flex items-center gap-1.5 text-slate-500 hover:text-brand transition-colors cursor-pointer",
                isLiked && "text-brand"
              )}
            >
              <Heart className={cn("h-4 w-4 transition-transform active:scale-75", isLiked && "fill-brand")} />
              <span className="text-[10px] font-extrabold tracking-tight">
                {formatNum(likeCount)}
              </span>
            </button>

            <div className="flex items-center gap-1.5 text-slate-500 cursor-pointer">
              <Eye className="h-4 w-4" />
              <span className="text-[10px] font-extrabold tracking-tight">
                {formatNum(asset.usage_count)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
