'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { CommunityCard } from '@/components/community/community-card';
import { RemixModal } from '@/components/community/remix-modal';
import { Compass, Trophy, Heart, Search, SlidersHorizontal, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { AssetCard } from '@/lib/api/community-types';
import { laravel } from '@/lib/api/client';
import { CustomSelect } from '@/components/ui/select';

const STYLE_CATEGORIES = [
  { id: 'all', label: 'Tất cả' },
  { id: 'cyberpunk', label: 'Cyberpunk' },
  { id: 'anime', label: 'Anime' },
  { id: 'fantasy', label: 'Kỳ ảo' },
  { id: 'nature', label: 'Phong cảnh' },
  { id: '3d', label: '3D Render' },
  { id: 'sci-fi', label: 'Sci-fi' },
  { id: 'cinematic', label: 'Cinematic' }
];

function CommunityContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [assets, setAssets] = useState<AssetCard[]>([]);
  const [selectedStyle, setSelectedStyle] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('trending');
  const [loading, setLoading] = useState(true);
  
  const [activeAsset, setActiveAsset] = useState<AssetCard | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const ITEMS_PER_PAGE = 20;
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const sortMap: Record<string, string> = {
          trending: 'popular',
          newest: 'latest',
          remixes: 'trending',
        };
        const res = await laravel.communityFeed({ 
          q: searchQuery || undefined, 
          sort: sortMap[sortBy] || 'latest' 
        });
        setAssets(res.data.items || []);
      } catch {
        setAssets([]);
      }
      setLoading(false);
    }
    fetchData();
  }, [sortBy, searchQuery]);

  useEffect(() => {
    const assetUuid = searchParams.get('asset');
    if (assetUuid) {
      const found = assets.find(a => a.uuid === assetUuid);
      if (found) {
        setActiveAsset(found);
        setIsDetailsOpen(true);
      }
    }
  }, [searchParams, assets]);

  const handleOpenDetails = (asset: AssetCard) => {
    setActiveAsset(asset);
    setIsDetailsOpen(true);
    const params = new URLSearchParams(window.location.search);
    params.set('asset', asset.uuid);
    router.replace(`?${params.toString()}`);
  };

  const handleCloseDetails = () => {
    setIsDetailsOpen(false);
    const params = new URLSearchParams(window.location.search);
    params.delete('asset');
    router.replace(`?${params.toString()}`);
  };

  const handleLikeChange = async (uuid: string, liked: boolean) => {
    try {
      const result = await laravel.communityLike(uuid);
      setAssets(prev =>
        prev.map(a => a.uuid === uuid ? { ...a, like_count: result.data.count } : a)
      );
    } catch {}
  };

  const filteredAssets = selectedStyle === 'all'
    ? assets
    : assets.filter(a => a.tags?.some(t => t.toLowerCase().includes(selectedStyle.toLowerCase())));

  const visibleAssets = filteredAssets.slice(0, visibleCount);
  const hasMore = visibleCount < filteredAssets.length;
  const hasActiveFilter = searchQuery.trim() !== '' || selectedStyle !== 'all';

  return (
    <div className="space-y-8 select-none">
      <div className="relative rounded-2xl bg-gradient-to-r from-[#FF5A1F]/[0.08] to-[#FF8A5B]/[0.02] border border-[#FF5A1F]/15 p-6 md:p-6 overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 rounded-full bg-[#FF5A1F]/10 blur-[90px] pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 text-left">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF5A1F]/10 text-[#FF5A1F] text-[10px] font-bold uppercase tracking-wider font-mono">
              <Compass className="h-3.5 w-3.5" /> Thư viện cộng đồng
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Khám Phá Sáng Tạo AI
            </h1>
            <p className="text-sm text-slate-400 max-w-[550px] leading-relaxed">
              Khám phá, lấy cảm hứng và kế thừa hàng ngàn tác phẩm nghệ thuật video/hình ảnh đỉnh cao từ cộng đồng sáng tạo.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 max-w-full overflow-x-auto scrollbar-none">
            <Link
              href="/community"
              className="px-4 py-2.5 rounded-xl bg-[#FF5A1F]/15 text-[#FF5A1F] border border-[#FF5A1F]/20 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2"
            >
              <Compass className="h-4 w-4" /> Khám phá
            </Link>
            <Link
              href="/community/trending"
              className="px-4 py-2.5 rounded-xl bg-white/[0.02] hover:bg-white/5 text-slate-400 hover:text-white border border-white/5 hover:border-white/10 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2"
            >
              <Trophy className="h-4 w-4" /> Bảng xếp hạng
            </Link>
            <Link
              href="/community/likes"
              className="px-4 py-2.5 rounded-xl bg-white/[0.02] hover:bg-white/5 text-slate-400 hover:text-white border border-white/5 hover:border-white/10 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2"
            >
              <Heart className="h-4 w-4" /> Đã lưu
            </Link>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="relative w-full lg:max-w-[380px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setVisibleCount(ITEMS_PER_PAGE); }}
            placeholder="Tìm ý tưởng, prompt, creator..."
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-white/[0.05] bg-zinc-950/80 text-sm text-slate-300 outline-none focus:border-[#FF5A1F]/30 focus:shadow-[0_0_20px_rgba(255,90,31,0.04)] transition-all font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setVisibleCount(ITEMS_PER_PAGE); }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 hover:text-white"
            >
              Xóa
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 self-end lg:self-auto">
          <SlidersHorizontal className="h-4 w-4 text-slate-500" />
          <CustomSelect
            value={sortBy}
            onChange={(val) => { setSortBy(val); setVisibleCount(ITEMS_PER_PAGE); }}
            options={[
              { value: 'trending', label: 'Xu hướng nổi bật' },
              { value: 'newest', label: 'Mới đăng tải' },
              { value: 'remixes', label: 'Sử dụng nhiều nhất' },
            ]}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
        {STYLE_CATEGORIES.map(style => (
          <button
            key={style.id}
            onClick={() => { setSelectedStyle(style.id); setVisibleCount(ITEMS_PER_PAGE); }}
            className={cn(
              "shrink-0 h-9 px-4 rounded-full border text-xs font-bold transition-all uppercase tracking-wider cursor-pointer",
              selectedStyle === style.id
                ? "bg-[#FF5A1F] border-[#FF5A1F] text-white shadow-[0_4px_12px_rgba(255,90,31,0.25)]"
                : "bg-white/[0.02] border-white/5 hover:border-white/15 text-slate-400 hover:text-white"
            )}
          >
            {style.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="h-10 w-10 border-4 border-[#FF5A1F] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono">Đang tải...</span>
        </div>
      ) : filteredAssets.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-6">
            {visibleAssets.map(asset => (
              <CommunityCard
                key={asset.uuid}
                asset={asset}
                onOpenDetails={handleOpenDetails}
                onLikeChange={handleLikeChange}
              />
            ))}
          </div>
          {hasMore && (
            <div className="flex justify-center pt-8">
              <button onClick={() => setVisibleCount(c => c + ITEMS_PER_PAGE)}
                className="px-10 py-6 rounded-2xl border border-white/5 text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm font-semibold">
                Xem thêm ({filteredAssets.length - visibleCount})
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-32 space-y-4 bg-zinc-950 rounded-2xl border border-white/5">
          <AlertCircle className="h-12 w-12 text-slate-700 mx-auto" />
          {hasActiveFilter ? (
            <>
              <p className="text-slate-500 font-medium">Không tìm thấy kết quả phù hợp</p>
              <p className="text-xs text-slate-600 max-w-[320px] mx-auto">
                Thử tìm từ khóa khác hoặc lọc lại theo các nhóm phong cách khác xem nhé.
              </p>
            </>
          ) : (
            <>
              <p className="text-slate-500 font-medium">Chưa có tác phẩm nào</p>
              <p className="text-xs text-slate-600 max-w-[320px] mx-auto">
                Cộng đồng chưa có tác phẩm nào được chia sẻ. Hãy là người đầu tiên tạo và đăng tải nhé!
              </p>
            </>
          )}
        </div>
      )}

      {isDetailsOpen && activeAsset && (
        <RemixModal
          asset={activeAsset}
          isOpen={isDetailsOpen}
          onClose={handleCloseDetails}
          onLikeChange={handleLikeChange}
        />
      )}
    </div>
  );
}

export default function CommunityPage() {
  return (
    <Suspense fallback={
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <div className="h-10 w-10 border-4 border-[#FF5A1F] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono">Đang tải cộng đồng...</span>
      </div>
    }>
      <CommunityContent />
    </Suspense>
  );
}
