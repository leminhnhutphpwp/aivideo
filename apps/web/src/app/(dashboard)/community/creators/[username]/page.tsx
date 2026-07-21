'use client';

import React, { use, useState, useEffect } from 'react';
import { CommunityCard } from '@/components/community/community-card';
import { CreatorLevelBadge } from '@/components/community/creator-level-badge';
import { FollowButton } from '@/components/community/follow-button';
import { RemixModal } from '@/components/community/remix-modal';
import { Compass, Trophy, Heart, ArrowLeft, Users, Flame, Award, ShieldCheck, UserPlus, UserMinus } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { AnimatePresence } from 'motion/react';
import { AssetCard, UserProfile } from '@/lib/api/community-types';
import { laravel } from '@/lib/api/client';

interface CreatorPageProps {
  params: Promise<{ username: string }>;
}

export default function CreatorProfilePage({ params }: CreatorPageProps) {
  const resolvedParams = use(params);
  const username = resolvedParams.username;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [assets, setAssets] = useState<AssetCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeAsset, setActiveAsset] = useState<AssetCard | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      try {
        const [res, assetsRes] = await Promise.all([
          laravel.communityUserProfile(username),
          laravel.communityUserAssets(username),
        ]);
        setProfile(res.data);
        setAssets(assetsRes.data?.items || []);
      } catch {
        setProfile(null);
        setAssets([]);
      }
      setLoading(false);
    }
    fetchProfile();
  }, [username]);

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

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <div className="h-10 w-10 border-4 border-[#FF5A1F] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <p className="text-sm font-bold text-slate-300">Không tìm thấy người dùng</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 select-none text-left">
      <div>
        <Link href="/community/trending" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-white uppercase tracking-wider transition-colors">
          <ArrowLeft className="h-4 w-4" /> Quay lại Bảng xếp hạng
        </Link>
      </div>

      <div className="relative rounded-2xl bg-[#16141a]/80 border border-white/12 p-6 md:p-6 overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 rounded-full bg-[#FF5A1F]/10 blur-[100px] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-40" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 z-10">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
            <img
              src={profile.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&auto=format&fit=crop'}
              alt={profile.username}
              className="h-24 w-24 rounded-full object-cover border-2 border-white/10 shadow-md shrink-0"
            />
            
            <div className="space-y-3.5 max-w-[480px]">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                  {profile.name}
                </h1>
                <CreatorLevelBadge level={profile.reputation_level as any} />
              </div>
              
              <p className="text-xs font-bold text-[#FF5A1F] font-mono tracking-wider">
                @{profile.username}
              </p>

              <div className="flex items-center justify-center sm:justify-start gap-6 pt-2 border-t border-white/12">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Users className="h-4 w-4" />
                  <strong className="text-slate-200 font-bold">{formatNum(profile.stats.published_count)}</strong> tác phẩm
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Heart className="h-4 w-4" />
                  <strong className="text-slate-200 font-bold">{formatNum(profile.stats.likes_received)}</strong> lượt thích
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <UserPlus className="h-4 w-4" />
                  <strong className="text-slate-200 font-bold">{formatNum(profile.stats.follower_count)}</strong> người theo dõi
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <UserMinus className="h-4 w-4" />
                  Đang theo dõi <strong className="text-slate-200 font-bold">{formatNum(profile.stats.following_count)}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-3 min-w-[200px]">
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/12 flex items-center justify-between gap-6">
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">Uy tín</span>
                <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-[#FF5A1F] font-mono leading-none mt-1">
                  {formatNum(profile.reputation_score)} pts
                </span>
              </div>
              <ShieldCheck className="h-5 w-5 text-amber-500" />
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/12 flex items-center justify-between gap-6">
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">Tổng Likes</span>
                <span className="text-lg font-black text-slate-200 font-mono leading-none mt-1">
                  {formatNum(profile.stats.likes_received)}
                </span>
              </div>
              <Heart className="h-5 w-5 text-[#FF5A1F] fill-[#FF5A1F]/10" />
            </div>

            <FollowButton
              uuid={profile.uuid}
              initialFollowing={profile.is_following}
              onFollowChange={(following) => {
                setProfile(prev => prev ? {
                  ...prev,
                  is_following: following,
                  stats: {
                    ...prev.stats,
                    follower_count: prev.stats.follower_count + (following ? 1 : -1),
                  },
                } : prev);
              }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2 border-b border-white/12 pb-3">
          <Flame className="h-5 w-5 text-[#FF5A1F]" /> Tác phẩm công khai ({assets.length})
        </h2>

        {assets.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-6">
            {assets.map(asset => (
              <CommunityCard key={asset.uuid} asset={asset} onOpenDetails={handleOpenDetails} />
            ))}
          </div>
        ) : (
          <div className="py-20 rounded-2xl border border-white/[0.03] bg-white/[0.01] flex flex-col items-center justify-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-white/[0.03] flex items-center justify-center border border-white/12 text-slate-500">
              <Award className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold text-slate-300">Creator chưa công khai tác phẩm nào</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isDetailsOpen && activeAsset && (
          <RemixModal key={activeAsset.uuid} asset={activeAsset} isOpen={isDetailsOpen} onClose={handleCloseDetails} />
        )}
      </AnimatePresence>
    </div>
  );
}
