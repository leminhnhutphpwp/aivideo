'use client';

import { useState, useRef, Suspense, useEffect } from 'react';
import {
  LayoutDashboard,
  Wand2,
  Briefcase,
  Library,
  Settings,
  ScrollText,
  Image,
  FolderOpen,
  Video,
  Music,
  Shield,
  CreditCard,
  Clock,
  Bell,
  Clapperboard,
  Type,
  ImagePlus,
  Crosshair,
  Scissors,
  Smile,
  Globe,
  Compass,
  Trophy,
  Heart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { t } from '@/lib/i18n';
import { useAuthStore } from '@/stores/auth-store';
import { capabilityForHref } from '@/lib/feature-capabilities';
import { LARAVEL_URL } from '@/lib/api/client';

type SubItem = {
  icon: React.ElementType;
  label: string;
  href: string;
};

type NavItem = {
  icon: React.ElementType;
  label: string;
  href: string;
  submenu?: SubItem[];
  /** External URL (e.g. Filament admin panel) — opens in a new tab. */
  external?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: t('nav.overview'), href: '/dashboard' },
  { icon: Wand2, label: t('nav.studio'), href: '/studio', submenu: [
    { icon: Type, label: 'Text-to-Video', href: '/studio/video/text-to-video' },
    { icon: ImagePlus, label: 'Image-to-Video', href: '/studio/video/image-to-video' },
    { icon: Crosshair, label: 'Reference-to-Video', href: '/studio/video/reference-to-video' },
    { icon: Scissors, label: 'Video Editing', href: '/studio/video/video-edit' },
    { icon: Smile, label: 'Character Animation', href: '/studio/video/character-animation' },
    { icon: Clapperboard, label: 'Storyboard', href: '/projects?type=storyboard' },
    { icon: Image, label: 'Text-to-Image', href: '/studio/image' },
    { icon: Image, label: 'Image Editing', href: '/studio/image-editing' },
  ]},
  { icon: Briefcase, label: t('nav.projects'), href: '/projects', submenu: [
    { icon: FolderOpen, label: t('projects.all'), href: '/projects' },
    { icon: Clock, label: t('nav.processing'), href: '/jobs' },
  ]},
  { icon: Library, label: t('nav.library'), href: '/assets', submenu: [
    { icon: Image, label: t('projects.all'), href: '/assets' },
    { icon: Video, label: t('studio.video'), href: '/assets?type=video' },
    { icon: Image, label: t('studio.image'), href: '/assets?type=image' },
    { icon: Music, label: t('studio.audio'), href: '/assets?type=audio' },
  ]},
];

const BOTTOM_ITEMS: NavItem[] = [
  { icon: CreditCard, label: 'Dịch vụ', href: '/billing' },
  { icon: Globe, label: 'Cộng đồng', href: '/community', submenu: [
    { icon: Compass, label: 'Khám phá', href: '/community' },
    { icon: Trophy, label: 'Bảng xếp hạng', href: '/community/trending' },
    { icon: Heart, label: 'Đã lưu', href: '/community/likes' },
  ]},
  { icon: Bell, label: 'Thông báo', href: '/notifications' },
  { icon: Settings, label: t('nav.settings'), href: '/settings', submenu: [
    { icon: Settings, label: t('settings.profile'), href: '/settings' },
    { icon: ScrollText, label: t('nav.activityLog'), href: '/activity-logs' },
  ]},
];

const SUBMENU_ICONS: Record<string, React.ElementType> = {
  FolderOpen, Video, Music, Clock, Settings, ScrollText, Clapperboard, Image,
  Type, ImagePlus, Crosshair, Scissors, Smile, Compass, Trophy, Heart,
};

export function Sidebar() {
  return (
    <Suspense fallback={<aside className="hidden lg:flex fixed top-0 left-0 h-full bg-[#1f1c25] border-r border-white/12 z-50 flex-col w-[80px] items-center py-8" />}>
      <SidebarContent />
    </Suspense>
  );
}

function SidebarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ignoreHover, setIgnoreHover] = useState(false);
  const user = useAuthStore(s => s.user);

  const currentQuery = searchParams.toString();
  const isAdmin = (user as any)?.role === 'admin' || (user as any)?.role === 'super_admin';
  const planCaps = user?.plan?.capabilities;
  // A feature is "gated" (maintenance) when its plan capability has no model
  // configured. Item stays clickable — the page shows the maintenance screen.
  const isGated = (href: string) => {
    const cap = capabilityForHref(href);
    return !!(cap && planCaps && !planCaps.includes(cap));
  };

  useEffect(() => {
    setActiveSubmenu(null);
    setIgnoreHover(true);
    const timer = setTimeout(() => setIgnoreHover(false), 800);
    return () => clearTimeout(timer);
  }, [pathname]);

  const showSubmenu = (label: string) => {
    if (ignoreHover) return;
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setActiveSubmenu(label);
  };

  const hideSubmenu = () => {
    hideTimer.current = setTimeout(() => setActiveSubmenu(null), 500);
  };

  const isSubActive = (href: string, siblings: SubItem[]) => {
    const [hrefPath, hrefQuery] = href.split('?');
    if (!pathname.startsWith(hrefPath)) return false;

    // Find the longest matching sibling path
    const allPaths = [hrefPath, ...siblings.map(s => s.href.split('?')[0])];
    const matchingPaths = allPaths.filter(p => pathname.startsWith(p));
    const longestMatch = matchingPaths.reduce((a, b) => (a.length > b.length ? a : b), '');

    // Only active if THIS item is the longest match
    if (longestMatch !== hrefPath) return false;

    if (!hrefQuery) {
      const hasSiblingQueryMatch = siblings.some(sib => {
        const [sPath, sQuery] = sib.href.split('?');
        if (sPath !== hrefPath || !sQuery) return false;
        const sParams = new URLSearchParams(sQuery);
        const current = new URLSearchParams(currentQuery);
        for (const [key, val] of sParams) {
          if (current.get(key) !== val) return false;
        }
        return true;
      });
      if (hasSiblingQueryMatch) return false;
      return true;
    }

    const params = new URLSearchParams(hrefQuery);
    const current = new URLSearchParams(currentQuery);
    for (const [key, val] of params) {
      if (current.get(key) !== val) return false;
    }
    return true;
  };

  // Admins get a shortcut to the real admin panel — the Filament backend
  // (Laravel, separate app), not a Next route. Opens in a new tab.
  const allItems: NavItem[] = [
    ...NAV_ITEMS,
    ...BOTTOM_ITEMS,
    ...(isAdmin
      ? [{ icon: Shield, label: t('nav.admin'), href: `${LARAVEL_URL}/admin`, external: true } as NavItem]
      : []),
  ];

  return (
    <>
      <aside className="hidden lg:flex fixed top-0 left-0 h-full bg-[#1f1c25] border-r border-white/12 z-50 flex-col w-[88px] items-center py-8">
        <div className="mb-10 shrink-0">
          <Link href="/dashboard">
             <img src="/logo-background-white.png" alt="Wavise Studio" className="h-8 w-auto" />
          </Link>
        </div>

        <nav className="flex-1 w-full px-2 space-y-6 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {allItems.map((item) => {
            const isActive = item.submenu
              ? pathname.startsWith(item.href) || item.submenu.some(s => pathname.startsWith(s.href))
              : pathname.startsWith(item.href);

            return (
              <div key={item.label} className="relative flex justify-center">
                <Link href={item.href}
                  target={item.external ? '_blank' : undefined}
                  rel={item.external ? 'noopener noreferrer' : undefined}
                  onMouseEnter={item.submenu ? () => showSubmenu(item.label) : undefined}
                  onMouseLeave={item.submenu ? hideSubmenu : undefined}
                  className="group block w-fit">
                   <div className={cn(
                     "flex flex-col items-center justify-center py-3 px-2 rounded-2xl transition-all duration-300 cursor-pointer relative gap-1.5",
                     isActive
                       ? "text-[#FF5A1F]"
                       : "text-[#4B5563] hover:text-[#9CA3AF]"
                   )}>
                      <item.icon className={cn(
                        "h-6 w-6 transition-all duration-300",
                        isActive ? "scale-100" : "group-hover:scale-110"
                      )} />
                      <span className={cn(
                        "text-[10px] font-bold tracking-tight text-center px-1 whitespace-nowrap",
                        isActive ? "text-[#FF5A1F]" : "text-[#4B5563] group-hover:text-[#9CA3AF]"
                      )}>
                        {item.label}
                      </span>

                          {isActive && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-[#FF5A1F]" />
                          )}
                   </div>
                </Link>
              </div>
            );
          })}
        </nav>
      </aside>

      {/* Submenu panels */}
      <AnimatePresence>
        {allItems.filter(i => i.submenu).map((item) => (
          activeSubmenu === item.label && item.submenu && (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -16, scaleX: 0.95 }}
              animate={{ opacity: 1, x: 0, scaleX: 1 }}
              exit={{ opacity: 0, x: -16, scaleX: 0.95 }}
              transition={{ type: 'spring', stiffness: 450, damping: 38 }}
              style={{ transformOrigin: 'left center' }}
              onMouseEnter={() => { if (hideTimer.current) clearTimeout(hideTimer.current); }}
              onMouseLeave={hideSubmenu}
              className="fixed left-[88px] top-0 h-full w-[280px] bg-[#1f1c25] border-r border-white/12 shadow-md shadow-black/70 z-40 flex flex-col pt-10 pointer-events-auto"
            >
              <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-[#FF5A1F]/80 via-[#FF5A1F]/20 to-transparent" />

              <div className="px-6 mb-8">
                <div className="flex items-center gap-3.5 mb-2">
                  <div className="h-9 w-9 shrink-0 rounded-xl border border-white/10 bg-white/[0.03] flex items-center justify-center">
                    <item.icon className="h-5 w-5 text-slate-400 shrink-0" />
                  </div>
                  <div>
                    <span className="text-base font-bold text-white tracking-tight">{item.label}</span>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      {item.label === t('nav.studio') && t('studio.desc')}
                      {item.label === t('nav.projects') && t('projects.desc')}
                      {item.label === t('nav.library') && t('assets.desc')}
                      {item.label === t('nav.settings') && t('settings.desc')}
                      {item.label === 'Cộng đồng' && 'Khám phá và kế thừa tài nguyên nghệ thuật.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-6 mb-2">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.15em]">
                  {item.label === t('nav.studio') && t('studio.video')}
                  {item.label === t('nav.projects') && t('projects.production')}
                  {item.label === t('nav.library') && t('assets.type')}
                  {item.label === t('nav.settings') && 'Menu'}
                  {item.label === 'Cộng đồng' && 'Chức năng'}
                </span>
              </div>

              <div className="flex-1 px-4 space-y-0.5">
                {item.submenu.map((sub) => {
                  const Icon = sub.icon;
                  const active = isSubActive(sub.href, item.submenu!);
                  return (
                    <Link key={sub.label} href={sub.href}
                      className={cn(
                        'relative flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all group',
                        active
                          ? 'bg-[#FF5A1F]/8 text-[#FF5A1F]'
                          : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                      )}
                    >
                      {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-[#FF5A1F]" />}
                      <div className="relative flex items-center gap-3.5 w-full">
                        <div className={cn(
                          'h-8 w-8 shrink-0 rounded-lg flex items-center justify-center transition-all',
                          active
                            ? 'bg-[#FF5A1F]/5 border border-[#FF5A1F]/20 text-[#FF5A1F]'
                            : 'bg-transparent border border-transparent text-slate-500 group-hover:text-white'
                        )}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className={active ? 'text-[#FF5A1F]' : 'text-slate-400 group-hover:text-white'}>
                          {sub.label}
                        </span>
                        {isGated(sub.href) && (
                          <span className="ml-auto shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Bảo trì
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>

              <div className="px-6 py-5 border-t border-white/12 mt-4">
                <div className="flex items-center gap-2.5 text-xs text-slate-400">
                  <div className="h-2 w-2 rounded-full bg-emerald-500/50 animate-pulse" />
                  <span className="font-medium text-slate-500">{item.submenu.length}</span>
                  <span className="text-slate-500">
                    {item.label === t('nav.studio') && t('studio.video')}
                    {item.label === t('nav.projects') && t('projects.production')}
                    {item.label === t('nav.library') && t('assets.type')}
                    {item.label === t('nav.settings') && 'menu'}
                    {item.label === 'Cộng đồng' && 'chức năng'}
                    {' · ready'}
                  </span>
                </div>
              </div>
            </motion.div>
          )
        ))}
      </AnimatePresence>
    </>
  );
}
