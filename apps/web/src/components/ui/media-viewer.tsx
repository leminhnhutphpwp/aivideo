'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Play, Music, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { resolveAssetUrl, useAuthenticatedMedia } from '@/hooks/use-authenticated-media';

export type MediaKind = 'video' | 'image' | 'audio';

interface MediaViewerProps {
  /** Asset path (`/api/assets/..`) or absolute URL for the main media. */
  src: string | null;
  /** Optional poster/thumbnail path or URL (for video). */
  thumbnail?: string | null;
  kind: MediaKind;
  /** e.g. "16:9", "9:16", "1:1" — applied via inline style so runtime values are honored. */
  aspectRatio?: string | null;
  /** Show native controls (video/audio). */
  controls?: boolean;
  /** Autoplay muted loop (video) — good for a hero. */
  autoPlay?: boolean;
  /** Play on hover, pause on leave (video) — good for cards/grids. */
  hoverPlay?: boolean;
  /** object-fit for image/video. */
  fit?: 'cover' | 'contain';
  className?: string;
  rounded?: boolean;
}

/** Convert "16:9" → "16 / 9" for CSS aspect-ratio (Tailwind JIT can't build runtime `aspect-[x]`). */
export function toCssRatio(ratio?: string | null): string | undefined {
  if (!ratio) return undefined;
  const m = ratio.match(/^(\d+)\s*[:/]\s*(\d+)$/);
  return m ? `${m[1]} / ${m[2]}` : undefined;
}

/**
 * Single source of truth for rendering a finished asset (video/image/audio). Handles auth blob
 * fetch, correct aspect ratio, hover/auto play, and graceful loading/empty states — replacing the
 * three divergent viewers previously copy-pasted across task-card / job-history / assets.
 */
export function MediaViewer({
  src,
  thumbnail,
  kind,
  aspectRatio,
  controls = true,
  autoPlay = false,
  hoverPlay = false,
  fit = 'cover',
  className,
  rounded = true,
}: MediaViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hovered, setHovered] = useState(false);

  const mediaUrl = resolveAssetUrl(src);
  const thumbUrl = resolveAssetUrl(thumbnail ?? null);
  const mediaBlob = useAuthenticatedMedia(mediaUrl);
  const thumbBlob = useAuthenticatedMedia(thumbUrl);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || kind !== 'video' || !hoverPlay) return;
    if (hovered) {
      v.currentTime = 0;
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [hovered, hoverPlay, kind]);

  const style: React.CSSProperties = {};
  const css = toCssRatio(aspectRatio);
  if (css) style.aspectRatio = css;

  const fitClass = fit === 'cover' ? 'object-cover' : 'object-contain';
  const loading = !mediaBlob && kind !== 'audio';

  return (
    <div
      onMouseEnter={hoverPlay ? () => setHovered(true) : undefined}
      onMouseLeave={hoverPlay ? () => setHovered(false) : undefined}
      style={style}
      className={cn(
        'relative w-full overflow-hidden bg-[#16141a] flex items-center justify-center',
        rounded && 'rounded-2xl',
        className,
      )}
    >
      {kind === 'video' && (
        <video
          ref={videoRef}
          src={mediaBlob || undefined}
          poster={thumbBlob || undefined}
          muted={autoPlay || hoverPlay}
          loop={autoPlay || hoverPlay}
          autoPlay={autoPlay}
          playsInline
          controls={controls && !hoverPlay}
          controlsList="nodownload"
          onContextMenu={(e) => e.preventDefault()}
          className={cn('w-full h-full', fitClass)}
        />
      )}

      {kind === 'image' && (
        mediaBlob ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaBlob} alt="" className={cn('w-full h-full', fitClass)} onContextMenu={(e) => e.preventDefault()} />
        ) : (
          <ImageIcon className="h-10 w-10 text-white/10" />
        )
      )}

      {kind === 'audio' && (
        <div className="w-full flex flex-col items-center justify-center gap-3 p-6">
          <div className="h-14 w-14 rounded-full bg-[color:var(--color-brand,#FF5A1F)]/15 flex items-center justify-center">
            <Music className="h-6 w-6 text-[color:var(--color-brand,#FF5A1F)]" />
          </div>
          <audio src={mediaBlob || undefined} controls className="w-full max-w-sm" />
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#16141a]/60 backdrop-blur-sm">
          {kind === 'video'
            ? <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center"><Play className="h-4 w-4 text-white/40" /></div>
            : <div className="h-6 w-6 rounded-full border-2 border-white/10 border-t-white/40 animate-spin" />}
        </div>
      )}
    </div>
  );
}
