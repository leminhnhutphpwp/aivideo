'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

/**
 * Cloudflare Turnstile widget (Layer 3 — human verification).
 *
 * Env-gated fail-open: when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is unset the widget
 * renders nothing and immediately calls `onToken(null)` — Laravel skips Turnstile
 * verification when its secret is empty too, so dev UX is unchanged.
 */

interface TurnstileRenderOptions {
  sitekey: string;
  callback?: (token: string) => void;
  'expired-callback'?: () => void;
  'error-callback'?: () => void;
  'timeout-callback'?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact' | 'flexible';
}

interface TurnstileApi {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

/** Load the Turnstile script exactly once per page. */
let scriptPromise: Promise<void> | null = null;
function loadTurnstileScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-turnstile]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Turnstile script failed')));
      return;
    }
    const s = document.createElement('script');
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.setAttribute('data-turnstile', '');
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Turnstile script failed'));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export interface TurnstileHandle {
  /** Reset the challenge and clear the current token. */
  reset: () => void;
}

interface TurnstileWidgetProps {
  /** Receives the token on success, or `null` on expire/error/reset (or when disabled). */
  onToken: (token: string | null) => void;
  className?: string;
  theme?: 'light' | 'dark' | 'auto';
}

export const TurnstileWidget = forwardRef<TurnstileHandle, TurnstileWidgetProps>(
  function TurnstileWidget({ onToken, className, theme = 'dark' }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const onTokenRef = useRef(onToken);
    onTokenRef.current = onToken;

    useImperativeHandle(
      ref,
      () => ({
        reset: () => {
          if (widgetIdRef.current && window.turnstile) {
            window.turnstile.reset(widgetIdRef.current);
            onTokenRef.current(null);
          }
        },
      }),
      [],
    );

    useEffect(() => {
      // Dev fail-open — no site key configured: report null, render nothing.
      if (!SITE_KEY) {
        onTokenRef.current(null);
        return;
      }
      let cancelled = false;
      loadTurnstileScript()
        .then(() => {
          if (cancelled || widgetIdRef.current || !containerRef.current || !window.turnstile) return;
          widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: SITE_KEY,
            theme,
            callback: (token: string) => onTokenRef.current(token),
            'expired-callback': () => onTokenRef.current(null),
            'error-callback': () => onTokenRef.current(null),
            'timeout-callback': () => onTokenRef.current(null),
          });
        })
        .catch(() => onTokenRef.current(null));

      return () => {
        cancelled = true;
        if (widgetIdRef.current && window.turnstile) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {
            // widget already gone — ignore
          }
          widgetIdRef.current = null;
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (!SITE_KEY) return null;
    return <div ref={containerRef} className={className} />;
  },
);

/** True when a site key is configured (submit should block until a token is present). */
export const TURNSTILE_ENABLED = SITE_KEY.length > 0;
