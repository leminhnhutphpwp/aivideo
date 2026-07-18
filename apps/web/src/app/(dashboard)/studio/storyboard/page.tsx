'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StoryboardListRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/projects?type=storyboard'); }, [router]);
  return (
    <div className="flex items-center justify-center py-32">
      <div className="h-6 w-6 rounded-full border-2 border-white/10 border-t-[#FF5A1F] animate-spin" />
    </div>
  );
}
