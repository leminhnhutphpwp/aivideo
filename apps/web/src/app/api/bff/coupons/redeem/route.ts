import type { NextRequest } from 'next/server';
import { proxyToLaravel } from '@/lib/bff/sign';

export const runtime = 'nodejs';

/** BFF → Laravel `POST /api/coupons/redeem` (HMAC-signed + Turnstile-forwarded). */
export async function POST(req: NextRequest): Promise<Response> {
  return proxyToLaravel(req, { method: 'POST', laravelPath: '/api/coupons/redeem' });
}
