import type { NextRequest } from 'next/server';
import { proxyToLaravel } from '@/lib/bff/sign';

export const runtime = 'nodejs';

/** BFF → Laravel `GET /api/events` (HMAC-signed). */
export async function GET(req: NextRequest): Promise<Response> {
  return proxyToLaravel(req, { method: 'GET', laravelPath: '/api/events' });
}
