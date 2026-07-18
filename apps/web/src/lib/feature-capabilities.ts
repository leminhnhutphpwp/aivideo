import { useAuthStore } from '@/stores/auth-store';

/**
 * Maps a studio feature (route segment) to the plan capability key that must be
 * configured in the plan's `model_mapping` for the feature to be usable.
 * When a plan has no model configured for the capability, the feature is gated
 * behind a "maintenance" state (menu badge + maintenance page).
 */
export const FEATURE_CAPABILITY: Record<string, string> = {
  // /studio/video/<feature>
  'text-to-video': 'text_to_video',
  'image-to-video': 'image_to_video',
  'reference-to-video': 'reference_to_video',
  'video-edit': 'video_editing',
  'character-animation': 'character_animation',
  // dedicated pages
  image: 'image_generation',
  'image-editing': 'image_editing',
  'video-editing': 'video_editing',
};

/**
 * True if the current user's plan has the given capability configured.
 * Returns true while plan capabilities are still unknown (don't gate during
 * load) and when no capability is required.
 */
export function useCapability(capability: string | null | undefined): boolean {
  const caps = useAuthStore((s) => s.user?.plan?.capabilities);
  if (!capability) return true;
  if (!caps) return true; // not loaded yet → optimistic, don't gate
  return caps.includes(capability);
}

/**
 * Resolve the capability key required by a route/href, if any. Handles both the
 * dynamic `/studio/video/<feature>` routes and the direct `/studio/<feature>`
 * ones. Returns null for routes that aren't a single gated feature (hub pages,
 * storyboard, audio, library, …) so they are never gated.
 */
export function capabilityForHref(href: string): string | null {
  // Storyboard menu item points at /projects?type=storyboard — gate it (and the
  // storyboard builder) by the storyboard_video capability (the real VideoType).
  if (/[?&]type=storyboard\b/.test(href)) return 'storyboard_video';
  const path = href.split('?')[0].replace(/\/+$/, '');
  const video = path.match(/^\/studio\/video\/([^/]+)$/);
  if (video) return FEATURE_CAPABILITY[video[1]] ?? null;
  const direct = path.match(/^\/studio\/([^/]+)$/);
  if (direct) return FEATURE_CAPABILITY[direct[1]] ?? null;
  return null;
}
