'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NAVIGATION_ITEMS, SECONDARY_NAVIGATION, type NavItem } from '@/lib/navigation';
import { useUIStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';

function isActivePath(pathname: string, searchParams: URLSearchParams, href: string) {
  const [hrefPath, hrefQuery] = href.split('?');
  if (pathname !== hrefPath && !pathname.startsWith(hrefPath + '/')) return false;
  if (!hrefQuery) return true;
  const params = new URLSearchParams(hrefQuery);
  for (const [key, val] of params) {
    if (searchParams.get(key) !== val) return false;
  }
  return true;
}

function MobileNavItem({ item, pathname, searchParams, onClose }: { item: NavItem; pathname: string; searchParams: URLSearchParams; onClose: () => void }) {
  const [expanded, setExpanded] = useState(() => {
    if (!item.children) return false;
    return item.children.some(c => isActivePath(pathname, searchParams, c.href));
  });
  const hasChildren = item.children && item.children.length > 0;
  const isActive = isActivePath(pathname, searchParams, item.href) || (item.children?.some(c => isActivePath(pathname, searchParams, c.href)) ?? false);

  return (
    <div className="space-y-0.5">
      <button onClick={() => {
        if (hasChildren) {
          setExpanded(!expanded);
        } else {
          onClose();
        }
      }} className="w-full">
        <Link href={hasChildren ? '#' : item.href} onClick={hasChildren ? (e) => e.preventDefault() : onClose}
          className={cn(
            "flex items-center justify-between gap-3 py-3 px-3 rounded-xl transition-all w-full",
            isActive ? "bg-primary/10 text-primary font-bold" : "text-slate-400 hover:text-white hover:bg-white/5"
          )}
        >
          <div className="flex items-center gap-3">
            <item.icon className="h-5 w-5 shrink-0" />
            <span className="text-sm">{item.title}</span>
          </div>
          {hasChildren && (
            <ChevronDown className={cn('h-4 w-4 text-slate-600 transition-transform', expanded && 'rotate-180')} />
          )}
        </Link>
      </button>

      <AnimatePresence>
        {hasChildren && expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pl-4 ml-3 border-l border-white/[0.06] space-y-0.5 mt-0.5">
              {item.children!.map((child) => {
                const childActive = isActivePath(pathname, searchParams, child.href);
                return (
                  <Link key={child.title} href={child.href} onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all text-sm",
                      childActive
                        ? "bg-[#FF5A1F]/10 text-[#FF5A1F] font-semibold"
                        : "text-slate-500 hover:text-white hover:bg-white/[0.03]"
                    )}
                  >
                    <child.icon className="h-4 w-4 shrink-0" />
                    <span>{child.title}</span>
                    {childActive && (
                      <motion.div layoutId="mobile-active-dot" className="ml-auto h-1.5 w-1.5 rounded-full bg-[#FF5A1F]" />
                    )}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function MobileSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isMobileMenuOpen, toggleMobileMenu } = useUIStore();

  useEffect(() => {
    if (isMobileMenuOpen) { document.body.style.overflow = 'hidden'; }
    else { document.body.style.overflow = ''; }
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen]);

  return (
    <AnimatePresence>
      {isMobileMenuOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleMobileMenu}
            className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-sm lg:hidden"
          />

          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 z-50 w-72 bg-[#0B0B0F] border-r border-white/5 p-6 shadow-md lg:hidden"
          >
            <div className="flex items-center justify-between mb-8">
              <Link href="/dashboard" className="flex items-center gap-3" onClick={toggleMobileMenu}>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF5A1F] to-[#6B2415]">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold tracking-tight text-white">Wavise Studio</span>
              </Link>
              <Button variant="ghost" size="icon" onClick={toggleMobileMenu} className="text-slate-500">
                <X className="h-6 w-6" />
              </Button>
            </div>

            <div className="space-y-8 overflow-y-auto custom-scrollbar max-h-[calc(100vh-120px)]">
              <div className="space-y-1">
                {NAVIGATION_ITEMS.map((item) => (
                  <MobileNavItem key={item.href} item={item} pathname={pathname} searchParams={searchParams} onClose={toggleMobileMenu} />
                ))}
              </div>

              <div className="border-t border-white/5 pt-6 space-y-1">
                {SECONDARY_NAVIGATION.map((item) => (
                  <Link key={item.href} href={item.href} onClick={toggleMobileMenu}
                    className={cn(
                      "flex items-center gap-3 py-3 px-3 rounded-xl transition-all",
                      pathname.startsWith(item.href) ? "bg-primary/10 text-primary font-bold" : "text-slate-400 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="text-sm">{item.title}</span>
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
