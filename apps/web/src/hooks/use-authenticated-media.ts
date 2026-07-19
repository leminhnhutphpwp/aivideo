'use client';

import { useEffect, useRef, useState } from 'react';

const LARAVEL_URL = process.env.NEXT_PUBLIC_LARAVEL_URL || 'http://localhost:8000';

/**
 * Resolve an asset path to an absolute, fetchable URL.
 * Backend asset URLs come as `/api/assets/{uuid}/download` (auth-gated) — prefix the Laravel host.
 */
export function resolveAssetUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('/api/')) return `${LARAVEL_URL}${url}`;
  return url;
}

/**
 * Fetch an auth-gated media URL (needs a Bearer token the daemon/browser <img>/<video> can't send)
 * and expose it as an object-URL blob. Revokes previous blobs and cleans up on unmount.
 * Returns null while loading or on failure.
 */
export function useAuthenticatedMedia(url: string | null): string | null {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const prevBlobUrl = useRef<string | null>(null);

  useEffect(() => {
    if (!url || !url.startsWith('http')) {
      setBlobUrl(null);
      return;
    }

    let cancelled = false;
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
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
