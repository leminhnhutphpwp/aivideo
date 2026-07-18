'use client';

import React, { useState } from 'react';
import { UserPlus, UserMinus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { laravel, ApiError } from '@/lib/api/client';
import { useToastStore } from '@/stores/toast-store';

interface FollowButtonProps {
  uuid: string;
  initialFollowing?: boolean;
  onFollowChange?: (following: boolean) => void;
  size?: 'sm' | 'md';
}

export function FollowButton({ uuid, initialFollowing = false, onFollowChange, size = 'md' }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [isLoading, setIsLoading] = useState(false);
  const addToast = useToastStore(s => s.addToast);

  const handleToggle = async () => {
    setIsLoading(true);
    try {
      if (isFollowing) {
        await laravel.communityUnfollow(uuid);
        setIsFollowing(false);
        onFollowChange?.(false);
      } else {
        await laravel.communityFollow(uuid);
        setIsFollowing(true);
        onFollowChange?.(true);
      }
    } catch (error) {
      const message = error instanceof ApiError
        ? error.message
        : 'Không thể thực hiện thao tác. Vui lòng thử lại sau.';
      addToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (size === 'sm') {
    return (
      <button
        onClick={handleToggle}
        disabled={isLoading}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border select-none active:scale-97",
          isFollowing
            ? "bg-white/5 border-white/10 text-slate-400 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400"
            : "bg-[#FF5A1F] text-white border-[#FF5A1F] hover:brightness-110"
        )}
      >
        {isFollowing ? (
          <>
            <UserMinus className="h-3 w-3" />
            Đang theo dõi
          </>
        ) : (
          <>
            <UserPlus className="h-3 w-3" />
            Theo dõi
          </>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border select-none active:scale-97",
        isFollowing
          ? "bg-white/5 border-white/10 text-slate-400 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400"
          : "bg-[#FF5A1F] text-white border-[#FF5A1F] hover:brightness-110"
      )}
    >
      {isFollowing ? (
        <>
          <UserMinus className="h-4 w-4" />
          Đang theo dõi
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4" />
          Theo dõi
        </>
      )}
    </button>
  );
}
