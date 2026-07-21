'use client';

import React, { useState, useEffect } from 'react';
import { CommunityCard } from '@/components/community/community-card';
import { CreatorLevelBadge } from '@/components/community/creator-level-badge';
import { RemixModal } from '@/components/community/remix-modal';
import { Compass, Trophy, Heart, Flame, Star, ArrowUpRight, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { AnimatePresence } from 'motion/react';
import { AssetCard, CreatorSummary } from '@/lib/api/community-types';
import { laravel } from '@/lib/api/client';

export default function TrendingPage() {
  const [activeTab, setActiveTab] = useState<'assets' | 'creators'>('assets');
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week');
  
  const [trendingAssets, setTrendingAssets] = useState<AssetCard[]>([]);
  const [trendingCreators, setTrendingCreators] = useState<CreatorSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeAsset, setActiveAsset] = useState<AssetCard | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [assetsRes, creatorsRes] = await Promise.all([
          laravel.communityTrending(period),
          laravel.communityTrendingCreators(period),
        ]);
        setTrendingAssets(assetsRes.data || []);
        setTrendingCreators(creatorsRes.data || []);
      } catch {
        setTrendingAssets([]);
        setTrendingCreators([]);
      }
      setLoading(false);
    }
    fetchData();
  }, [period]);

  const handleOpenDetails = (asset: AssetCard) => {
    setActiveAsset(asset);
    setIsDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setIsDetailsOpen(false);
  };

  const formatNum = (num: number) => {
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num;
  };

  return (
    <div className="space-y-8 select-none">
      <div className="relative rounded-2xl bg-gradient-to-r from-[#FF5A1F]/[0.08] to-[#FF8A5B]/[0.02] border border-[#FF5A1F]/15 p-6 md:p-6 overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 rounded-full bg-[#FF5A1F]/10 blur-[90px] pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 text-left">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-bold uppercase tracking-wider font-mono">
              <Trophy className="h-3.5 w-3.5" /> Bảng xếp hạng thịnh hành
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Kiệt Tác Cộng Đồng
            </h1>
            <p className="text-sm text-slate-400 max-w-[550px] leading-relaxed">
              Vinh danh những tác phẩm sinh động nhất và những nhà sáng tạo nghệ thuật AI xuất chúng được yêu thích nhất.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link href="/community" className="px-4 py-2.5 rounded-xl bg-white/[0.02] hover:bg-white/5 text-slate-400 hover:text-white border border-white/12 hover:border-white/10 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2">
              <Compass className="h-4 w-4" /> Khám phá
            </Link>
            <Link href="/community/trending" className="px-4 py-2.5 rounded-xl bg-[#FF5A1F]/15 text-[#FF5A1F] border border-[#FF5A1F]/20 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2">
              <Trophy className="h-4 w-4" /> Bảng xếp hạng
            </Link>
            <Link href="/community/likes" className="px-4 py-2.5 rounded-xl bg-white/[0.02] hover:bg-white/5 text-slate-400 hover:text-white border border-white/12 hover:border-white/10 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2">
              <Heart className="h-4 w-4" /> Đã lưu
            </Link>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-2 bg-[#16141a]/80 border border-white/12 rounded-2xl">
        <div className="flex items-center gap-1 w-full sm:w-auto">
          <button onClick={() => setActiveTab('assets')} className={cn("flex-1 sm:flex-initial h-10 px-6 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer", activeTab === 'assets' ? "bg-[#FF5A1F] text-white shadow-[0_4px_12px_rgba(255,90,31,0.2)]" : "text-slate-400 hover:text-white")}>
            <Flame className="h-4 w-4" /> Tác phẩm Hot
          </button>
          <button onClick={() => setActiveTab('creators')} className={cn("flex-1 sm:flex-initial h-10 px-6 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer", activeTab === 'creators' ? "bg-[#FF5A1F] text-white shadow-[0_4px_12px_rgba(255,90,31,0.2)]" : "text-slate-400 hover:text-white")}>
            <Star className="h-4 w-4" /> Top Creators
          </button>
        </div>

        <div className="flex items-center gap-1 bg-white/[0.02] border border-white/12 rounded-xl p-1 w-full sm:w-auto">
          {([{ id: 'day', label: '24h' }, { id: 'week', label: 'Tuần' }, { id: 'month', label: 'Tháng' }] as const).map(p => (
            <button key={p.id} onClick={() => setPeriod(p.id)} className={cn("flex-1 sm:flex-initial h-8 px-4 rounded-lg text-[10px] font-extrabold uppercase tracking-widest transition-all cursor-pointer", period === p.id ? "bg-white/10 text-white border border-white/12" : "text-slate-500 hover:text-slate-300")}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="h-10 w-10 border-4 border-[#FF5A1F] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : activeTab === 'assets' ? (
        trendingAssets.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-6">
            {trendingAssets.map((asset, index) => {
              const rank = index + 1;
              return (
                <div key={asset.uuid} className="relative group">
                  <div className="absolute top-[-8px] right-[16px] z-10 pointer-events-none select-none">
                    {rank === 1 && (<span className="h-10 w-8 bg-gradient-to-b from-amber-400 to-yellow-600 rounded-b-md flex items-center justify-center font-mono font-black text-black text-sm shadow-md">#1</span>)}
                    {rank === 2 && (<span className="h-9 w-7 bg-gradient-to-b from-slate-300 to-slate-500 rounded-b-md flex items-center justify-center font-mono font-black text-black text-xs shadow-md">#2</span>)}
                    {rank === 3 && (<span className="h-9 w-7 bg-gradient-to-b from-amber-700 to-amber-900 rounded-b-md flex items-center justify-center font-mono font-black text-white text-xs shadow-md">#3</span>)}
                    {rank > 3 && (<span className="h-8 w-6 bg-[#16141a]/80 border border-white/10 rounded-b-md flex items-center justify-center font-mono font-extrabold text-slate-500 text-[10px]">#{rank}</span>)}
                  </div>
                  <CommunityCard asset={asset} onOpenDetails={handleOpenDetails} />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-32 space-y-4 bg-[#16141a] rounded-2xl border border-white/12">
            <AlertCircle className="h-12 w-12 text-slate-500 mx-auto" />
            <p className="text-slate-500 font-medium">Chưa có tác phẩm thịnh hành</p>
            <p className="text-xs text-slate-400 max-w-[320px] mx-auto">
              Hãy quay lại sau để khám phá những tác phẩm đang được cộng đồng yêu thích nhất nhé.
            </p>
          </div>
        )
      ) : (
        trendingCreators.length > 0 ? (
          <div className="space-y-4">
            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono border-b border-white/12">
              <div className="col-span-1 text-center">Hạng</div>
              <div className="col-span-4 text-left">Creator</div>
              <div className="col-span-2 text-center">Cấp độ</div>
              <div className="col-span-3 text-center">Tác phẩm</div>
              <div className="col-span-2 text-center">View</div>
            </div>

            <div className="space-y-2.5">
              {trendingCreators.map((creator, index) => {
                const rank = index + 1;
                return (
                  <div key={creator.username} className={cn("grid grid-cols-1 md:grid-cols-12 items-center gap-4 px-6 py-4.5 rounded-2xl bg-[#16141a]/80 border border-white/12 hover:border-[#FF5A1F]/20 hover:bg-[#FF5A1F]/[0.01] transition-all", rank === 1 && "border-amber-500/20 bg-amber-500/[0.01] shadow-[0_0_20px_rgba(245,158,11,0.02)]")}>
                    <div className="col-span-1 flex items-center justify-center">
                      {rank === 1 && (<span className="h-8 w-8 rounded-lg bg-amber-500 text-black font-mono font-black text-sm flex items-center justify-center shadow-sm">1</span>)}
                      {rank === 2 && (<span className="h-8 w-8 rounded-lg bg-slate-400 text-black font-mono font-black text-sm flex items-center justify-center">2</span>)}
                      {rank === 3 && (<span className="h-8 w-8 rounded-lg bg-amber-800 text-white font-mono font-black text-sm flex items-center justify-center">3</span>)}
                      {rank > 3 && (<span className="font-mono font-extrabold text-slate-500 text-sm">{rank}</span>)}
                    </div>

                    <div className="col-span-4 flex items-center gap-3.5">
                      <img src={creator.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&auto=format&fit=crop'} alt={creator.username} className={cn("h-11 w-11 rounded-full object-cover border border-white/10", rank === 1 && "border-amber-400/40 shadow-[0_0_10px_rgba(245,158,11,0.3)]")} />
                      <div className="flex flex-col text-left">
                        <span className="text-sm font-bold text-white group-hover:text-[#FF5A1F] transition-colors">{creator.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">@{creator.username}</span>
                      </div>
                    </div>

                    <div className="col-span-2 flex justify-start md:justify-center">
                      <CreatorLevelBadge level={creator.reputation_level as any} />
                    </div>

                    <div className="col-span-3 flex flex-col md:items-center text-left md:text-center">
                      <span className="text-[10px] text-slate-400 font-medium uppercase font-mono md:hidden">Tác phẩm</span>
                      <span className="text-xs font-bold text-slate-300">{creator.published_count}</span>
                    </div>

                    <div className="col-span-2 flex items-center justify-between md:justify-center w-full">
                      <Link href={`/community/creators/${creator.username}`} className="ml-auto md:ml-4 h-8 w-8 rounded-lg bg-white/5 border border-white/10 hover:border-[#FF5A1F]/30 hover:bg-[#FF5A1F]/10 flex items-center justify-center text-slate-400 hover:text-[#FF5A1F] transition-all cursor-pointer shrink-0">
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-32 space-y-4 bg-[#16141a] rounded-2xl border border-white/12">
            <AlertCircle className="h-12 w-12 text-slate-500 mx-auto" />
            <p className="text-slate-500 font-medium">Chưa có creator thịnh hành</p>
            <p className="text-xs text-slate-400 max-w-[320px] mx-auto">
              Hãy quay lại sau để khám phá những nhà sáng tạo đang được cộng đồng yêu thích nhất nhé.
            </p>
          </div>
        )
      )}

      <AnimatePresence>
        {isDetailsOpen && activeAsset && (
          <RemixModal key={activeAsset.uuid} asset={activeAsset} isOpen={isDetailsOpen} onClose={handleCloseDetails} />
        )}
      </AnimatePresence>
    </div>
  );
}
