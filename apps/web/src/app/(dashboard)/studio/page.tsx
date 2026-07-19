'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Type, ImagePlus, Crosshair, Scissors, Smile, Clapperboard,
  ArrowRight, Sparkles, Zap, Music, Image as ImageIcon, Palette,
} from 'lucide-react';
import { motion } from 'motion/react';
import { t } from '@/lib/i18n';
import { useAuthStore } from '@/stores/auth-store';
import { Lock } from 'lucide-react';

interface StudioFeature {
  id: string;
  label: string;
  desc: string;
  icon: React.ElementType;
  href: string;
  gradient: string;
  glow: string;
  size: 'large' | 'normal' | 'wide';
  requiredPlan?: string;
  tag?: string;
}

const FEATURES: StudioFeature[] = [
  {
    id: 'text-to-video',
    label: 'Text-to-Video',
    desc: 'Biến ý tưởng thành video chỉ từ mô tả văn bản',
    icon: Type,
    href: '/studio/text-to-video',
    gradient: 'from-[#FF5A1F]/20 to-[#FF8A5B]/10',
    glow: 'shadow-[#FF5A1F]/20',
    size: 'large',
    tag: 'Phổ biến',
  },
  {
    id: 'image-to-video',
    label: 'Image-to-Video',
    desc: 'Chuyển ảnh tĩnh thành video chuyển động sống động',
    icon: ImagePlus,
    href: '/studio/image-to-video',
    gradient: 'from-[#FF5A1F]/20 to-[#FF8A5B]/10',
    glow: 'shadow-[#FF5A1F]/20',
    size: 'normal',
  },
  {
    id: 'reference-to-video',
    label: 'Reference-to-Video',
    desc: 'Tạo video dựa trên ảnh tham chiếu đa góc độ',
    icon: Crosshair,
    href: '/studio/reference-to-video',
    gradient: 'from-orange-500/20 to-orange-400/10',
    glow: 'shadow-orange-500/20',
    size: 'normal',
  },
  {
    id: 'audio',
    label: 'Audio & Voiceover',
    desc: 'Tạo âm thanh, nhạc nền và giọng đọc AI',
    icon: Music,
    href: '/studio/audio',
    gradient: 'from-#FF5A1F/20 to-#FF8A5B/10',
    glow: 'shadow-#FF5A1F/20',
    size: 'normal',
    requiredPlan: 'audio_generation',
  },
  {
    id: 'text-to-image',
    label: 'Text-to-Image',
    desc: 'Tạo hình ảnh chất lượng cao từ mô tả văn bản',
    icon: ImageIcon,
    href: '/studio/image',
    gradient: 'from-purple-500/20 to-pink-400/10',
    glow: 'shadow-purple-500/20',
    size: 'normal',
    tag: 'Mới',
  },
  {
    id: 'image-editing',
    label: 'Image Editing',
    desc: 'Chỉnh sửa ảnh bằng văn bản hoặc ảnh tham chiếu',
    icon: Palette,
    href: '/studio/image-editing',
    gradient: 'from-teal-500/20 to-cyan-400/10',
    glow: 'shadow-teal-500/20',
    size: 'normal',
  },
  {
    id: 'storyboard',
    label: 'Storyboard',
    desc: 'Lên kịch bản phân cảnh chuyên nghiệp',
    icon: Clapperboard,
    href: '/studio/storyboard',
    gradient: 'from-[#FF5A1F]/20 to-[#FF8A5B]/10',
    glow: 'shadow-[#FF5A1F]/20',
    size: 'normal',
  },
];

function FeatureCard({ feature }: { feature: StudioFeature }) {
  const Icon = feature.icon;
  const user = useAuthStore(s => s.user);
  const plan = (user as any)?.plan;
  const locked = feature.requiredPlan && !plan?.[feature.requiredPlan];

  const sizeClasses = {
    large: 'md:col-span-2 md:row-span-2 col-span-1',
    normal: 'md:col-span-1 col-span-1',
    wide: 'md:col-span-2 col-span-1',
  };

  return (
    <Link href={locked ? '/billing' : feature.href} className="block group">
      <motion.div
        whileHover={{ y: -4, scale: 1.01 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className={`relative h-full bg-[#16141a] border border-white/12 rounded-2xl p-4 md:p-6 flex flex-col gap-4 md:gap-5 hover:border-white/10 transition-all overflow-hidden ${sizeClasses[feature.size]} ${locked ? 'opacity-50' : ''}`}
      >
        {/* Background gradient */}
        <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

        {/* Glow effect */}
        <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full bg-gradient-to-br ${feature.gradient} blur-[80px] opacity-0 group-hover:opacity-60 transition-opacity duration-500`} />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-start justify-between">
            <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center shadow-sm ${feature.glow}`}>
              {locked ? <Lock className="h-5 w-5 text-white/60" /> : <Icon className="h-5 w-5 text-white" />}
            </div>
            {feature.tag && (
              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                feature.tag === 'Mới'
                  ? 'bg-[#FF5A1F]/15 text-[#FF8A5B] border border-[#FF5A1F]/20'
                  : 'bg-[#FF5A1F]/15 text-[#FF5A1F] border border-[#FF5A1F]/20'
              }`}>
                {feature.tag}
              </span>
            )}
          </div>

          <div className="mt-6 flex-1 space-y-2">
            <h2 className="text-lg font-bold text-white group-hover:text-[#FF5A1F] transition-colors">
              {feature.label}
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed">{feature.desc}</p>
          </div>

          <div className="mt-4 flex items-center gap-2 text-sm text-slate-400 group-hover:text-[#FF5A1F] transition-colors">
            <span className="font-medium">{locked ? 'Nâng cấp để mở khóa' : 'Bắt đầu tạo'}</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

export default function StudioHub() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flex flex-col gap-6 md:gap-6 pb-20 px-2 md:px-0">
      {/* Hero */}
      <div className="relative">
        <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-[#FF5A1F]/10 blur-[100px] pointer-events-none" />
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-orange-500/10 blur-[80px] pointer-events-none" />

        <div className="relative flex items-end justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#FF5A1F]" />
              <span className="text-xs font-bold text-[#FF5A1F] uppercase tracking-wider">AI-Powered</span>
            </div>
            <h1 className="text-4xl font-display font-bold tracking-tight text-white">{t('nav.studio')}</h1>
            <p className="text-base text-slate-500 max-w-xl">{t('studio.desc')}</p>
          </div>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {FEATURES.map((feature, i) => (
          <motion.div
            key={feature.id}
            initial={mounted ? { opacity: 0, y: 20 } : false}
            animate={mounted ? { opacity: 1, y: 0 } : false}
            transition={{ delay: i * 0.08, duration: 0.4 }}
          >
            <FeatureCard feature={feature} />
          </motion.div>
        ))}
      </div>

      {/* Quick Tip */}
      <div className="flex items-start md:items-center gap-3 px-4 md:px-5 py-4 rounded-2xl bg-[#16141a] border border-white/12">
        <Zap className="h-4 w-4 text-[#FF5A1F] shrink-0" />
        <p className="text-sm text-slate-500">
          <span className="text-white font-medium">Mẹo:</span> Dùng Text-to-Video để bắt đầu nhanh nhất, hoặc Image-to-Video để kiểm soát phong cách hình ảnh tốt hơn.
        </p>
      </div>
    </div>
  );
}
