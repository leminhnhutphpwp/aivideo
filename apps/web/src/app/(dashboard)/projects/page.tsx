'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Clapperboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
// import { AnimatePresence } from 'motion/react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { t } from '@/lib/i18n';
import { fetchUnifiedProjects } from '@/lib/api/unified-projects';
import { UnifiedProjectCard } from '@/components/projects/unified-project-card';
import { FILTER_TABS, VALID_TYPE_KEYS } from '@/lib/api/unified-project-types';
import type { UnifiedProject } from '@/lib/api/unified-project-types';


export default function UnifiedProjectsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const typeParam = searchParams.get('type') || 'all';
  const [activeTab, setActiveTab] = useState(VALID_TYPE_KEYS.has(typeParam) ? typeParam : 'all');
  const [searchQuery, setSearchQuery] = useState('');

const createHref = activeTab === 'storyboard' ? '/studio/storyboard/flow' : '/studio';
  const [projects, setProjects] = useState<UnifiedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  const ITEMS_PER_PAGE = 20;
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  useEffect(() => {
    const validType = VALID_TYPE_KEYS.has(typeParam) ? typeParam : 'all';
    setActiveTab(validType);
  }, [typeParam]);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchUnifiedProjects()
      .then(setProjects)
      .catch(() => setError('Không thể tải danh sách dự án'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = projects.filter(p => {
    const typeMatch = activeTab === 'all' || p.type === activeTab;
    const searchMatch = p.title.toLowerCase().includes(searchQuery.toLowerCase());
    return typeMatch && searchMatch;
  });

  const visibleProjects = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const onTabChange = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === 'all') params.delete('type');
    else params.set('type', tab);
    const qs = params.toString();
    router.replace(`/projects${qs ? '?' + qs : ''}`);
    setActiveTab(tab);
    setVisibleCount(ITEMS_PER_PAGE);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setVisibleCount(ITEMS_PER_PAGE);
  };

  return (
    <div className="flex flex-col gap-6 md:gap-6 lg:gap-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-stretch gap-3">
          <div className="w-[3px] shrink-0 rounded-full bg-gradient-to-b from-[#FF5A1F] via-[#FF5A1F]/60 to-transparent" />
          <div className="space-y-1">
            <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-[#FF5A1F]/80">Wavise Studio</span>
            <h1 className="text-2xl md:text-3xl font-display font-semibold tracking-tight text-white leading-tight">{t('projects.title')}</h1>
            <p className="text-slate-500 font-medium tracking-tight">Tất cả dự án trong một nơi</p>
          </div>
        </div>
        <Link href={createHref}>
          <Button className="h-12 px-10 rounded-xl bg-[#FF5A1F] hover:bg-[#FF6A2B] text-white font-bold text-sm tracking-tight shadow-sm shadow-[#FF5A1F]/20 transition-all">
            <Plus className="h-5 w-5 mr-1" />
            {t('projects.newProject')}
          </Button>
        </Link>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="flex p-1 rounded-xl bg-[#16141a] border border-white/12 w-full md:w-auto overflow-x-auto no-scrollbar">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`px-6 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 whitespace-nowrap cursor-pointer active:scale-95 ${
                activeTab === tab.key
                  ? 'bg-[#FF5A1F] text-white shadow-sm shadow-[#FF5A1F]/20'
                  : 'text-slate-500 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full md:w-80 rounded-xl border border-white/12 bg-[#16141a] px-4 py-2.5 group focus-within:border-[#FF5A1F]/30 transition-all">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            placeholder={t('projects.searchPlaceholder')}
            value={searchQuery}
            onChange={handleSearchChange}
            className="bg-transparent text-sm text-white outline-none placeholder:text-slate-500 w-full font-medium"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="h-6 w-6 rounded-full border-2 border-white/10 border-t-[#FF5A1F] animate-spin" />
        </div>
      ) : error ? (
        <div className="col-span-full text-center py-32 space-y-4 bg-[#16141a] rounded-2xl border border-white/12">
          <p className="text-slate-500 font-medium">{error}</p>
          <Button onClick={load} className="bg-[#FF5A1F] hover:bg-[#FF6A2B] text-white rounded-xl">
            Thử lại
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-6">
              {filtered.length === 0 ? (
                <div className="col-span-full text-center py-32 space-y-4 bg-[#16141a] rounded-2xl border border-white/12">
                  <Clapperboard className="h-12 w-12 text-slate-500 mx-auto" />
                  <p className="text-slate-500 font-medium">Chưa có dự án nào</p>
                  <Link href={createHref}>
                    <Button className="bg-[#FF5A1F] hover:bg-[#FF6A2B] text-white rounded-xl">{t('projects.createFirst')}</Button>
                  </Link>
                </div>
              ) : (
                visibleProjects.map((p) => (
                  <UnifiedProjectCard key={p.id} project={p} />
                ))
              )}
          </div>
          {hasMore && (
            <div className="flex justify-center pt-8">
              <Button onClick={() => setVisibleCount(c => c + ITEMS_PER_PAGE)}
                variant="ghost"
                className="px-10 py-6 rounded-2xl border border-white/12 text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm font-semibold">
                Xem thêm ({filtered.length - visibleCount})
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
