'use client';

import React, { useState, useEffect } from 'react';
import { CommunityCard } from '@/components/community/community-card';
import { RemixModal } from '@/components/community/remix-modal';
import { Compass, Trophy, Heart, Archive } from 'lucide-react';
import Link from 'next/link';
import { AssetCard } from '@/lib/api/community-types';
import { laravel } from '@/lib/api/client';

export default function SavedLikesPage() {
  const [savedAssets, setSavedAssets] = useState<AssetCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeAsset, setActiveAsset] = useState<AssetCard | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    async function fetchLikes() {
      setLoading(true);
      try {
        const res = await laravel.communityLikes();
        setSavedAssets(res.data?.items || []);
      } catch {
        setSavedAssets([]);
      }
      setLoading(false);
    }
    fetchLikes();
  }, []);

  const handleOpenDetails = (asset: AssetCard) => {
    setActiveAsset(asset);
    setIsDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setIsDetailsOpen(false);
  };

  const handleLikeChange = async (uuid: string, liked: boolean) => {
    try {
      await laravel.communityLike(uuid);
      if (!liked) {
        setSavedAssets(prev => prev.filter(a => a.uuid !== uuid));
      }
    } catch {}
  };

  return (
    <div className="space-y-8 select-none">
      <div className="relative rounded-2xl bg-gradient-to-r from-[#FF5A1F]/[0.08] to-[#FF8A5B]/[0.02] border border-[#FF5A1F]/15 p-6 md:p-6 overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 rounded-full bg-[#FF5A1F]/10 blur-[90px] pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 text-left">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF5A1F]/10 text-[#FF5A1F] border border-[#FF5A1F]/20 text-[10px] font-bold uppercase tracking-wider font-mono">
              <Heart className="h-3.5 w-3.5" /> Bộ sưu tập cá nhân
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Tài Nguyên Đã Lưu
            </h1>
            <p className="text-sm text-slate-400 max-w-[550px] leading-relaxed">
              Lưu trữ những prompt và tư liệu hình ảnh/video xuất sắc bạn đã thả tim để sẵn sàng kế thừa sử dụng bất cứ lúc nào.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link href="/community" className="px-4 py-2.5 rounded-xl bg-white/[0.02] hover:bg-white/5 text-slate-400 hover:text-white border border-white/12 hover:border-white/10 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2">
              <Compass className="h-4 w-4" /> Khám phá
            </Link>
            <Link href="/community/trending" className="px-4 py-2.5 rounded-xl bg-white/[0.02] hover:bg-white/5 text-slate-400 hover:text-white border border-white/12 hover:border-white/10 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2">
              <Trophy className="h-4 w-4" /> Bảng xếp hạng
            </Link>
            <Link href="/community/likes" className="px-4 py-2.5 rounded-xl bg-[#FF5A1F]/15 text-[#FF5A1F] border border-[#FF5A1F]/20 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2">
              <Heart className="h-4 w-4" /> Đã lưu
            </Link>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="h-10 w-10 border-4 border-[#FF5A1F] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : savedAssets.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-6">
          {savedAssets.map(asset => (
            <CommunityCard
              key={asset.uuid}
              asset={asset}
              onOpenDetails={handleOpenDetails}
              onLikeChange={handleLikeChange}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-32 space-y-4 bg-[#16141a] rounded-2xl border border-white/12">
          <Archive className="h-12 w-12 text-slate-500 mx-auto" />
          <p className="text-slate-500 font-medium">Chưa có tài nguyên nào được lưu</p>
          <p className="text-xs text-slate-400 max-w-[360px] mx-auto">
            Khi bạn thả tim các tác phẩm trên Thư viện cộng đồng, chúng sẽ xuất hiện ở đây để bạn dễ dàng kế thừa sử dụng.
          </p>
          <Link href="/community" className="inline-flex h-10 px-6 rounded-xl bg-[#FF5A1F] hover:bg-[#FF6A2B] text-white text-xs font-bold transition-all items-center justify-center gap-2">
            Khám phá Feed ngay
          </Link>
        </div>
      )}

      {isDetailsOpen && activeAsset && (
        <RemixModal asset={activeAsset} isOpen={isDetailsOpen} onClose={handleCloseDetails} />
      )}
    </div>
  );
}
