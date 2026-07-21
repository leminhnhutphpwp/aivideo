'use client';

import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

let echoInstance: Echo<'reverb'> | null = null;

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

export function getEcho(): Echo<'reverb'> | null {
  if (echoInstance) return echoInstance;

  const key = process.env.NEXT_PUBLIC_REVERB_APP_KEY;
  const laravelUrl = process.env.NEXT_PUBLIC_LARAVEL_URL || 'http://localhost:8000';
  const wsHost = process.env.NEXT_PUBLIC_REVERB_HOST || 'localhost:8080';
  const scheme = process.env.NEXT_PUBLIC_REVERB_SCHEME || 'http';

  if (!key) return null;

  Pusher.logToConsole = false;

  echoInstance = new Echo({
    broadcaster: 'reverb',
    key,
    wsHost: wsHost.split(':')[0],
    wsPort: Number(wsHost.split(':')[1] || 8080),
    wssPort: 443,
    forceTLS: scheme === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: `${laravelUrl}/api/broadcasting/auth`,
    auth: {
      headers: {
        // Getter so every /api/broadcasting/auth request reads the CURRENT
        // token — survives the ~50-min refresh without tearing down the socket.
        get Authorization() {
          return `Bearer ${getToken()}`;
        },
        Accept: 'application/json',
      },
    },
  });

  return echoInstance;
}

/**
 * Disconnect and drop the singleton so the next `getEcho()` rebuilds a fresh
 * socket. Call on logout (drops the previous user's connection + channel
 * subscriptions); the header getter above already covers token refresh.
 */
export function resetEcho(): void {
  if (echoInstance) {
    echoInstance.disconnect();
    echoInstance = null;
  }
}

export function subscribeStoryboard(
  storyboardUuid: string,
  callbacks: {
    onProgress?: (data: { uuid: string; status: string; progress_message: string | null; updated_at: string }) => void;
  },
): (() => void) | null {
  const echo = getEcho();
  if (!echo) return null;

  const channel = echo.private(`storyboard.${storyboardUuid}`);

  if (callbacks.onProgress) channel.listen('.storyboard.progress.updated', callbacks.onProgress);

  return () => {
    if (callbacks.onProgress) channel.stopListening('.storyboard.progress.updated');
    echo.leave(`storyboard.${storyboardUuid}`);
  };
}

export function subscribeUserJobs(userUuid: string, callbacks: {
  onProgress?: (data: any) => void;
  onCompleted?: (data: any) => void;
  onFailed?: (data: any) => void;
  onQueued?: (data: any) => void;
  /** `.credits.updated` payload: `{ balance: number }`. */
  onCredits?: (data: { balance: number }) => void;
  /** `.job.cancelled` payload: RenderJob props (e.g. `{ renderJob: { uuid, ... } }`). */
  onCancelled?: (data: any) => void;
}): (() => void) | null {
  const echo = getEcho();
  if (!echo) return null;

  const channel = echo.private(`user.${userUuid}`);

  if (callbacks.onQueued) channel.listen('.job.queued', callbacks.onQueued);
  if (callbacks.onProgress) channel.listen('.job.progress', callbacks.onProgress);
  if (callbacks.onCompleted) channel.listen('.job.completed', callbacks.onCompleted);
  if (callbacks.onFailed) channel.listen('.job.failed', callbacks.onFailed);
  if (callbacks.onCancelled) channel.listen('.job.cancelled', callbacks.onCancelled);
  if (callbacks.onCredits) channel.listen('.credits.updated', callbacks.onCredits);

  return () => {
    if (callbacks.onQueued) channel.stopListening('.job.queued');
    if (callbacks.onProgress) channel.stopListening('.job.progress');
    if (callbacks.onCompleted) channel.stopListening('.job.completed');
    if (callbacks.onFailed) channel.stopListening('.job.failed');
    if (callbacks.onCancelled) channel.stopListening('.job.cancelled');
    if (callbacks.onCredits) channel.stopListening('.credits.updated');
    echo.leave(`user.${userUuid}`);
  };
}
