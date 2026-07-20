import type { NextRequest } from 'next/server';
import { proxyToLaravel } from '@/lib/bff/sign';

export const runtime = 'nodejs';

/** BFF → Laravel `POST /api/events/{slug}/claim` (HMAC-signed + Turnstile-forwarded). */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await ctx.params;
  const safeSlug = encodeURIComponent(slug);
  return proxyToLaravel(req, { method: 'POST', laravelPath: `/api/events/${safeSlug}/claim` });
}
