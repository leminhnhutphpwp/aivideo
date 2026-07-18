import { NextResponse, type NextRequest } from 'next/server';

/**
 * Maintenance gating.
 *
 * Two independent runtime switches (read from the server env, NOT NEXT_PUBLIC,
 * so they can be flipped by restarting the web service — no rebuild needed):
 *   - MAINTENANCE_DASHBOARD → gates the authenticated app area
 *   - MAINTENANCE_LANDING   → gates the public landing page ("/")
 *
 * When a gated area is on, requests to it are rewritten to /maintenance
 * (HTTP 503). The maintenance page itself, /api, auth pages and static assets
 * are always reachable so the site can still inform users / admins can operate.
 */

// Route prefixes that make up the dashboard (authenticated app) area.
const DASHBOARD_PREFIXES = [
  '/dashboard',
  '/projects',
  '/billing',
  '/studio',
  '/assets',
  '/jobs',
  '/settings',
  '/community',
  '/notifications',
  '/activity-logs',
];

const isOn = (v?: string) => v === 'true' || v === '1' || v === 'on';

export function middleware(req: NextRequest) {
  const dashboardDown = isOn(process.env.MAINTENANCE_DASHBOARD);
  const landingDown = isOn(process.env.MAINTENANCE_LANDING);

  // Fast path — nothing in maintenance.
  if (!dashboardDown && !landingDown) return NextResponse.next();

  const { pathname } = req.nextUrl;

  // Never gate the maintenance page itself (avoids a rewrite loop).
  if (pathname === '/maintenance') return NextResponse.next();

  const isDashboard = DASHBOARD_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  const isLanding = pathname === '/';

  const gated = (isDashboard && dashboardDown) || (isLanding && landingDown);
  if (!gated) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = '/maintenance';
  url.search = '';
  url.searchParams.set('area', isDashboard ? 'dashboard' : 'landing');
  return NextResponse.rewrite(url, { status: 503 });
}

export const config = {
  // Run on everything except API routes, Next internals and files with an extension.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
