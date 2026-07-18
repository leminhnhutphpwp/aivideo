'use client';

import React from 'react';
import { Copy, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToastStore } from '@/stores/toast-store';

interface ShareButtonsProps {
  url: string;
  title: string;
}

export function ShareButtons({ url, title }: ShareButtonsProps) {
  const addToast = useToastStore(s => s.addToast);
  const shareText = `Check out this AI-generated video: ${title}`;

  const handleShare = (platform: string) => {
    switch (platform) {
      case 'copy':
        navigator.clipboard.writeText(url);
        addToast('Đã copy liên kết!', 'success');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`, '_blank');
        break;
      case 'tiktok':
        navigator.clipboard.writeText(url);
        addToast('Đã copy liên kết. Mở TikTok và dán vào caption!', 'success');
        break;
    }
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      <button
        onClick={() => handleShare('copy')}
        className="h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.06] text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
      >
        <Copy className="h-3.5 w-3.5" />
        Copy
      </button>
      <button
        onClick={() => handleShare('facebook')}
        className="h-10 rounded-xl bg-[#1877F2]/10 border border-[#1877F2]/20 text-[#1877F2] hover:bg-[#1877F2]/20 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
      >
        Facebook
      </button>
      <button
        onClick={() => handleShare('twitter')}
        className="h-10 rounded-xl bg-[#1DA1F2]/10 border border-[#1DA1F2]/20 text-[#1DA1F2] hover:bg-[#1DA1F2]/20 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
      >
        Twitter
      </button>
    </div>
  );
}
